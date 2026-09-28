import 'server-only';

import { and, eq, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  confirmacao as tabelaConfirmacao,
  convite as tabelaConvite,
  evento as tabelaEvento,
  type EstadoDeConvite,
} from '@/lib/db/schema';
import { ACOES, registrarAuditoria, type Ator } from '@/lib/palestras/auditoria';
import { MENSAGENS } from '@/lib/palestras/confirmacao';
import {
  esquemaDeConfirmacao,
  type ConfirmacaoValidada,
} from '@/lib/palestras/confirmacao-esquema';
import { textoPlano, type TextosDeConsentimento } from '@/lib/palestras/consentimento';
import { textosDeConsentimento } from '@/lib/palestras/configuracao';
import {
  estadoEfetivo,
  transicionarConvite,
} from '@/lib/palestras/estado-do-convite';
import { gerarIngressoToken } from '@/lib/palestras/ingresso';
import { errosPorCampo, type ErrosPorCampo } from '@/lib/palestras/validacao';
import { agora, venceu } from '@/lib/tempo';

/* =========================================================
   Serviço de confirmação do convidado

   Separado das Server Actions para poder ser exercitado contra um Postgres
   real — inclusive os dois cenários de concorrência, que não se testam
   simulando pedidos HTTP.

   A trava de estado do convite NÃO é reimplementada aqui: tudo passa por
   `transicionarConvite()`, que roda `SELECT … FOR UPDATE` na linha do
   convite dentro de uma transação (ver `lib/palestras/estado-do-convite.ts`
   e D4 do design de `fundacao`).
   ========================================================= */

/**
 * Rótulos de auditoria desta change.
 *
 * Reexportados de `lib/palestras/auditoria.ts`, que é onde a convenção do
 * projeto reúne os rótulos. O alias continua por clareza no ponto de uso.
 */
export const ACOES_DO_CONVIDADO = {
  presencaConfirmada: ACOES.presencaConfirmada,
  confirmacaoRecusada: ACOES.confirmacaoRecusada,
  canceladaPeloConvidado: ACOES.canceladaPeloConvidado,
  ingressoRecuperado: ACOES.ingressoRecuperado,
} as const;

/** O convidado não tem conta; a trilha registra o papel, não a pessoa. */
export const CONVIDADO: Ator = { id: null, nome: 'convidado' };

/* ---------------------------------------------------------
   Leitura do convite
   --------------------------------------------------------- */

export type PalestraPublica = {
  id: string;
  cidade: string;
  dataHora: Date;
  localNome: string;
  localEndereco: string;
  prazoConfirmacao: Date;
};

export type ConviteResolvido = {
  conviteId: string;
  codigo: string;
  /** Já com a expiração avaliada na leitura (D3 do design de `fundacao`). */
  estado: EstadoDeConvite;
  palestra: PalestraPublica;
};

/**
 * Convite pelo código curto, com o estado efetivo.
 *
 * Devolve `null` para código inexistente. Quem chama **precisa** tratar
 * esse caso com a mesma tela e o mesmo tempo de resposta de um convite
 * cancelado (D10 do design): distinguir os dois permitiria descobrir
 * códigos válidos por tentativa e erro.
 */
export async function resolverConvite(
  codigo: string,
): Promise<ConviteResolvido | null> {
  const [linha] = await db()
    .select({
      conviteId: tabelaConvite.id,
      codigo: tabelaConvite.codigo,
      estadoGravado: tabelaConvite.estado,
      palestraId: tabelaEvento.id,
      cidade: tabelaEvento.cidade,
      dataHora: tabelaEvento.dataHora,
      localNome: tabelaEvento.localNome,
      localEndereco: tabelaEvento.localEndereco,
      prazoConfirmacao: tabelaEvento.prazoConfirmacao,
    })
    .from(tabelaConvite)
    .innerJoin(tabelaEvento, eq(tabelaEvento.id, tabelaConvite.eventoId))
    .where(eq(tabelaConvite.codigo, codigo))
    .limit(1);

  if (!linha) return null;

  return {
    conviteId: linha.conviteId,
    codigo: linha.codigo,
    estado: estadoEfetivo(
      linha.estadoGravado as EstadoDeConvite,
      new Date(linha.prazoConfirmacao),
    ),
    palestra: {
      id: linha.palestraId,
      cidade: linha.cidade,
      dataHora: new Date(linha.dataHora),
      localNome: linha.localNome,
      localEndereco: linha.localEndereco,
      prazoConfirmacao: new Date(linha.prazoConfirmacao),
    },
  };
}

