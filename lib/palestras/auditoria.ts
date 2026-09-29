import 'server-only';

import { db } from '@/lib/db';
import { auditoria as tabela } from '@/lib/db/schema';

/* =========================================================
   Trilha de auditoria

   Registro imutável de toda ação sensível. A imutabilidade não depende desta
   camada: `drizzle/0001_auditoria_imutavel.sql` instala gatilhos que recusam
   UPDATE, DELETE e TRUNCATE na tabela. Aqui só se insere.
   ========================================================= */

/** Quem fez. `null` = rotina automática, sem ator humano. */
export type Ator =
  | { id: string; nome: string }
  | { id: null; nome: string } // ator identificado mas sem conta (guard provisório)
  | null;

export const ROTINA_AUTOMATICA: Ator = null;

/**
 * Ator dos scripts de linha de comando (cadastro das palestras, teste de
 * integração). Não é um usuário: é uma execução manual feita por quem tem
 * acesso ao terminal e ao banco, e a trilha registra isso como tal.
 *
 * Substitui o `ADMIN_PROVISORIO` de `fundacao`, que existia para o guard
 * por token e saiu junto com ele em `auth-e-papeis`.
 */
export const ATOR_DE_SCRIPT: Ator = { id: null, nome: 'script de manutenção' };

/**
 * Ator das tentativas de acesso malsucedidas.
 *
 * Por definição não há usuário identificado: se houvesse, a tentativa
 * teria dado certo. O identificador informado vai no payload, mascarado.
 */
export const TENTATIVA_DE_ACESSO: Ator = { id: null, nome: 'tentativa de acesso' };

/**
 * Ações registradas por esta change. As changes seguintes acrescentam as
 * suas; a lista é aberta de propósito (coluna `text`), mas manter os rótulos
 * reunidos aqui evita que a mesma ação apareça com dois nomes.
 */
export const ACOES = {
  palestraCriada: 'palestra.criada',
  palestraEditada: 'palestra.editada',
  palestraDesativada: 'palestra.desativada',
  palestraReativada: 'palestra.reativada',
  palestraExclusaoRecusada: 'palestra.exclusao_recusada',
  palestraExcluida: 'palestra.excluida',

  regionalCriada: 'regional.criada',
  regionalEditada: 'regional.editada',
  regionalDesativada: 'regional.desativada',

  lojaCriada: 'loja.criada',
  lojaEditada: 'loja.editada',
  lojaDesativada: 'loja.desativada',

  usuarioCriado: 'usuario.criado',
  usuarioEditado: 'usuario.editado',
  usuarioDesativado: 'usuario.desativado',

  importacaoConfirmada: 'importacao.confirmada',

  loteGerado: 'lote.gerado',
  /**
   * Geração avulsa (`convites-avulsos`, D5 do design): ação própria, não
   * uma variação de `lote.gerado`, para o rastro distinguir as duas
   * origens sem precisar interpretar `colaborador_id` nulo no payload.
   */
  loteAvulsoGerado: 'lote_avulso.gerado',
  conviteExpirado: 'convite.expirado',
  expiracaoExecutada: 'expiracao.executada',

  pdfGerado: 'pdf.gerado',
  pdfLoteGerado: 'pdf.lote_gerado',

  // --- auth-e-papeis ---
  acessoEfetuado: 'acesso.efetuado',
  acessoRecusado: 'acesso.recusado',
  acessoBloqueado: 'acesso.bloqueado',
  acessoEnvio: 'acesso.envio',
  sessaoEncerrada: 'sessao.encerrada',
  sessoesEncerradas: 'sessao.encerrada_em_todos',
  senhaDefinida: 'senha.definida',

  // --- confirmacao-convidado ---
  presencaConfirmada: 'confirmacao.criada',
  confirmacaoRecusada: 'confirmacao.recusada',
  canceladaPeloConvidado: 'confirmacao.cancelada_pelo_convidado',
  ingressoRecuperado: 'ingresso.recuperado',

  // --- painel-colaborador ---
  // Mesma transação de `confirmacao.cancelada_pelo_convidado` (D1 do design
  // de `painel-colaborador`): o que muda é só o autor.
  canceladaPeloColaborador: 'confirmacao.cancelada_pelo_colaborador',
  canceladaPeloAdmin: 'confirmacao.cancelada_pelo_admin',
  enviadoParaDefinido: 'convite.enviado_para_definido',

  // --- operacao-evento ---
  checkinRegistrado: 'checkin.registrado',
  listaImpressaGerada: 'lista_impressa.gerada',
  csvExportado: 'csv.exportado',
  csvExportacaoRecusada: 'csv.exportacao_recusada',
} as const;

