import 'server-only';

import { and, asc, count, eq, ilike, inArray, isNotNull, sql, type SQL } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  auditoria,
  checkin,
  confirmacao,
  convite,
  evento,
  loja,
  regional,
  user,
  type EstadoDeConvite,
} from '@/lib/db/schema';
import { ACOES, registrarAuditoria, type Ator } from '@/lib/palestras/auditoria';
import { estadoEfetivo } from '@/lib/palestras/estado-do-convite';
import {
  SemAcesso,
  permitido,
  veCpfCompleto,
  type Escopo,
} from '@/lib/palestras/escopo';
import { alcanceDe, type AcaoProtegida } from '@/lib/palestras/papeis';
import { agora } from '@/lib/tempo';

/* =========================================================
   Acesso a dados de domínio · o escopo é obrigatório

   D4 do design: "nenhuma consulta de domínio roda sem receber o escopo do
   usuário, imposto pela assinatura das funções de acesso a dados". Este
   módulo é onde a frase vira código — o `escopo` é o **primeiro parâmetro**
   de toda função daqui, e não tem valor padrão. Esquecer não compila.

   O middleware barra por papel. Ele não sabe, nem tem como saber, se o
   convite `K7Q2MX` pertence ao colaborador que o pediu. Quem sabe é o
   `where` montado aqui.

   ── Mascaramento de CPF na camada de dados (D6)

   A máscara é aplicada **no SQL**, não na tela. O `select` de quem não é
   Admin não traz a coluna `cpf`: traz uma expressão que já devolve
   `***.456.789-**`. Assim o valor completo não sai nem do Postgres, e
   nenhuma tela nova pode vazá-lo por esquecer de mascarar — não há o que
   esquecer, o dado não chega.
   ========================================================= */

/* ---------------------------------------------------------
   Filtros de escopo
   --------------------------------------------------------- */

/**
 * Condição que restringe uma consulta ao que o escopo alcança.
 *
 * `null` quer dizer "sem restrição" (Admin). O caso "não alcança nada"
 * não devolve `undefined` nem lança: devolve `sql\`false\``, que é uma
 * consulta válida com zero linhas. A diferença importa — um `where`
 * indefinido em Drizzle significa **sem filtro**, ou seja, tudo.
 */
type Colunas = {
  colaboradorId: SQL | ReturnType<typeof sql.raw> | typeof convite.colaboradorId;
  lojaId: typeof user.lojaId;
  regionalId: typeof loja.regionalId;
};

const NADA = sql`false`;

export function restricao(escopo: Escopo, colunas: Colunas): SQL | undefined {
  switch (escopo.papel) {
    case 'admin':
      return undefined;
    case 'gerente_regional':
      return escopo.regionalId
        ? eq(colunas.regionalId, escopo.regionalId)
        : NADA;
    case 'gerente_loja':
      return escopo.lojaId ? eq(colunas.lojaId, escopo.lojaId) : NADA;
    case 'colaborador':
      return eq(colunas.colaboradorId as never, escopo.usuarioId);
    case 'recepcao':
      // A recepção não tem escopo de origem: ela enxerga os confirmados da
      // palestra que está atendendo, e só os três campos que o PRD
      // autoriza. Quem trata disso é `confirmadosParaRecepcao`.
      return NADA;
    default:
      return NADA;
  }
}

/**
 * Garante que o papel tem a ação antes de qualquer consulta.
 *
 * Não substitui a verificação da camada de rota — reforça-a. Uma função de
 * dados chamada de um caminho novo, que alguém esqueceu de proteger,
 * continua recusando.
 */
function conferirPapel(escopo: Escopo, acao: AcaoProtegida): void {
  if (alcanceDe(escopo.papel, acao) === 'nenhum') {
    throw new SemAcesso(acao, 'papel');
  }
}

/* ---------------------------------------------------------
   Convites
   --------------------------------------------------------- */

export type ConviteNoEscopo = {
  id: string;
  codigo: string;
  estado: EstadoDeConvite;
  eventoId: string;
  eventoCidade: string;
  /** Necessários para montar a mesma mensagem de WhatsApp do PDF (D1). */
  eventoDataHora: Date;
  eventoLocalNome: string;
  eventoPrazo: Date;
  eventoMensagemTemplate: string;
  colaboradorId: string;
  colaboradorNome: string;
  lojaId: string | null;
  lojaNome: string | null;
  /** Da loja do colaborador. Usado para o filtro de regional da lista (3.2). */
  regionalId: string | null;
  /** Lembrete pessoal do colaborador (D4) — texto livre, sem efeito de sistema. */
  enviadoPara: string | null;
  criadoEm: Date;
  /** Só preenchido quando o estado efetivo é `presente`. */
  checkinEm: Date | null;
};

/** As colunas comuns a `convitesNoEscopo` e `conviteNoEscopo` — um só ponto de manutenção. */
function colunasDoConvite() {
  return {
    id: convite.id,
    codigo: convite.codigo,
    estadoGravado: convite.estado,
    eventoId: convite.eventoId,
    eventoCidade: evento.cidade,
    eventoDataHora: evento.dataHora,
    eventoLocalNome: evento.localNome,
    prazo: evento.prazoConfirmacao,
    eventoMensagemTemplate: evento.mensagemWhatsapp,
    colaboradorId: convite.colaboradorId,
    colaboradorNome: user.name,
    lojaId: user.lojaId,
    lojaNome: loja.nome,
    regionalId: loja.regionalId,
    enviadoPara: convite.enviadoPara,
    criadoEm: convite.criadoEm,
    checkinEm: checkin.feitoEm,
  };
}