export type ConfirmacaoDoConvite = {
  id: string;
  cpf: string;
  nome: string;
  acompanhanteNome: string | null;
  ativa: boolean;
  ingressoToken: string;
  confirmadoEm: Date;
};

/** A confirmação daquele convite, ativa ou não. Uma por convite. */
export async function confirmacaoDoConvite(
  conviteId: string,
): Promise<ConfirmacaoDoConvite | null> {
  const [linha] = await db()
    .select({
      id: tabelaConfirmacao.id,
      cpf: tabelaConfirmacao.cpf,
      nome: tabelaConfirmacao.nome,
      acompanhanteNome: tabelaConfirmacao.acompanhanteNome,
      ativa: tabelaConfirmacao.ativa,
      ingressoToken: tabelaConfirmacao.ingressoToken,
      confirmadoEm: tabelaConfirmacao.confirmadoEm,
    })
    .from(tabelaConfirmacao)
    .where(eq(tabelaConfirmacao.conviteId, conviteId))
    .limit(1);

  return linha ? { ...linha, confirmadoEm: new Date(linha.confirmadoEm) } : null;
}

/* ---------------------------------------------------------
   Confirmação
   --------------------------------------------------------- */

export type MotivoDeRecusa =
  | 'dados-invalidos'
  | 'cpf-ja-confirmado'
  | 'ja-utilizado'
  | 'prazo-vencido'
  | 'cancelado'
  | 'nao-encontrado'
  | 'falha';

export type ResultadoDaConfirmacao =
  | {
      ok: true;
      confirmacaoId: string;
      ingressoToken: string;
      /** Verdadeiro quando o envio era repetição de uma confirmação já feita. */
      repetida: boolean;
    }
  | {
      ok: false;
      motivo: MotivoDeRecusa;
      mensagem: string;
      erros?: ErrosPorCampo;
    };

export type PedidoDeConfirmacao = {
  codigo: string;
  entrada: Record<string, unknown>;
  ip: string | null;
  userAgent: string | null;
  /** Injetáveis no teste; em produção vêm da configuração. */
  textos?: TextosDeConsentimento;
};

/**
 * Código do erro de violação de restrição única no Postgres.
 *
 * Tratado como **caminho esperado**, não como falha (D1 do design): é o
 * banco impondo "um CPF, uma confirmação ativa no circuito" quando dois
 * envios do mesmo CPF chegam ao mesmo tempo em convites diferentes. A
 * aplicação checa antes só para dar uma mensagem boa; a autoridade é o
 * índice.
 */
const VIOLACAO_DE_UNICIDADE = '23505';

function nomeDaRestricao(erro: unknown): string | null {
  if (typeof erro !== 'object' || erro === null) return null;
  const e = erro as { code?: string; constraint?: string };
  if (e.code !== VIOLACAO_DE_UNICIDADE) return null;
  return e.constraint ?? '';
}

