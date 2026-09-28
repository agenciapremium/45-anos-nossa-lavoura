import 'server-only';

import { eq, sql } from 'drizzle-orm';

import { dbTx } from '@/lib/db';
import {
  convite as tabelaConvite,
  evento as tabelaEvento,
  type Convite,
  type EstadoDeConvite,
} from '@/lib/db/schema';
import { registrarAuditoria, type Ator } from '@/lib/palestras/auditoria';
import { agora, venceu } from '@/lib/tempo';

/* =========================================================
   Ciclo de vida do convite

   Esta change só executa a transição `disponivel -> expirado`, mas a regra e
   o helper ficam definidos aqui inteiros, porque `confirmacao-convidado`,
   `painel-colaborador` e `operacao-evento` usam os mesmos (D4 do design).
   Nenhuma delas deve reinventar a trava.
   ========================================================= */

/**
 * Transições permitidas. O que não está listado é recusado.
 *
 * - `presente`, `expirado` e `cancelado` são terminais: nada volta para
 *   `disponivel`.
 * - `confirmado` NÃO vai para `expirado`: quem confirmou dentro do prazo
 *   continua confirmado depois dele.
 */
export const TRANSICOES_PERMITIDAS: Record<
  EstadoDeConvite,
  readonly EstadoDeConvite[]
> = {
  disponivel: ['confirmado', 'expirado', 'cancelado'],
  confirmado: ['presente', 'cancelado'],
  presente: [],
  expirado: [],
  cancelado: [],
};

export function podeTransicionar(
  de: EstadoDeConvite,
  para: EstadoDeConvite,
): boolean {
  return TRANSICOES_PERMITIDAS[de].includes(para);
}

/**
 * Estado **efetivo** do convite na leitura (D3 do design).
 *
 * O cron diário é um efeito colateral, não a fonte da verdade: se ele não
 * rodar, um convite `disponivel` com prazo vencido ainda precisa ser tratado
 * como expirado por quem abrir o link. Toda consulta que devolve convite
 * passa por aqui.
 */
export function estadoEfetivo(
  estadoGravado: EstadoDeConvite,
  prazoDaPalestra: Date,
  referencia: Date = agora(),
): EstadoDeConvite {
  if (estadoGravado === 'disponivel' && venceu(prazoDaPalestra, referencia)) {
    return 'expirado';
  }
  return estadoGravado;
}

export type MotivoDeRecusa =
  | 'nao-encontrado'
  | 'transicao-invalida'
  | 'estado-inesperado'
  | 'prazo-vencido';

export type ResultadoDaTransicao<T> =
  | { ok: true; convite: Convite; resultado: T }
  | { ok: false; motivo: MotivoDeRecusa; convite?: Convite };

type Alvo = { id: string } | { codigo: string };

export type OpcoesDeTransicao<T> = {
  /** Qual convite: por id interno ou pelo código curto da URL. */
  alvo: Alvo;
  /** Estado de destino. */
  para: EstadoDeConvite;
  /**
   * Estados de origem aceitos. Quando informado, um convite em outro estado
   * é recusado com `estado-inesperado` — mesmo que a transição fosse
   * permitida. Serve para "confirme apenas se ainda estiver disponível".
   */
  exigirEstadoAtual?: readonly EstadoDeConvite[];
  /**
   * Quando verdadeiro, a transição é recusada se o prazo da palestra já
   * tiver vencido. É o que impede confirmar um convite que a leitura já
   * trata como expirado.
   */
  exigirDentroDoPrazo?: boolean;
  /** Colunas extras a gravar junto com o estado. */
  campos?: Partial<{
    expiradoEm: Date | null;
    canceladoEm: Date | null;
    canceladoPor: string | null;
    motivoCancelamento: string | null;
    enviadoPara: string | null;
  }>;
  /**
   * Efeitos que precisam acontecer na **mesma** transação — gravar a
   * confirmação, o check-in, desativar a confirmação anterior. Recebe a
   * transação e o convite já travado.
   */
  aoAplicar?: (
    tx: Parameters<Parameters<ReturnType<typeof dbTx>['transaction']>[0]>[0],
    convite: Convite,
  ) => Promise<T>;
  /** Auditoria: quem fez e sob que rótulo. */
  auditoria?: { acao: string; ator: Ator; dados?: Record<string, unknown> };
};