function linhaParaConviteNoEscopo(
  l: ReturnType<typeof colunasDoConvite> extends infer T
    ? { [K in keyof T]: unknown }
    : never,
  referencia: Date,
): ConviteNoEscopo {
  const linha = l as unknown as {
    id: string;
    codigo: string;
    estadoGravado: string;
    eventoId: string;
    eventoCidade: string;
    eventoDataHora: string | Date;
    eventoLocalNome: string;
    prazo: string | Date;
    eventoMensagemTemplate: string;
    colaboradorId: string;
    colaboradorNome: string;
    lojaId: string | null;
    lojaNome: string | null;
    regionalId: string | null;
    enviadoPara: string | null;
    criadoEm: Date;
    checkinEm: Date | null;
  };
  const prazo = new Date(linha.prazo);
  const estado = estadoEfetivo(
    linha.estadoGravado as EstadoDeConvite,
    prazo,
    referencia,
  );
  return {
    id: linha.id,
    codigo: linha.codigo,
    eventoId: linha.eventoId,
    eventoCidade: linha.eventoCidade,
    eventoDataHora: new Date(linha.eventoDataHora),
    eventoLocalNome: linha.eventoLocalNome,
    eventoPrazo: prazo,
    eventoMensagemTemplate: linha.eventoMensagemTemplate,
    colaboradorId: linha.colaboradorId,
    colaboradorNome: linha.colaboradorNome,
    lojaId: linha.lojaId,
    lojaNome: linha.lojaNome,
    regionalId: linha.regionalId,
    enviadoPara: linha.enviadoPara,
    criadoEm: linha.criadoEm,
    // Só faz sentido mostrar o check-in quando o estado efetivo é
    // `presente`: um convite `confirmado` não tem check-in nenhum ainda.
    checkinEm: estado === 'presente' ? linha.checkinEm : null,
    estado,
  };
}

/** Convites que o escopo alcança, com o estado efetivo já resolvido. */
export async function convitesNoEscopo(
  escopo: Escopo,
  filtro: {
    eventoId?: string;
    estado?: EstadoDeConvite;
    /**
     * Filtros adicionais da lista de convites (3.2): estreitam o que o
     * escopo já alcança, nunca o ampliam. Um gerente regional que informe
     * a `lojaId` de outra regional simplesmente não ganha linha nenhuma,
     * porque a restrição de escopo (acima) já corta antes deste filtro entrar.
     */
    regionalId?: string;
    lojaId?: string;
    colaboradorId?: string;
  } = {},
): Promise<ConviteNoEscopo[]> {
  conferirPapel(escopo, 'verConvitesEConfirmacoes');

  const condicoes: (SQL | undefined)[] = [
    restricao(escopo, {
      colaboradorId: convite.colaboradorId,
      lojaId: user.lojaId,
      regionalId: loja.regionalId,
    }),
  ];
  if (filtro.eventoId) condicoes.push(eq(convite.eventoId, filtro.eventoId));
  if (filtro.regionalId) condicoes.push(eq(loja.regionalId, filtro.regionalId));
  if (filtro.lojaId) condicoes.push(eq(user.lojaId, filtro.lojaId));
  if (filtro.colaboradorId) condicoes.push(eq(convite.colaboradorId, filtro.colaboradorId));

  const linhas = await db()
    .select(colunasDoConvite())
    .from(convite)
    .innerJoin(evento, eq(evento.id, convite.eventoId))
    .innerJoin(user, eq(user.id, convite.colaboradorId))
    .leftJoin(loja, eq(loja.id, user.lojaId))
    .leftJoin(checkin, eq(checkin.conviteId, convite.id))
    .where(and(...condicoes.filter(Boolean)))
    .orderBy(asc(evento.dataHora), asc(convite.codigo))
    .limit(2000);

  const referencia = agora();
  return linhas
    .map((l) => linhaParaConviteNoEscopo(l, referencia))
    .filter((l) => !filtro.estado || l.estado === filtro.estado);
}

/**
 * Um convite, **se** o escopo o alcança.
 *
 * Devolve `null` tanto para "não existe" quanto para "existe e é de
 * outro": quem chama responde 403 nos dois casos, e a resposta não
 * distingue um convite alheio de um código inventado.
 */
