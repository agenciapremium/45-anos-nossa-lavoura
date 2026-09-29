/**
 * Remove definitivamente os usuários que os scripts de integração e de smoke
 * deixam no banco.
 *
 * Companheiro de `desativar-usuarios-de-teste.ts`, que só marca
 * `ativo = false`. Aquele existia porque **apagar era impossível**: a chave
 * estrangeira `palestra_auditoria.ator_id` era `ON DELETE SET NULL`, e para o
 * Postgres `SET NULL` é um `UPDATE` — que os gatilhos de imutabilidade da
 * auditoria proíbem. Qualquer `DELETE` em `user` derrubava a transação
 * inteira.
 *
 * A migração `0007` tirou aquela FK (ver o comentário em `lib/db/schema.ts`,
 * na tabela `auditoria`): nenhuma linha de auditoria é mais tocada pelo ciclo
 * de vida de `user`, e os três gatilhos ficam armados o tempo inteiro. Este
 * script **não desabilita gatilho nenhum** e **não apaga nem altera nenhuma
 * linha de auditoria** — só insere a linha que registra a própria remoção.
 *
 * A trilha continua nomeando quem agiu: `ator_nome` é gravado junto de cada
 * registro e é o que todas as leituras do sistema usam (a tela de auditoria,
 * o filtro por ator e a linha do tempo do convite nunca juntam com `user`).
 * O que fica sem garantia referencial é `ator_id`, que passa a poder apontar
 * para um usuário removido.
 *
 *   npm run usuarios:remover-teste                # mostra o que faria
 *   npm run usuarios:remover-teste -- --aplicar   # remove
 *
 * Antes de apagar, escreve um backup em
 * `docs/usuarios-de-teste-removidos-<data>.sql`, com `INSERT`s de `user` e
 * `account`. Restaurar de lá devolve os usuários, mas não o `ator_id` das
 * linhas de auditoria: os ids seriam outros, e a auditoria é imutável.
 */
import { writeFileSync } from 'node:fs';

import { config } from 'dotenv';
import { inArray, like, or, sql } from 'drizzle-orm';

config({ path: '.env', quiet: true });

/** Os mesmos prefixos de nome que os scripts de integração usam. */
const PREFIXOS = ['[TESTE-%', '[SMOKE-%'];

function literal(valor: unknown): string {
  if (valor === null || valor === undefined) return 'NULL';
  if (valor instanceof Date) return `'${valor.toISOString()}'`;
  if (typeof valor === 'boolean') return valor ? 'true' : 'false';
  if (typeof valor === 'number') return String(valor);
  return `'${String(valor).replace(/'/g, "''")}'`;
}

function inserts(tabela: string, linhas: Record<string, unknown>[]): string {
  if (linhas.length === 0) return `-- nenhuma linha em ${tabela}\n`;
  const colunas = Object.keys(linhas[0]!);
  const valores = linhas
    .map((l) => `  (${colunas.map((c) => literal(l[c])).join(', ')})`)
    .join(',\n');
  return (
    `INSERT INTO ${tabela} (${colunas.map((c) => `"${c}"`).join(', ')}) VALUES\n` +
    `${valores};\n`
  );
}