export async function confirmarPresenca(
  pedido: PedidoDeConfirmacao,
): Promise<ResultadoDaConfirmacao> {
  const { codigo, entrada, ip, userAgent } = pedido;

  /* --- 1. os dados, com as mesmas regras do formulário --- */
  const analise = esquemaDeConfirmacao.safeParse(entrada);
  if (!analise.success) {
    return {
      ok: false,
      motivo: 'dados-invalidos',
      mensagem: 'Confira os campos destacados.',
      erros: errosPorCampo(analise.error),
    };
  }
  const dados: ConfirmacaoValidada = analise.data;

  /* --- 2. o convite --- */
  const convite = await resolverConvite(codigo);
  if (!convite) {
    return {
      ok: false,
      motivo: 'nao-encontrado',
      mensagem: MENSAGENS.conviteCancelado,
    };
  }

  if (convite.estado === 'cancelado') {
    return {
      ok: false,
      motivo: 'cancelado',
      mensagem: MENSAGENS.conviteCancelado,
    };
  }
  if (convite.estado === 'expirado') {
    return {
      ok: false,
      motivo: 'prazo-vencido',
      mensagem: MENSAGENS.prazoVencido,
    };
  }

  /* --- 3. envio repetido do mesmo CPF no mesmo convite --- */
  const jaExiste = await confirmacaoDoConvite(convite.conviteId);
  if (jaExiste?.ativa) {
    if (jaExiste.cpf === dados.cpf) {
      return {
        ok: true,
        confirmacaoId: jaExiste.id,
        ingressoToken: jaExiste.ingressoToken,
        repetida: true,
      };
    }
    return {
      ok: false,
      motivo: 'ja-utilizado',
      mensagem: MENSAGENS.conviteJaUtilizado,
    };
  }

  /* --- 4. o CPF já ocupa uma vaga no circuito? --- */
  if (await cpfTemConfirmacaoAtiva(dados.cpf)) {
    return {
      ok: false,
      motivo: 'cpf-ja-confirmado',
      mensagem: MENSAGENS.cpfJaConfirmado,
    };
  }

  /* --- 5. a transação --- */
  const textos = pedido.textos ?? (await textosDeConsentimento());
  const token = gerarIngressoToken();
  const aceiteEm = agora();

  let resultado: Awaited<ReturnType<typeof transicionarConvite<string>>>;
  try {
    resultado = await transicionarConvite<string>({
      alvo: { codigo },
      para: 'confirmado',
      exigirEstadoAtual: ['disponivel'],
      exigirDentroDoPrazo: true,
      aoAplicar: async (tx) => {
        const [linha] = await tx
          .insert(tabelaConfirmacao)
          .values({
            conviteId: convite.conviteId,
            cpf: dados.cpf,
            nome: dados.nome,
            whatsapp: dados.whatsapp,
            cidade: dados.cidade,
            propriedade: dados.propriedade,
            atividade: dados.atividade,
            acompanhanteNome: dados.acompanhanteNome,
            ativa: true,
            aceitePoliticaEm: aceiteEm,
            aceitePoliticaVersao: textos.versaoDaPolitica,
            aceitePoliticaTexto: textoPlano(textos.aceite, textos),
            aceiteComunicacoes: dados.aceiteComunicacoes,
            ip,
            userAgent,
            ingressoToken: token,
          })
          .returning({ id: tabelaConfirmacao.id });
        return linha!.id;
      },
      auditoria: {
        acao: ACOES_DO_CONVIDADO.presencaConfirmada,
        ator: CONVIDADO,
        // `limparPayload` mascara o CPF e remove qualquer chave de token.
        dados: {
          codigo,
          palestra: convite.palestra.cidade,
          cpf: dados.cpf,
          comAcompanhante: dados.acompanhanteNome !== null,
          aceiteComunicacoes: dados.aceiteComunicacoes,
          politicaVersao: textos.versaoDaPolitica,
        },
      },
    });
  } catch (erro) {
    const restricao = nomeDaRestricao(erro);
    if (restricao === null) throw erro;

    // Caminho esperado: outro envio do mesmo CPF ganhou a corrida.
    if (restricao.includes('cpf_ativa')) {
      return {
        ok: false,
        motivo: 'cpf-ja-confirmado',
        mensagem: MENSAGENS.cpfJaConfirmado,
      };
    }
    // Duas confirmações no mesmo convite: a trava de linha deveria ter
    // evitado, mas o índice é a última palavra.
    return {
      ok: false,
      motivo: 'ja-utilizado',
      mensagem: MENSAGENS.conviteJaUtilizado,
    };
  }

  if (resultado.ok) {
    return {
      ok: true,
      confirmacaoId: resultado.resultado,
      ingressoToken: token,
      repetida: false,
    };
  }

  /* --- 6. recusa: qual mensagem? --- */
  if (resultado.motivo === 'prazo-vencido') {
    return {
      ok: false,
      motivo: 'prazo-vencido',
      mensagem: MENSAGENS.prazoVencido,
    };
  }
  if (resultado.motivo === 'nao-encontrado') {
    return {
      ok: false,
      motivo: 'nao-encontrado',
      mensagem: MENSAGENS.conviteCancelado,
    };
  }

  // `estado-inesperado` ou `transicao-invalida`: alguém mudou o convite
  // entre a leitura e a trava. Relê para escolher a mensagem certa — e,
  // se foi o duplo toque do próprio titular, devolver o ingresso dele.
  return await recusaPorEstadoAtual(convite.conviteId, dados.cpf);
}