export async function conviteNoEscopo(
  escopo: Escopo,
  identificador: { id?: string; codigo?: string },
): Promise<ConviteNoEscopo | null> {
  conferirPapel(escopo, 'verConvitesEConfirmacoes');
  if (!identificador.id && !identificador.codigo) return null;

  const condicoes: (SQL | undefined)[] = [
    restricao(escopo, {
      colaboradorId: convite.colaboradorId,
      lojaId: user.lojaId,
      regionalId: loja.regionalId,
    }),
    identificador.id
      ? eq(convite.id, identificador.id)
      : eq(convite.codigo, identificador.codigo as string),
  ];

  const [linha] = await db()
    .select(colunasDoConvite())
    .from(convite)
    .innerJoin(evento, eq(evento.id, convite.eventoId))
    .innerJoin(user, eq(user.id, convite.colaboradorId))
    .leftJoin(loja, eq(loja.id, user.lojaId))
    .leftJoin(checkin, eq(checkin.conviteId, convite.id))
    .where(and(...condicoes.filter(Boolean)))
    .limit(1);

  if (!linha) return null;
  return linhaParaConviteNoEscopo(linha, agora());
}

/** Um evento da linha do tempo de um convite (3.4 das tasks). */
export type EventoDoConvite = {
  acao: string;
  criadoEm: Date;
  atorNome: string | null;
  dados: unknown;
};

/**
 * A trilha de auditoria de UM convite, na ordem em que aconteceu.
 *
 * A confirmação de escopo é a mesma de `conviteNoEscopo` (D2): só depois de
 * confirmar que o convite está dentro do que este usuário pode LER, a
 * função consulta a auditoria por `entidade`/`entidadeId`, sem exigir o
 * papel Admin, porque quem já pode ler o convite pode ler o rastro dele.
 * Fora do escopo, lista vazia, a mesma resposta de "não existe".
 */
export async function linhaDoTempoDoConvite(
  escopo: Escopo,
  conviteId: string,
): Promise<EventoDoConvite[]> {
  const alcancado = await conviteNoEscopo(escopo, { id: conviteId });
  if (!alcancado) return [];

  return db()
    .select({
      acao: auditoria.acao,
      criadoEm: auditoria.criadoEm,
      atorNome: auditoria.atorNome,
      dados: auditoria.dadosJson,
    })
    .from(auditoria)
    .where(
      and(eq(auditoria.entidade, 'palestra_convite'), eq(auditoria.entidadeId, conviteId)),
    )
    .orderBy(asc(auditoria.criadoEm))
    .limit(50);
}

/**
 * Marca, edita ou remove a anotação pessoal de envio (D4 do design).
 *
 * Só o colaborador dono do convite escreve — é o que a spec pede
 * ("Anotação restrita ao escopo": gerentes só leem). O `where` já filtra por
 * `colaboradorId = escopo.usuarioId`, então um convite fora do escopo
 * simplesmente não é encontrado: zero linhas afetadas, sem distinguir
 * "não existe" de "não é seu".
 */
export async function definirEnviadoPara(
  escopo: Escopo,
  conviteId: string,
  valor: string | null,
  ator: Ator,
): Promise<boolean> {
  if (escopo.papel !== 'colaborador') {
    throw new SemAcesso('verConvitesEConfirmacoes', 'papel');
  }

  const textoLimpo = valor?.trim() ? valor.trim().slice(0, 200) : null;

  const [linha] = await db()
    .update(convite)
    .set({ enviadoPara: textoLimpo, atualizadoEm: new Date() })
    .where(
      and(eq(convite.id, conviteId), eq(convite.colaboradorId, escopo.usuarioId)),
    )
    .returning({ id: convite.id });

  if (!linha) return false;

  await registrarAuditoria({
    ator,
    acao: ACOES.enviadoParaDefinido,
    entidade: 'palestra_convite',
    entidadeId: conviteId,
    dados: { preenchido: textoLimpo !== null },
  });

  return true;
}

/** Contagem por estado efetivo, dentro do escopo. */
export async function resumoNoEscopo(
  escopo: Escopo,
  eventoId?: string,
): Promise<Record<EstadoDeConvite, number>> {
  const convites = await convitesNoEscopo(escopo, eventoId ? { eventoId } : {});
  const resumo: Record<EstadoDeConvite, number> = {
    disponivel: 0,
    confirmado: 0,
    presente: 0,
    expirado: 0,
    cancelado: 0,
  };
  for (const c of convites) resumo[c.estado] += 1;
  return resumo;
}

/* ---------------------------------------------------------
   Confirmações · o CPF é mascarado no SQL (D6)
   --------------------------------------------------------- */

/**
 * `12345678909` → `***.456.789-**`, montado pelo Postgres.
 *
 * O formato é o do PRD. Estar no SQL é o que garante que o valor completo
 * não sai do banco para papel nenhum além do Admin.
 */
const CPF_MASCARADO = sql<string>`'***.' || substr(${confirmacao.cpf}, 4, 3) || '.' || substr(${confirmacao.cpf}, 7, 3) || '-**'`;

export type ConfirmacaoNoEscopo = {
  conviteId: string;
  codigo: string;
  titular: string;
  /**
   * Já mascarado quando quem pediu não é Admin. O campo é um só de
   * propósito: não existe "cpf" e "cpfMascarado" lado a lado para alguém
   * escolher o errado.
   */
  cpf: string;
  /** Falso sempre que o valor acima está mascarado. */
  cpfCompleto: boolean;
  acompanhante: string | null;
  whatsapp: string | null;
  cidade: string | null;
  propriedade: string | null;
  atividade: string | null;
  eventoId: string;
  eventoCidade: string;
  colaboradorNome: string;
  lojaNome: string | null;
  confirmadoEm: Date;
};

