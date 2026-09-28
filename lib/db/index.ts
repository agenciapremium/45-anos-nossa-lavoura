import 'server-only';

import { neon, neonConfig, Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzleHttp } from 'drizzle-orm/neon-http';

import { env } from '@/lib/env';
import * as schema from './schema';

export * as schema from './schema';

/**
 * Duas conexões, porque o Neon serverless tem dois transportes com
 * características diferentes:
 *
 * - **HTTP** (`db`): uma viagem por consulta, sem sessão. É o mais rápido e
 *   barato para leitura, e é o que quase toda tela usa.
 * - **WebSocket** (`dbTx`): mantém sessão, que é o que `BEGIN … COMMIT` e
 *   `SELECT … FOR UPDATE` exigem. Toda transição de estado de convite passa
 *   por aqui (D4 do design), além da importação de CSV e da geração de lotes.
 *
 * Usar HTTP para transação não daria erro visível — cada consulta abriria e
 * fecharia sua própria sessão, e a trava de linha simplesmente não valeria.
 * Por isso os dois clientes são separados e nomeados.
 */

neonConfig.poolQueryViaFetch = true;

let clienteHttp: ReturnType<typeof drizzleHttp<typeof schema>> | null = null;
let pool: Pool | null = null;
let clienteTx: ReturnType<typeof drizzle<typeof schema>> | null = null;

/** Conexão de leitura e escrita simples, via HTTP. */
export function db() {
  clienteHttp ??= drizzleHttp(neon(env().DATABASE_URL), {
    schema,
    casing: 'snake_case',
  });
  return clienteHttp;
}

/** Conexão com sessão, para transações com trava de linha. */
export function dbTx() {
  if (!clienteTx) {
    pool = new Pool({ connectionString: env().DATABASE_URL });
    clienteTx = drizzle(pool, { schema, casing: 'snake_case' });
  }
  return clienteTx;
}

/** Encerra o pool — usado por scripts de linha de comando. */
export async function fecharConexoes() {
  await pool?.end();
  pool = null;
  clienteTx = null;
}