async function recusaPorEstadoAtual(
  conviteId: string,
  cpf: string,
): Promise<ResultadoDaConfirmacao> {
  const atual = await confirmacaoDoConvite(conviteId);
  if (atual?.ativa && atual.cpf === cpf) {
    return {
      ok: true,
      confirmacaoId: atual.id,
      ingressoToken: atual.ingressoToken,
      repetida: true,
    };
  }

  const [linha] = await db()
    .select({ estado: tabelaConvite.estado })
    .from(tabelaConvite)
    .where(eq(tabelaConvite.id, conviteId))
    .limit(1);

  if (linha?.estado === 'cancelado') {
    return {
      ok: false,
      motivo: 'cancelado',
      mensagem: MENSAGENS.conviteCancelado,
    };
  }
  if (linha?.estado === 'expirado') {
    return {
      ok: false,
      motivo: 'prazo-vencido',
      mensagem: MENSAGENS.prazoVencido,
    };
  }
  return {
    ok: false,
    motivo: 'ja-utilizado',
    mensagem: MENSAGENS.conviteJaUtilizado,
  };
}

/** Existe confirmação ativa para este CPF em qualquer palestra do circuito? */
export async function cpfTemConfirmacaoAtiva(cpf: string): Promise<boolean> {
  const [linha] = await db()
    .select({ id: tabelaConfirmacao.id })
    .from(tabelaConfirmacao)
    .where(
      and(eq(tabelaConfirmacao.cpf, cpf), eq(tabelaConfirmacao.ativa, true)),
    )
    .limit(1);
  return Boolean(linha);
}

/* ---------------------------------------------------------
   Cancelamento — uma transação, dois autores possíveis (D1 do design de
   `painel-colaborador`)

   `executarTransacaoDeCancelamento` é o único lugar que chama
   `transicionarConvite({ para: 'cancelado' })`. `cancelarPeloConvidado`
   (`confirmacao-convidado`) e `cancelarPeloPainel` (`painel-colaborador`)
   são fachadas por cima dela: cada uma faz as pré-checagens e monta as
   mensagens do jeito que a spec de origem pede, mas a escrita — estado,
   liberação do CPF e registro de auditoria — é uma só. Nenhuma das duas
   reimplementa a trava de linha nem a transação.
   --------------------------------------------------------- */

type ExecucaoDeCancelamento = {
  codigo: string;
  /** Estados de onde o cancelamento desta origem pode partir. */
  estadosPermitidos: readonly EstadoDeConvite[];
  /** `null` para o convidado, que não tem conta. */
  canceladoPor: string | null;
  motivoCancelamento: string | null;
  auditoriaAcao: string;
  auditoriaAtor: Ator;
  auditoriaDadosExtra?: Record<string, unknown>;
};

async function executarTransacaoDeCancelamento(p: ExecucaoDeCancelamento) {
  return transicionarConvite({
    alvo: { codigo: p.codigo },
    para: 'cancelado',
    exigirEstadoAtual: p.estadosPermitidos,
    exigirDentroDoPrazo: true,
    campos: {
      canceladoEm: agora(),
      canceladoPor: p.canceladoPor,
      motivoCancelamento: p.motivoCancelamento,
    },
    aoAplicar: async (tx, conviteAtualizado) => {
      // Convite `disponivel` cancelado pelo painel não tem confirmação
      // nenhuma: o `update` afeta zero linhas, e está certo que afete.
      await tx
        .update(tabelaConfirmacao)
        .set({ ativa: false })
        .where(eq(tabelaConfirmacao.conviteId, conviteAtualizado.id));
    },
    auditoria: {
      acao: p.auditoriaAcao,
      ator: p.auditoriaAtor,
      dados: { codigo: p.codigo, ...p.auditoriaDadosExtra },
    },
  });
}