/**
 * Confirmados que o escopo alcança.
 *
 * Quem não é Admin recebe o CPF mascarado — decidido aqui, uma vez, e não
 * em cada tela que porventura liste confirmados.
 */
export async function confirmacoesNoEscopo(
  escopo: Escopo,
  filtro: { eventoId?: string; conviteId?: string; lojaId?: string } = {},
): Promise<ConfirmacaoNoEscopo[]> {
  conferirPapel(escopo, 'verConvitesEConfirmacoes');

  const completo = veCpfCompleto(escopo);

  const condicoes: (SQL | undefined)[] = [
    restricao(escopo, {
      colaboradorId: convite.colaboradorId,
      lojaId: user.lojaId,
      regionalId: loja.regionalId,
    }),
    eq(confirmacao.ativa, true),
  ];
  if (filtro.eventoId) condicoes.push(eq(convite.eventoId, filtro.eventoId));
  if (filtro.conviteId) condicoes.push(eq(confirmacao.conviteId, filtro.conviteId));
  if (filtro.lojaId) condicoes.push(eq(user.lojaId, filtro.lojaId));

  const linhas = await db()
    .select({
      conviteId: confirmacao.conviteId,
      codigo: convite.codigo,
      titular: confirmacao.nome,
      cpf: completo ? confirmacao.cpf : CPF_MASCARADO,
      acompanhante: confirmacao.acompanhanteNome,
      whatsapp: confirmacao.whatsapp,
      cidade: confirmacao.cidade,
      propriedade: confirmacao.propriedade,
      atividade: confirmacao.atividade,
      eventoId: convite.eventoId,
      eventoCidade: evento.cidade,
      colaboradorNome: user.name,
      lojaNome: loja.nome,
      confirmadoEm: confirmacao.confirmadoEm,
    })
    .from(confirmacao)
    .innerJoin(convite, eq(convite.id, confirmacao.conviteId))
    .innerJoin(evento, eq(evento.id, convite.eventoId))
    .innerJoin(user, eq(user.id, convite.colaboradorId))
    .leftJoin(loja, eq(loja.id, user.lojaId))
    .where(and(...condicoes.filter(Boolean)))
    .orderBy(asc(confirmacao.nome))
    .limit(2000);

  return linhas.map((l) => ({ ...l, cpfCompleto: completo }));
}

/**
 * Visão da recepção: **só** titular, acompanhante e CPF mascarado.
 *
 * É um tipo diferente, não um filtro sobre o anterior. Com o mesmo tipo,
 * bastaria alguém passar o objeto inteiro para um componente para o
 * WhatsApp do convidado aparecer na tela da portaria. Aqui o dado não
 * existe no retorno — a consulta nem o seleciona.
 */
export type ConfirmadoParaRecepcao = {
  conviteId: string;
  titular: string;
  acompanhante: string | null;
  /** Sempre `***.456.789-**`. */
  cpf: string;
};

export async function confirmadosParaRecepcao(
  escopo: Escopo,
  eventoId: string,
): Promise<ConfirmadoParaRecepcao[]> {
  conferirPapel(escopo, 'fazerCheckin');

  return db()
    .select({
      conviteId: confirmacao.conviteId,
      titular: confirmacao.nome,
      acompanhante: confirmacao.acompanhanteNome,
      cpf: CPF_MASCARADO,
    })
    .from(confirmacao)
    .innerJoin(convite, eq(convite.id, confirmacao.conviteId))
    .where(
      and(
        eq(confirmacao.ativa, true),
        eq(convite.eventoId, eventoId),
        inArray(convite.estado, ['confirmado', 'presente']),
      ),
    )
    .orderBy(asc(confirmacao.nome))
    .limit(2000);
}

/* ---------------------------------------------------------
   Estrutura organizacional
   --------------------------------------------------------- */

export async function lojasNoEscopo(escopo: Escopo) {
  const condicao =
    escopo.papel === 'admin'
      ? undefined
      : escopo.papel === 'gerente_regional'
        ? escopo.regionalId
          ? eq(loja.regionalId, escopo.regionalId)
          : NADA
        : escopo.lojaId
          ? eq(loja.id, escopo.lojaId)
          : NADA;

  return db()
    .select({
      id: loja.id,
      codigo: loja.codigo,
      nome: loja.nome,
      cidade: loja.cidade,
      ativo: loja.ativo,
      regionalId: loja.regionalId,
    })
    .from(loja)
    .where(condicao)
    .orderBy(asc(loja.nome));
}

/**
 * Usuários que o escopo alcança.
 *
 * O CPF **não** entra na projeção: nenhuma tela desta change precisa dele,
 * e uma lista de 390 CPFs numa resposta de servidor é exatamente o tipo de
 * coisa que se descobre vazada depois.
 */
