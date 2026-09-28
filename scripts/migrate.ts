/**
 * Aplica as migrações versionadas de `drizzle/` no banco apontado por
 * `DATABASE_URL`.
 *
 * O migrador do Drizzle guarda em `drizzle.__drizzle_migrations` o hash de
 * cada arquivo já aplicado, então rodar duas vezes seguidas não repete nada
 * — é o que a tarefa 2.7 da change pede.
 *
 *   npm run db:migrate
 */
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

config({ path: '.env', quiet: true });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL ausente. Copie .env.example para .env.');
  process.exit(1);
}

async function main() {
  const pool = new Pool({ connectionString: url });

  try {
    const antes = await pool.query<{ n: string }>(
      "select count(*)::text as n from information_schema.tables where table_schema = 'public'",
    );
    console.log(`Tabelas antes: ${antes.rows[0]?.n ?? '0'}`);

    await migrate(drizzle(pool), { migrationsFolder: './drizzle' });

    const depois = await pool.query<{ table_name: string }>(
      "select table_name from information_schema.tables where table_schema = 'public' order by 1",
    );
    console.log(`Tabelas depois: ${depois.rows.length}`);
    for (const r of depois.rows) console.log(`  - ${r.table_name}`);
    console.log('\nMigracoes aplicadas.');
  } catch (erro) {
    console.error('Falha ao migrar:', erro);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void main();