async function principal() {
  const aplicar = process.argv.includes('--aplicar');

  const { db, dbTx, fecharConexoes } = await import('@/lib/db');
  const { account, auditoria, convite, lote, session, user } = await import(
    '@/lib/db/schema'
  );
  const { registrarAuditoria, ACOES, ATOR_DE_SCRIPT } = await import(
    '@/lib/palestras/auditoria'
  );

  try {
    /* --- 1. a migração 0007 já rodou? --- */
    const consultaDeFks = await db().execute<{ fks: number }>(sql`
      select count(*)::int as fks
      from pg_constraint
      where conrelid = 'palestra_auditoria'::regclass and contype = 'f'
    `);
    const fks = Number(consultaDeFks.rows[0]?.fks ?? 0);

    if (fks > 0) {
      console.log(
        'A migração 0007 ainda não foi aplicada: `palestra_auditoria` ainda tem\n' +
          'chave estrangeira para `user`, e por causa dela o DELETE seria recusado\n' +
          'pelo gatilho de imutabilidade da auditoria.\n\n' +
          'Rode `npm run db:migrate` antes deste script.',
      );
      process.exitCode = 1;
      return;
    }

    const filtroDeNome = or(...PREFIXOS.map((p) => like(user.name, p)))!;

    const alvos = await db()
      .select({ id: user.id, nome: user.name, papel: user.papel, ativo: user.ativo })
      .from(user)
      .where(filtroDeNome);

    if (alvos.length === 0) {
      console.log('Nenhum usuário de teste no banco. Nada a fazer.');
      return;
    }

    const ids = alvos.map((a) => a.id);

    /* --- 2. nada que bloqueie: convite e lote são `on delete restrict` --- */
    const [convitesPresos] = await db()
      .select({ n: sql<number>`count(*)::int` })
      .from(convite)
      .where(inArray(convite.colaboradorId, ids));
    const [lotesPresos] = await db()
      .select({ n: sql<number>`count(*)::int` })
      .from(lote)
      .where(inArray(lote.colaboradorId, ids));

    console.log(`${alvos.length} usuário(s) de teste no banco:`);
    for (const a of alvos) {
      console.log(
        `  ${a.papel.padEnd(18)} ${a.nome}${a.ativo ? '  (ATIVO)' : ''}`,
      );
    }

    const ativos = alvos.filter((a) => a.ativo);
    if (ativos.length > 0) {
      console.log(
        `\n  ${ativos.length} deles ainda ATIVO(S). Eles aceitam login enquanto existirem.`,
      );
    }

    const presos = Number(convitesPresos?.n ?? 0) + Number(lotesPresos?.n ?? 0);
    if (presos > 0) {
      console.log(
        `\nRecusado: ${convitesPresos?.n} convite(s) e ${lotesPresos?.n} lote(s) apontam para\n` +
          'esses usuários, e as duas colunas são `on delete restrict`. Não são\n' +
          'usuários descartáveis: eles distribuíram convites de verdade. Nada foi\n' +
          'removido.',
      );
      process.exitCode = 1;
      return;
    }

    /* --- 3. quantas linhas de auditoria ficam com o ponteiro órfão --- */
    const [auditadas] = await db()
      .select({
        total: sql<number>`count(*)::int`,
        comNome: sql<number>`count(${auditoria.atorNome})::int`,
      })
      .from(auditoria)
      .where(inArray(auditoria.atorId, ids));

    const [sessoes] = await db()
      .select({ n: sql<number>`count(*)::int` })
      .from(session)
      .where(inArray(session.userId, ids));

    const contas = await db().select().from(account).where(inArray(account.userId, ids));

    console.log(
      `\nO DELETE encosta em:\n` +
        `  palestra_auditoria: ${auditadas?.total} linha(s) ficam com ator_id órfão\n` +
        `                      (${auditadas?.comNome} delas guardam o nome em ator_nome)\n` +
        `  account:            ${contas.length} linha(s), por cascade\n` +
        `  session:            ${sessoes?.n} linha(s), por cascade`,
    );

    if (Number(auditadas?.total) !== Number(auditadas?.comNome)) {
      console.log(
        '\nAtenção: alguma linha de auditoria desses usuários está sem `ator_nome`.\n' +
          'Removê-los apagaria a única identificação de quem agiu ali. Confira\n' +
          'essas linhas antes de insistir.',
      );
      process.exitCode = 1;
      return;
    }

    if (!aplicar) {
      console.log('\nNada foi alterado. Rode com --aplicar para remover.');
      return;
    }

    /* --- 4. backup antes --- */
    const usuariosCompletos = await db().select().from(user).where(filtroDeNome);
    const data = new Date().toISOString().slice(0, 10);
    const caminho = `docs/usuarios-de-teste-removidos-${data}.sql`;

    writeFileSync(
      caminho,
      `-- Usuários de teste e smoke removidos em ${data}.\n` +
        `--\n` +
        `-- Nenhum tinha convite ou lote apontando para si (conferido antes: as duas\n` +
        `-- colunas são \`on delete restrict\`, e o script recusa se houver).\n` +
        `--\n` +
        `-- O DELETE encostou em:\n` +
        `--   palestra_auditoria: ${auditadas?.total} linha(s) ficaram com ator_id órfão. Nenhuma foi\n` +
        `--     apagada nem alterada, e todas guardam o nome em ator_nome, que é o que\n` +
        `--     todas as leituras do sistema usam. Isso é possível porque a migração\n` +
        `--     0007 tirou a FK de ator_id: os três gatilhos de imutabilidade da\n` +
        `--     auditoria ficaram armados durante a operação inteira.\n` +
        `--   account: ${contas.length} linha(s), por cascade.\n` +
        `--   session: ${sessoes?.n} linha(s), por cascade.\n` +
        `--\n` +
        `-- Restaurar daqui devolve os usuários, mas NÃO o ator_id das linhas de\n` +
        `-- auditoria: os ids seriam outros, e a auditoria é imutável por contrato.\n\n` +
        inserts('"user"', usuariosCompletos as unknown as Record<string, unknown>[]) +
        '\n' +
        inserts('account', contas as unknown as Record<string, unknown>[]),
      'utf8',
    );
    console.log(`\nbackup: ${caminho}`);

    /* --- 5. a remoção, numa transação --- */
    await dbTx().transaction(async (tx) => {
      await tx.delete(user).where(inArray(user.id, ids));
    });

    await registrarAuditoria({
      ator: ATOR_DE_SCRIPT,
      acao: ACOES.usuarioRemovido,
      entidade: 'user',
      entidadeId: null,
      dados: {
        total: alvos.length,
        removidos: alvos.map((a) => ({ nome: a.nome, papel: a.papel })),
        motivo: 'usuários de teste e smoke dos scripts de integração',
        backup: caminho,
        origem: 'scripts/remover-usuarios-de-teste.ts',
      },
    });

    /* --- 6. conferência: os gatilhos continuam armados e a auditoria intacta --- */
    const consultaDeGatilhos = await db().execute<{
      tgname: string;
      tgenabled: string;
    }>(sql`
      select tgname, tgenabled from pg_trigger
      where tgrelid = 'palestra_auditoria'::regclass and not tgisinternal
      order by tgname
    `);
    const gatilhos = consultaDeGatilhos.rows;
    const desarmado = gatilhos.filter((g) => g.tgenabled !== 'O');

    const [restaram] = await db()
      .select({ n: sql<number>`count(*)::int` })
      .from(user)
      .where(filtroDeNome);

    console.log(`\n${alvos.length} usuário(s) removido(s). Restaram ${restaram?.n}.`);
    console.log('gatilhos de palestra_auditoria:');
    for (const g of gatilhos) {
      console.log(`  ${g.tgname} = ${g.tgenabled === 'O' ? 'armado' : g.tgenabled}`);
    }
    if (desarmado.length > 0) {
      console.log(
        '\nATENÇÃO: gatilho de auditoria desarmado. Não deveria acontecer: este\n' +
          'script nunca os toca. Investigue antes de usar o ambiente.',
      );
      process.exitCode = 1;
    }
  } finally {
    await fecharConexoes();
  }
}

principal().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