export async function usuariosNoEscopo(
  escopo: Escopo,
  filtro: { papel?: string; somenteAtivos?: boolean } = {},
) {
  const condicoes: (SQL | undefined)[] = [
    escopo.papel === 'admin'
      ? undefined
      : escopo.papel === 'gerente_regional'
        ? escopo.regionalId
          ? eq(loja.regionalId, escopo.regionalId)
          : NADA
        : escopo.papel === 'gerente_loja'
          ? escopo.lojaId
            ? eq(user.lojaId, escopo.lojaId)
            : NADA
          : eq(user.id, escopo.usuarioId),
  ];
  if (filtro.papel) condicoes.push(eq(user.papel, filtro.papel));
  if (filtro.somenteAtivos) condicoes.push(eq(user.ativo, true));

  return db()
    .select({
      id: user.id,
      nome: user.name,
      email: user.email,
      papel: user.papel,
      ativo: user.ativo,
      lojaId: user.lojaId,
      lojaNome: loja.nome,
      temEmail: isNotNull(user.email),
    })
    .from(user)
    .leftJoin(loja, eq(loja.id, user.lojaId))
    .where(and(...condicoes.filter(Boolean)))
    .orderBy(asc(user.name))
    .limit(1000);
}

/** Quantos usuários o escopo alcança. Usado nos números do painel. */
export async function totalDeUsuariosNoEscopo(escopo: Escopo): Promise<number> {
  const linhas = await db()
    .select({ total: count() })
    .from(user)
    .leftJoin(loja, eq(loja.id, user.lojaId))
    .where(
      escopo.papel === 'admin'
        ? undefined
        : escopo.papel === 'gerente_regional'
          ? escopo.regionalId
            ? eq(loja.regionalId, escopo.regionalId)
            : NADA
          : escopo.lojaId
            ? eq(user.lojaId, escopo.lojaId)
            : NADA,
    );
  return Number(linhas[0]?.total ?? 0);
}

/* ---------------------------------------------------------
   Visão gerencial (`visao-gerencial`) · números por consulta agregada

   D5 do design: sem tabela de contadores. A agregação é feita **no banco**,
   com `GROUP BY` e `count()` — não trazendo cada convite para agrupar em
   JavaScript, que é caro justamente na visão que mais importa (a do Admin,
   que soma todas as regionais). O estado efetivo entra como uma expressão
   `CASE` para o `GROUP BY` valer sobre o estado que o colaborador realmente
   vê, e não sobre o que ainda não foi consolidado pelo cron (D3).
   --------------------------------------------------------- */

/** `CASE … END` que reproduz `estadoEfetivo()` dentro do SQL, para agrupar por ele. */
const ESTADO_EFETIVO_SQL = sql<string>`case when ${convite.estado} = 'disponivel' and ${evento.prazoConfirmacao} < now() then 'expirado' else ${convite.estado} end`;

export type ResumoDeContagem = Record<EstadoDeConvite, number>;

function resumoVazio(): ResumoDeContagem {
  return { disponivel: 0, confirmado: 0, presente: 0, expirado: 0, cancelado: 0 };
}

/** Agrupa linhas cruas (`{ chave, estado, total }`) num mapa de resumos por chave. */
function agruparPorChave<C extends string>(
  linhas: { chave: C; estado: string; total: number | string }[],
): Map<C, ResumoDeContagem> {
  const mapa = new Map<C, ResumoDeContagem>();
  for (const l of linhas) {
    const resumo = mapa.get(l.chave) ?? resumoVazio();
    const estado = l.estado as EstadoDeConvite;
    if (estado in resumo) resumo[estado] += Number(l.total);
    mapa.set(l.chave, resumo);
  }
  return mapa;
}

export type ResumoDeRegional = {
  regionalId: string;
  regionalNome: string;
  resumo: ResumoDeContagem;
};

/**
 * Números por regional. Só faz sentido para quem enxerga mais de uma —
 * na prática, só o Admin: o alcance `regional` do gerente já o restringe à
 * própria, então esta função nunca aparece para ele (a tela usa
 * `resumoPorLoja` direto).
 */
export async function resumoPorRegional(
  escopo: Escopo,
  filtro: { eventoId?: string } = {},
): Promise<ResumoDeRegional[]> {
  conferirPapel(escopo, 'verConvitesEConfirmacoes');
  if (escopo.papel !== 'admin') throw new SemAcesso('verConvitesEConfirmacoes', 'papel');

  const condicoes: (SQL | undefined)[] = [];
  if (filtro.eventoId) condicoes.push(eq(convite.eventoId, filtro.eventoId));

  const linhas = await db()
    .select({
      chave: regional.id,
      regionalNome: regional.nome,
      estado: ESTADO_EFETIVO_SQL,
      total: count(),
    })
    .from(convite)
    .innerJoin(evento, eq(evento.id, convite.eventoId))
    .innerJoin(user, eq(user.id, convite.colaboradorId))
    .innerJoin(loja, eq(loja.id, user.lojaId))
    .innerJoin(regional, eq(regional.id, loja.regionalId))
    .where(condicoes.length ? and(...condicoes) : undefined)
    .groupBy(regional.id, regional.nome, ESTADO_EFETIVO_SQL);

  const porRegional = agruparPorChave(linhas);
  const nomes = new Map(linhas.map((l) => [l.chave, l.regionalNome]));

  return [...porRegional.entries()]
    .map(([regionalId, resumo]) => ({
      regionalId,
      regionalNome: nomes.get(regionalId) ?? regionalId,
      resumo,
    }))
    .sort((a, b) => a.regionalNome.localeCompare(b.regionalNome, 'pt-BR'));
}