/**
 * Muda o estado de um convite dentro de uma transação, com a linha travada.
 *
 * O `SELECT … FOR UPDATE` é o ponto da função. Sem ele, dois cliques
 * simultâneos no mesmo link leriam `disponivel` ao mesmo tempo e ambos
 * gravariam `confirmado` — com CPFs diferentes. A restrição única de CPF não
 * resolve esse caso: são CPFs distintos, e o segundo simplesmente
 * sobrescreveria o primeiro.
 *
 * A trava vale da leitura até o commit, então o segundo pedido espera, relê
 * o estado já atualizado e é recusado por `estado-inesperado`.
 */
export async function transicionarConvite<T = undefined>(
  opcoes: OpcoesDeTransicao<T>,
): Promise<ResultadoDaTransicao<T>> {
  const {
    alvo,
    para,
    exigirEstadoAtual,
    exigirDentroDoPrazo = false,
    campos,
    aoAplicar,
    auditoria,
  } = opcoes;

  const resultado = await dbTx().transaction(async (tx) => {
    const filtro =
      'id' in alvo
        ? sql`c.id = ${alvo.id}`
        : sql`c.codigo = ${alvo.codigo}`;

    // A linha do convite é travada; a da palestra é só lida, para conhecer o
    // prazo sem prender a palestra inteira.
    const linhas = await tx.execute<{
      id: string;
      estado: EstadoDeConvite;
      prazo_confirmacao: Date;
    }>(sql`
      select c.id, c.estado, e.prazo_confirmacao
        from ${tabelaConvite} as c
        join ${tabelaEvento} as e on e.id = c.evento_id
       where ${filtro}
         for update of c
    `);

    const linha = linhas.rows[0];
    if (!linha) {
      return { ok: false as const, motivo: 'nao-encontrado' as const };
    }

    const atual = linha.estado;

    if (exigirEstadoAtual && !exigirEstadoAtual.includes(atual)) {
      return { ok: false as const, motivo: 'estado-inesperado' as const };
    }

    if (!podeTransicionar(atual, para)) {
      return { ok: false as const, motivo: 'transicao-invalida' as const };
    }

    const prazo = new Date(linha.prazo_confirmacao);
    if (exigirDentroDoPrazo && venceu(prazo)) {
      return { ok: false as const, motivo: 'prazo-vencido' as const };
    }

    const [atualizado] = await tx
      .update(tabelaConvite)
      .set({ estado: para, atualizadoEm: new Date(), ...campos })
      .where(eq(tabelaConvite.id, linha.id))
      .returning();

    const extra = aoAplicar
      ? await aoAplicar(tx, atualizado!)
      : (undefined as T);

    if (auditoria) {
      await registrarAuditoria(
        {
          ator: auditoria.ator,
          acao: auditoria.acao,
          entidade: 'palestra_convite',
          entidadeId: linha.id,
          dados: { de: atual, para, ...auditoria.dados },
        },
        tx,
      );
    }

    return { ok: true as const, convite: atualizado!, resultado: extra };
  });

  return resultado as ResultadoDaTransicao<T>;
}

/** Mensagem pronta para a interface, por motivo de recusa. */
export const MENSAGEM_DE_RECUSA: Record<MotivoDeRecusa, string> = {
  'nao-encontrado': 'Convite não encontrado.',
  'transicao-invalida': 'Este convite não pode mudar para esse estado.',
  'estado-inesperado': 'O convite já mudou de estado. Atualize a página.',
  'prazo-vencido': 'O prazo de confirmação desta palestra já venceu.',
};
