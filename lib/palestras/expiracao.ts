import 'server-only';

import { sql } from 'drizzle-orm';

import { dbTx } from '@/lib/db';
import { convite, evento } from '@/lib/db/schema';
import {
  ACOES,
  registrarAuditoria,
  ROTINA_AUTOMATICA,
} from '@/lib/palestras/auditoria';

export type ResultadoDaExpiracao = {
  atualizados: number;
  executadoEm: string;
  duracaoMs: number;
};

/**
 * Consolida no banco os convites que a leitura já trata como expirados.
 *
 * Três propriedades importam:
 *
 * - **Idempotente**: o filtro `estado = 'disponivel'` faz a segunda execução
 *   no mesmo dia não encontrar nada. Rodar duas vezes é igual a rodar uma.
 * - **Não toca em confirmado**: quem confirmou dentro do prazo continua
 *   confirmado depois dele. Só `disponivel` vira `expirado`.
 * - **Transacional com trava**: o `FOR UPDATE` no subselect impede que a
 *   rotina expire, no mesmo instante, um convite que alguém está
 *   confirmando. `SKIP LOCKED` deixa esses de fora em vez de travar a
 *   rotina inteira — eles serão confirmados (dentro do prazo) ou pegos na
 *   próxima execução.
 */
export async function expirarConvitesVencidos(): Promise<ResultadoDaExpiracao> {
  const inicio = Date.now();

  const atualizados = await dbTx().transaction(async (tx) => {
    const resultado = await tx.execute<{ id: string }>(sql`
      update ${convite}
         set estado = 'expirado',
             expirado_em = now(),
             atualizado_em = now()
       where id in (
         select c.id
           from ${convite} as c
           join ${evento} as e on e.id = c.evento_id
          where c.estado = 'disponivel'
            and e.prazo_confirmacao < now()
            for update of c skip locked
       )
      returning id
    `);
    return resultado.rows.length;
  });

  const duracaoMs = Date.now() - inicio;
  const executadoEm = new Date().toISOString();

  // Registrada mesmo quando nada muda: saber que a rotina rodou e não achou
  // nada é diferente de não saber se ela rodou.
  await registrarAuditoria({
    ator: ROTINA_AUTOMATICA,
    acao: ACOES.expiracaoExecutada,
    entidade: 'palestra_convite',
    dados: { atualizados, duracaoMs, origem: 'rotina automática' },
  });

  return { atualizados, executadoEm, duracaoMs };
}