export type ResumoDeLoja = {
  lojaId: string;
  lojaNome: string;
  lojaCodigo: string;
  regionalId: string;
  resumo: ResumoDeContagem;
};

/**
 * Números por loja, dentro do escopo — todas as lojas da regional do
 * gerente regional, só a própria para o gerente de loja, e as de uma
 * regional escolhida (ou todas) para o Admin.
 *
 * `regionalId` é um filtro **dentro** do que o escopo já alcança: um
 * gerente regional que tentasse filtrar pela regional de outra pessoa não
 * ganha nada com isso — a restrição do escopo já limitou a consulta antes.
 */
export async function resumoPorLoja(
  escopo: Escopo,
  filtro: { eventoId?: string; regionalId?: string } = {},
): Promise<ResumoDeLoja[]> {
  conferirPapel(escopo, 'verConvitesEConfirmacoes');

  // A visão de equipe é só para quem tem MAIS de um colaborador no
  // escopo (spec `visao-gerencial`: "Gerentes e Admin"). Um gerente de loja
  // não tem "números por loja" — só a própria, então cai em
  // `resumoPorColaborador`. Colaborador e recepção têm alcance em
  // `verConvitesEConfirmacoes` (para a LEITURA da própria lista de
  // convites), mas não para esta agregação — `conferirPapel`, sozinha, não
  // bastaria para barrá-los.
  if (escopo.papel !== 'admin' && escopo.papel !== 'gerente_regional') {
    throw new SemAcesso('verConvitesEConfirmacoes', 'escopo');
  }

  const condicoes: (SQL | undefined)[] = [
    restricao(escopo, {
      colaboradorId: convite.colaboradorId,
      lojaId: user.lojaId,
      regionalId: loja.regionalId,
    }),
  ];
  if (filtro.eventoId) condicoes.push(eq(convite.eventoId, filtro.eventoId));
  if (filtro.regionalId) condicoes.push(eq(loja.regionalId, filtro.regionalId));

  const linhas = await db()
    .select({
      chave: loja.id,
      lojaNome: loja.nome,
      lojaCodigo: loja.codigo,
      regionalId: loja.regionalId,
      estado: ESTADO_EFETIVO_SQL,
      total: count(),
    })
    .from(convite)
    .innerJoin(evento, eq(evento.id, convite.eventoId))
    .innerJoin(user, eq(user.id, convite.colaboradorId))
    .innerJoin(loja, eq(loja.id, user.lojaId))
    .where(and(...condicoes.filter(Boolean)))
    .groupBy(loja.id, loja.nome, loja.codigo, loja.regionalId, ESTADO_EFETIVO_SQL);

  const porLoja = agruparPorChave(linhas);
  const detalhe = new Map(
    linhas.map((l) => [l.chave, { nome: l.lojaNome, codigo: l.lojaCodigo, regionalId: l.regionalId }]),
  );

  return [...porLoja.entries()]
    .map(([lojaId, resumo]) => ({
      lojaId,
      lojaNome: detalhe.get(lojaId)?.nome ?? lojaId,
      lojaCodigo: detalhe.get(lojaId)?.codigo ?? '',
      regionalId: detalhe.get(lojaId)?.regionalId ?? '',
      resumo,
    }))
    .sort((a, b) => a.lojaNome.localeCompare(b.lojaNome, 'pt-BR'));
}

export type ResumoDeColaborador = {
  colaboradorId: string;
  colaboradorNome: string;
  lojaId: string;
  resumo: ResumoDeContagem;
};

/**
 * Números por colaborador de uma loja. `lojaId` é obrigatório e conferido
 * contra o escopo com `permitido()` — o mesmo mecanismo usado em toda
 * checagem de recurso do projeto (D2): um gerente de loja só pode pedir a
 * própria; um gerente regional, uma loja da própria regional; o Admin,
 * qualquer uma.
 */
export async function resumoPorColaborador(
  escopo: Escopo,
  lojaId: string,
  filtro: { eventoId?: string } = {},
): Promise<ResumoDeColaborador[]> {
  conferirPapel(escopo, 'verConvitesEConfirmacoes');

  const [linhaDaLoja] = await db()
    .select({ id: loja.id, regionalId: loja.regionalId })
    .from(loja)
    .where(eq(loja.id, lojaId))
    .limit(1);
  if (!linhaDaLoja) return [];

  if (
    !permitido(escopo, 'verConvitesEConfirmacoes', {
      lojaId: linhaDaLoja.id,
      regionalId: linhaDaLoja.regionalId,
    })
  ) {
    throw new SemAcesso('verConvitesEConfirmacoes', 'escopo');
  }

  const condicoes: (SQL | undefined)[] = [eq(user.lojaId, lojaId)];
  if (filtro.eventoId) condicoes.push(eq(convite.eventoId, filtro.eventoId));

  const linhas = await db()
    .select({
      chave: user.id,
      colaboradorNome: user.name,
      estado: ESTADO_EFETIVO_SQL,
      total: count(),
    })
    .from(convite)
    .innerJoin(evento, eq(evento.id, convite.eventoId))
    .innerJoin(user, eq(user.id, convite.colaboradorId))
    .where(and(...condicoes.filter(Boolean)))
    .groupBy(user.id, user.name, ESTADO_EFETIVO_SQL);

  const porColaborador = agruparPorChave(linhas);
  const nomes = new Map(linhas.map((l) => [l.chave, l.colaboradorNome]));

  return [...porColaborador.entries()]
    .map(([colaboradorId, resumo]) => ({
      colaboradorId,
      colaboradorNome: nomes.get(colaboradorId) ?? colaboradorId,
      lojaId,
      resumo,
    }))
    .sort((a, b) => a.colaboradorNome.localeCompare(b.colaboradorNome, 'pt-BR'));
}