export type ResultadoDoCancelamento =
  | { ok: true; jaEstavaCancelado: boolean }
  | {
      ok: false;
      motivo: 'prazo-vencido' | 'nao-encontrado' | 'nao-permitido';
      mensagem: string;
    };

/**
 * Cancela a confirmação do titular. Definitivo (spec `cancelamento-convidado`).
 *
 * Na mesma transação: o convite vai a `cancelado` e a confirmação perde
 * `ativa`, o que libera o CPF para confirmar em outro convite — é o índice
 * único **parcial** que faz essa liberação, sem apagar histórico nenhum.
 *
 * Comportamento e assinatura **inalterados** por `painel-colaborador`: só a
 * escrita por baixo (`executarTransacaoDeCancelamento`) passou a ser
 * compartilhada com `cancelarPeloPainel`.
 */
export async function cancelarPeloConvidado(pedido: {
  codigo: string;
  motivo?: string | null;
}): Promise<ResultadoDoCancelamento> {
  const { codigo } = pedido;

  const convite = await resolverConvite(codigo);
  if (!convite) {
    return {
      ok: false,
      motivo: 'nao-encontrado',
      mensagem: MENSAGENS.conviteCancelado,
    };
  }

  // Cancelamento repetido é inofensivo: responde sem erro e nada muda.
  if (convite.estado === 'cancelado') {
    return { ok: true, jaEstavaCancelado: true };
  }

  if (convite.estado === 'presente') {
    return {
      ok: false,
      motivo: 'nao-permitido',
      mensagem: 'Este convite já foi utilizado na entrada do evento.',
    };
  }

  // O prazo é conferido aqui e de novo dentro da transação
  // (`exigirDentroDoPrazo`), que é onde a decisão vale.
  if (venceu(convite.palestra.prazoConfirmacao)) {
    return {
      ok: false,
      motivo: 'prazo-vencido',
      mensagem: MENSAGENS.cancelamentoForaDoPrazo,
    };
  }

  const resultado = await executarTransacaoDeCancelamento({
    codigo,
    estadosPermitidos: ['confirmado'],
    // Sem conta, sem `cancelado_por`: a autoria fica na auditoria e no
    // motivo, que é texto livre.
    canceladoPor: null,
    motivoCancelamento: pedido.motivo?.trim()
      ? pedido.motivo.trim().slice(0, 300)
      : 'Cancelado pelo próprio convidado.',
    auditoriaAcao: ACOES_DO_CONVIDADO.canceladaPeloConvidado,
    auditoriaAtor: CONVIDADO,
    auditoriaDadosExtra: { palestra: convite.palestra.cidade },
  });

  if (resultado.ok) return { ok: true, jaEstavaCancelado: false };

  if (resultado.motivo === 'prazo-vencido') {
    return {
      ok: false,
      motivo: 'prazo-vencido',
      mensagem: MENSAGENS.cancelamentoForaDoPrazo,
    };
  }

  // Corrida com outro cancelamento: se o convite já está cancelado, o
  // pedido alcançou o que queria.
  const atual = await resolverConvite(codigo);
  if (atual?.estado === 'cancelado') {
    return { ok: true, jaEstavaCancelado: true };
  }

  return {
    ok: false,
    motivo: 'nao-permitido',
    mensagem: 'Não foi possível cancelar este convite.',
  };
}

/* ---------------------------------------------------------
   Cancelamento operacional — colaborador e Admin (`painel-colaborador`)
   --------------------------------------------------------- */

/** Quem está cancelando, pelo painel. O convidado usa `cancelarPeloConvidado`. */
export type AutorDoCancelamentoOperacional = {
  tipo: 'colaborador' | 'admin';
  usuarioId: string;
  nome: string;
};

export type MotivoDeRecusaOperacional =
  | 'nao-encontrado'
  | 'estado-invalido'
  | 'prazo-vencido';

export type ResultadoDoCancelamentoOperacional =
  | {
      ok: true;
      /** Estado do convite antes do cancelamento — para a mensagem de sucesso. */
      estadoAnterior: EstadoDeConvite;
    }
  | {
      ok: false;
      motivo: MotivoDeRecusaOperacional;
      mensagem: string;
      estadoAtual?: EstadoDeConvite;
    };