export type Acao = (typeof ACOES)[keyof typeof ACOES];

export type EntradaDeAuditoria = {
  ator: Ator;
  acao: string;
  entidade: string;
  entidadeId?: string | null;
  dados?: Record<string, unknown> | null;
};

/**
 * Campos que nunca podem entrar no payload.
 *
 * A spec é explícita: nem CPF completo, nem senha, nem OTP, nem token de
 * ingresso. A limpeza é feita aqui, no único ponto de escrita, e não confia
 * em quem chama — é fácil passar o objeto inteiro de um formulário sem
 * perceber o que vai junto.
 */
const CHAVES_PROIBIDAS = new Set([
  'cpf',
  'senha',
  'password',
  'otp',
  'codigo_otp',
  'codigoOtp',
  'token',
  'ingressotoken',
  'ingresso_token',
  'accesstoken',
  'refreshtoken',
  'secret',
  'cron_secret',
  // Credenciais que os fluxos de acesso manipulam. A spec é explícita:
  // o registro guarda identificador, método, IP, data e hora e motivo —
  // nunca a senha, o código ou a data de nascimento informados.
  'codigo',
  'datanascimento',
  'data_nascimento',
  'novasenha',
  'nova_senha',
  'newpassword',
]);

const PROFUNDIDADE_MAXIMA = 6;

/** Máscara de CPF para a auditoria: `123.***.***-09`. */
export function mascararCpf(cpf: string): string {
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11) return '***';
  return `${d.slice(0, 3)}.***.***-${d.slice(9)}`;
}

/**
 * Remove ou mascara o que não pode ser gravado.
 *
 * O CPF não é simplesmente apagado: vira máscara, porque sem nenhum traço
 * dele a trilha perde utilidade para investigar uma confirmação duplicada.
 * Os demais segredos somem inteiros.
 */
export function limparPayload(valor: unknown, nivel = 0): unknown {
  if (nivel > PROFUNDIDADE_MAXIMA) return '[profundo demais]';
  if (valor === null || valor === undefined) return valor;
  if (valor instanceof Date) return valor.toISOString();
  if (Array.isArray(valor)) {
    return valor.map((v) => limparPayload(v, nivel + 1));
  }
  if (typeof valor !== 'object') return valor;

  const saida: Record<string, unknown> = {};
  for (const [chave, v] of Object.entries(valor as Record<string, unknown>)) {
    const normal = chave.toLowerCase().replace(/[^a-z_]/g, '');
    if (normal === 'cpf') {
      saida.cpfMascarado = typeof v === 'string' ? mascararCpf(v) : '***';
      continue;
    }
    if (CHAVES_PROIBIDAS.has(normal)) {
      saida[chave] = '[removido]';
      continue;
    }
    saida[chave] = limparPayload(v, nivel + 1);
  }
  return saida;
}

/**
 * Quem executa a inserção: a conexão HTTP normal ou uma transação em
 * andamento. Os dois clientes do Drizzle têm tipos de resultado diferentes
 * (`neon-http` × `neon-serverless`), e o que importa aqui é só saber
 * inserir — daí a forma estrutural mínima.
 */
type Executor = {
  insert: (alvo: never) => {
    values: (valores: Record<string, unknown>) => PromiseLike<unknown>;
  };
};

/**
 * Grava um registro de auditoria.
 *
 * Aceita uma transação em `executor`: quando a ação auditada acontece dentro
 * de uma transação, o registro precisa entrar ou sair junto com ela. Uma
 * trilha que sobrevive a um rollback mente.
 */
export async function registrarAuditoria(
  entrada: EntradaDeAuditoria,
  executor?: Executor,
): Promise<void> {
  const alvo = (executor ?? db()) as Executor;
  await alvo.insert(tabela as never).values({
    atorId: entrada.ator?.id ?? null,
    atorNome: entrada.ator?.nome ?? 'rotina automática',
    acao: entrada.acao,
    entidade: entrada.entidade,
    entidadeId: entrada.entidadeId ?? null,
    dadosJson: (limparPayload(entrada.dados ?? null) ?? null) as never,
  });
}