/* ---------------------------------------------------------
   `operacao-evento` · busca manual do check-in, lista impressa e CSV

   As duas buscas abaixo servem a mesma tela (D1 do design: a busca manual
   não é um recurso escondido, fica a um toque do leitor). Devolvem o mesmo
   tipo restrito que a recepção já usa (`ConfirmadoParaRecepcao`): titular,
   acompanhante e CPF mascarado — nada de WhatsApp, cidade, propriedade ou
   atividade, como a spec exige.
   --------------------------------------------------------- */

const CONFIRMADOS_DA_PALESTRA = (eventoId: string) =>
  and(
    eq(confirmacao.ativa, true),
    eq(convite.eventoId, eventoId),
    inArray(convite.estado, ['confirmado', 'presente']),
  );

/** O confirmado daquela palestra com este CPF, se existir (busca manual por CPF). */
export async function buscarConfirmadoPorCpf(
  escopo: Escopo,
  eventoId: string,
  cpf: string,
): Promise<ConfirmadoParaRecepcao | null> {
  conferirPapel(escopo, 'fazerCheckin');

  const [linha] = await db()
    .select({
      conviteId: confirmacao.conviteId,
      titular: confirmacao.nome,
      acompanhante: confirmacao.acompanhanteNome,
      cpf: CPF_MASCARADO,
    })
    .from(confirmacao)
    .innerJoin(convite, eq(convite.id, confirmacao.conviteId))
    .where(and(CONFIRMADOS_DA_PALESTRA(eventoId), eq(confirmacao.cpf, cpf)))
    .limit(1);

  return linha ?? null;
}

/**
 * Confirmados daquela palestra cujo nome contém o texto informado (busca
 * manual por nome parcial). Até 20 resultados — o suficiente para uma
 * busca na porta, sem devolver a lista inteira por engano de digitação.
 */
export async function buscarConfirmadosPorNome(
  escopo: Escopo,
  eventoId: string,
  nomeParcial: string,
): Promise<ConfirmadoParaRecepcao[]> {
  conferirPapel(escopo, 'fazerCheckin');
  const termo = nomeParcial.trim();
  if (!termo) return [];

  return db()
    .select({
      conviteId: confirmacao.conviteId,
      titular: confirmacao.nome,
      acompanhante: confirmacao.acompanhanteNome,
      cpf: CPF_MASCARADO,
    })
    .from(confirmacao)
    .innerJoin(convite, eq(convite.id, confirmacao.conviteId))
    .where(and(CONFIRMADOS_DA_PALESTRA(eventoId), ilike(confirmacao.nome, `%${termo}%`)))
    .orderBy(asc(confirmacao.nome))
    .limit(20);
}

/** Uma linha da lista impressa: só o que a spec autoriza no papel que circula pelo salão. */
export type LinhaDeImpressao = {
  conviteId: string;
  titular: string;
  /** Sempre mascarado — inclusive para o Admin (D6 do design). */
  cpf: string;
  acompanhante: string | null;
  lojaNome: string | null;
  colaboradorNome: string;
};

/**
 * Confirmados de uma palestra para a lista impressa, em ordem alfabética
 * pelo titular.
 *
 * O CPF é **sempre** mascarado aqui, mesmo para o Admin — ao contrário de
 * `confirmacoesNoEscopo`, que respeita `veCpfCompleto`. É a diferença que
 * D6 exige: a lista impressa circula pelo salão e pode ficar numa mesa; o
 * papel de trabalho não é o lugar do CPF completo, mesmo para quem tem
 * permissão de vê-lo em outras telas.
 */
export async function listaDeImpressao(
  escopo: Escopo,
  eventoId: string,
): Promise<LinhaDeImpressao[]> {
  conferirPapel(escopo, 'listaImpressaECsv');

  const condicoes: (SQL | undefined)[] = [CONFIRMADOS_DA_PALESTRA(eventoId)];
  // A recepção não tem escopo de origem (loja/regional): vê os confirmados
  // da palestra inteira, como em `confirmadosParaRecepcao`. Os demais
  // papéis (Admin e gerentes) têm a lista restrita pelo vínculo de origem.
  if (escopo.papel !== 'recepcao') {
    condicoes.push(
      restricao(escopo, {
        colaboradorId: convite.colaboradorId,
        lojaId: user.lojaId,
        regionalId: loja.regionalId,
      }),
    );
  }

  return db()
    .select({
      conviteId: confirmacao.conviteId,
      titular: confirmacao.nome,
      cpf: CPF_MASCARADO,
      acompanhante: confirmacao.acompanhanteNome,
      lojaNome: loja.nome,
      colaboradorNome: user.name,
    })
    .from(confirmacao)
    .innerJoin(convite, eq(convite.id, confirmacao.conviteId))
    .innerJoin(user, eq(user.id, convite.colaboradorId))
    .leftJoin(loja, eq(loja.id, user.lojaId))
    .where(and(...condicoes.filter(Boolean)))
    .orderBy(asc(confirmacao.nome))
    .limit(2000);
}