const ROTULO_DO_ESTADO: Record<EstadoDeConvite, string> = {
  disponivel: 'disponível',
  confirmado: 'confirmado',
  presente: 'com presença já registrada',
  expirado: 'expirado',
  cancelado: 'cancelado',
};

/**
 * Cancela pelo colaborador (só os próprios) ou pelo Admin (qualquer um),
 * nos estados `disponivel` ou `confirmado`, até o prazo (spec
 * `cancelamento-operacional`).
 *
 * Diferente de `cancelarPeloConvidado`: aqui um convite já `cancelado`,
 * `expirado` ou `presente` é **recusado**, não tratado como idempotente — a
 * spec pede que o colaborador ou o Admin sejam avisados do estado atual, e
 * não recebam um "ok" silencioso para algo que já mudou. O escopo (quem
 * pode chegar a este convite) é responsabilidade de quem chama, não desta
 * função — ver D2 do design e `lib/palestras/dados.ts`.
 */
export async function cancelarPeloPainel(pedido: {
  codigo: string;
  autor: AutorDoCancelamentoOperacional;
  motivo?: string | null;
}): Promise<ResultadoDoCancelamentoOperacional> {
  const { codigo, autor } = pedido;

  const convite = await resolverConvite(codigo);
  if (!convite) {
    return {
      ok: false,
      motivo: 'nao-encontrado',
      mensagem: 'Convite não encontrado.',
    };
  }

  if (convite.estado !== 'disponivel' && convite.estado !== 'confirmado') {
    return {
      ok: false,
      motivo: 'estado-invalido',
      mensagem: `Este convite está ${ROTULO_DO_ESTADO[convite.estado]} e não pode mais ser cancelado.`,
      estadoAtual: convite.estado,
    };
  }

  if (venceu(convite.palestra.prazoConfirmacao)) {
    return {
      ok: false,
      motivo: 'prazo-vencido',
      mensagem: MENSAGENS.cancelamentoForaDoPrazo,
    };
  }

  const estadoAnterior = convite.estado;
  const ator: Ator = { id: autor.usuarioId, nome: autor.nome };
  const acao =
    autor.tipo === 'admin'
      ? ACOES.canceladaPeloAdmin
      : ACOES.canceladaPeloColaborador;

  const resultado = await executarTransacaoDeCancelamento({
    codigo,
    estadosPermitidos: ['disponivel', 'confirmado'],
    canceladoPor: autor.usuarioId,
    motivoCancelamento: pedido.motivo?.trim()
      ? pedido.motivo.trim().slice(0, 300)
      : null,
    auditoriaAcao: acao,
    auditoriaAtor: ator,
    auditoriaDadosExtra: {
      palestra: convite.palestra.cidade,
      estadoAnterior,
      autorTipo: autor.tipo,
    },
  });

  if (resultado.ok) return { ok: true, estadoAnterior };

  if (resultado.motivo === 'prazo-vencido') {
    return {
      ok: false,
      motivo: 'prazo-vencido',
      mensagem: MENSAGENS.cancelamentoForaDoPrazo,
    };
  }
  if (resultado.motivo === 'nao-encontrado') {
    return {
      ok: false,
      motivo: 'nao-encontrado',
      mensagem: 'Convite não encontrado.',
    };
  }

  // Corrida com outro cancelamento/transição: relê para informar o estado
  // atual de verdade, em vez de um "não permitido" genérico.
  const atual = await resolverConvite(codigo);
  const estadoAtual = atual?.estado ?? 'cancelado';
  return {
    ok: false,
    motivo: 'estado-invalido',
    mensagem: `Este convite está ${ROTULO_DO_ESTADO[estadoAtual]} e não pode mais ser cancelado.`,
    estadoAtual,
  };
}

/* ---------------------------------------------------------
   Recuperação do ingresso (D4 do design)
   --------------------------------------------------------- */

export type ResultadoDaRecuperacao =
  | { ok: true; codigo: string; confirmacaoId: string; ingressoToken: string }
  | { ok: false; motivo: 'nao-encontrado' | 'cancelado'; mensagem: string };