/**
 * Total de pessoas esperadas: titulares mais acompanhantes, a partir das
 * linhas de `listaDeImpressao` (tarefa 6.7).
 *
 * É a mesma conta que o cabeçalho da lista impressa já faz (tarefa 6.2):
 * uma linha por titular confirmado, mais uma para cada acompanhante
 * informado. Reaproveitada aqui para não haver duas fórmulas do mesmo
 * número em telas diferentes.
 */
export function totalDePessoasEsperadas(
  linhas: Pick<LinhaDeImpressao, 'acompanhante'>[],
): number {
  return linhas.length + linhas.filter((l) => l.acompanhante).length;
}

/** Uma linha da exportação CSV: todas as colunas que a spec `exportacao-csv` pede. */
export type LinhaDeExportacaoCsv = {
  codigo: string;
  estado: EstadoDeConvite;
  regionalNome: string | null;
  lojaNome: string | null;
  colaboradorNome: string;
  titularNome: string | null;
  titularCpf: string | null;
  titularWhatsapp: string | null;
  cidade: string | null;
  propriedade: string | null;
  atividade: string | null;
  acompanhanteNome: string | null;
  confirmadoEm: Date | null;
  checkinEm: Date | null;
  canceladoEm: Date | null;
};

/**
 * Todos os convites de uma palestra, em todos os estados, para a
 * exportação CSV — diferente da lista impressa e da busca manual, que só
 * mostram quem confirmou.
 *
 * `LEFT JOIN` até `confirmacao` e `checkin`: um convite `disponivel` não
 * tem nenhum dos dois, e a linha sai com essas colunas vazias em vez de
 * sumir da exportação (a spec pede "todos os estados são exportados").
 *
 * CPF completo só para o Admin (`veCpfCompleto`) — a regra geral da
 * exportação (D6), diferente da lista impressa, que mascara sempre.
 */
export async function dadosParaExportacaoCsv(
  escopo: Escopo,
  eventoId: string,
): Promise<LinhaDeExportacaoCsv[]> {
  conferirPapel(escopo, 'exportarCsv');
  const completo = veCpfCompleto(escopo);

  const condicoes: (SQL | undefined)[] = [
    eq(convite.eventoId, eventoId),
    restricao(escopo, {
      colaboradorId: convite.colaboradorId,
      lojaId: user.lojaId,
      regionalId: loja.regionalId,
    }),
  ];

  const linhas = await db()
    .select({
      codigo: convite.codigo,
      estadoGravado: convite.estado,
      prazo: evento.prazoConfirmacao,
      regionalNome: regional.nome,
      lojaNome: loja.nome,
      colaboradorNome: user.name,
      titularNome: confirmacao.nome,
      titularCpf: completo ? confirmacao.cpf : CPF_MASCARADO,
      titularWhatsapp: confirmacao.whatsapp,
      cidade: confirmacao.cidade,
      propriedade: confirmacao.propriedade,
      atividade: confirmacao.atividade,
      acompanhanteNome: confirmacao.acompanhanteNome,
      confirmadoEm: confirmacao.confirmadoEm,
      checkinEm: checkin.feitoEm,
      canceladoEm: convite.canceladoEm,
    })
    .from(convite)
    .innerJoin(evento, eq(evento.id, convite.eventoId))
    .innerJoin(user, eq(user.id, convite.colaboradorId))
    .leftJoin(loja, eq(loja.id, user.lojaId))
    .leftJoin(regional, eq(regional.id, loja.regionalId))
    .leftJoin(confirmacao, eq(confirmacao.conviteId, convite.id))
    .leftJoin(checkin, eq(checkin.conviteId, convite.id))
    .where(and(...condicoes.filter(Boolean)))
    .orderBy(asc(confirmacao.nome), asc(convite.codigo))
    .limit(5000);

  const referencia = agora();
  return linhas.map((l) => ({
    codigo: l.codigo,
    estado: estadoEfetivo(l.estadoGravado as EstadoDeConvite, new Date(l.prazo), referencia),
    regionalNome: l.regionalNome,
    lojaNome: l.lojaNome,
    colaboradorNome: l.colaboradorNome,
    titularNome: l.titularNome,
    titularCpf: l.titularCpf,
    titularWhatsapp: l.titularWhatsapp,
    cidade: l.cidade,
    propriedade: l.propriedade,
    atividade: l.atividade,
    acompanhanteNome: l.acompanhanteNome,
    confirmadoEm: l.confirmadoEm ? new Date(l.confirmadoEm) : null,
    checkinEm: l.checkinEm ? new Date(l.checkinEm) : null,
    canceladoEm: l.canceladoEm ? new Date(l.canceladoEm) : null,
  }));
}