/**
 * Recupera o ingresso por **CPF e código** — dois fatores.
 *
 * Só CPF permitiria enumerar confirmações a partir de um CPF conhecido, e
 * CPF não é segredo. Exigir o código faz da recuperação uma prova de que a
 * pessoa recebeu aquele convite.
 *
 * Qualquer falha responde a mesma coisa: código inexistente, convite nunca
 * confirmado e CPF que não confere são indistinguíveis.
 */
export async function recuperarIngresso(pedido: {
  codigo: string;
  cpf: string;
}): Promise<ResultadoDaRecuperacao> {
  const neutra: ResultadoDaRecuperacao = {
    ok: false,
    motivo: 'nao-encontrado',
    mensagem: MENSAGENS.recuperacaoSemResultado,
  };

  const [linha] = await db()
    .select({
      codigo: tabelaConvite.codigo,
      confirmacaoId: tabelaConfirmacao.id,
      cpf: tabelaConfirmacao.cpf,
      ativa: tabelaConfirmacao.ativa,
      ingressoToken: tabelaConfirmacao.ingressoToken,
    })
    .from(tabelaConvite)
    .innerJoin(
      tabelaConfirmacao,
      eq(tabelaConfirmacao.conviteId, tabelaConvite.id),
    )
    .where(
      and(
        eq(tabelaConvite.codigo, pedido.codigo),
        eq(tabelaConfirmacao.cpf, pedido.cpf),
      ),
    )
    .limit(1);

  if (!linha) return neutra;

  // Aqui os dois fatores já bateram: dizer que o convite foi cancelado não
  // revela nada a quem não é o titular, e evita que ele fique tentando.
  if (!linha.ativa) {
    return {
      ok: false,
      motivo: 'cancelado',
      mensagem: MENSAGENS.conviteCancelado,
    };
  }

  await registrarAuditoria({
    ator: CONVIDADO,
    acao: ACOES_DO_CONVIDADO.ingressoRecuperado,
    entidade: 'palestra_confirmacao',
    entidadeId: linha.confirmacaoId,
    dados: { codigo: linha.codigo, cpf: linha.cpf },
  });

  return {
    ok: true,
    codigo: linha.codigo,
    confirmacaoId: linha.confirmacaoId,
    ingressoToken: linha.ingressoToken,
  };
}

/* ---------------------------------------------------------
   Ingresso montado
   --------------------------------------------------------- */

export type Ingresso = {
  codigo: string;
  estado: EstadoDeConvite;
  confirmacaoId: string;
  nomeDoTitular: string;
  nomeDoAcompanhante: string | null;
  ingressoToken: string;
  confirmadoEm: Date;
  palestra: PalestraPublica;
  /** O cancelamento pelo convidado só é oferecido dentro do prazo. */
  podeCancelar: boolean;
};

/** Tudo que a tela do ingresso precisa, numa consulta só. */
export async function montarIngresso(
  convite: ConviteResolvido,
): Promise<Ingresso | null> {
  const confirmacao = await confirmacaoDoConvite(convite.conviteId);
  if (!confirmacao || !confirmacao.ativa) return null;

  return {
    codigo: convite.codigo,
    estado: convite.estado,
    confirmacaoId: confirmacao.id,
    nomeDoTitular: confirmacao.nome,
    nomeDoAcompanhante: confirmacao.acompanhanteNome,
    ingressoToken: confirmacao.ingressoToken,
    confirmadoEm: confirmacao.confirmadoEm,
    palestra: convite.palestra,
    podeCancelar:
      convite.estado === 'confirmado' &&
      !venceu(convite.palestra.prazoConfirmacao),
  };
}

/**
 * Contagem de confirmações ativas de um convite — usada pelos testes de
 * concorrência, que precisam provar "exatamente uma".
 */
export async function totalDeConfirmacoesAtivas(
  conviteId: string,
): Promise<number> {
  const linhas = await db().execute<{ total: number }>(sql`
    select count(*)::int as total
      from ${tabelaConfirmacao}
     where convite_id = ${conviteId}
       and ativa
  `);
  return Number(linhas.rows[0]?.total ?? 0);
}
