/**
 * Desativa os usuários que os scripts de integração deixam no banco.
 *
 * Os scripts de integração criam usuários para exercitar papéis e escopo.
 * Eles limpam o que dá, mas não a si mesmos: um usuário que fez check-in
 * ou cancelou um convite vira `ator_id` de uma linha de auditoria, e a
 * auditoria é imutável por gatilho — a exclusão em cascata é recusada.
 *
 * O resíduo não é cosmético. São contas **ativas**, algumas com papel
 * `admin`, num banco que preview e produção compartilham. As de papel
 * `colaborador` e `recepcao` ainda aceitam login por CPF e data de
 * nascimento, e as datas usadas nos testes são redondas e previsíveis.
 *
 * Desativar barra o login na requisição seguinte e preserva a trilha. É
 * reversível com um UPDATE, e deve ser rodado depois de cada rodada de
 * integração, antes de qualquer uso sério do ambiente.
 *
 *   npm run usuarios:desativar-teste          # mostra o que faria
 *   npm run usuarios:desativar-teste -- --aplicar
 *
 * **Apagar agora é possível**, desde a migração `0007`, que tirou a chave
 * estrangeira de `palestra_auditoria.ator_id` — era o `ON DELETE SET NULL`
 * dela que colidia com o gatilho de imutabilidade (o parágrafo acima
 * descreve a colisão). Para a limpeza definitiva, com backup em `.sql` e
 * sem tocar em gatilho nenhum, use
 * `scripts/remover-cadastros-de-teste.ts`, que varre usuário, loja e
 * regional na ordem que as chaves estrangeiras exigem. Este script continua
 * sendo o certo para o uso diário: é a higiene entre rodadas, não a faxina.
 */
import { config } from 'dotenv';
import { and, eq, or, like } from 'drizzle-orm';

config({ path: '.env', quiet: true });

/** Prefixos que os scripts de integração usam no nome. */
const PREFIXOS = ['[TESTE-%', '[SMOKE-%'];

async function principal() {
  const aplicar = process.argv.includes('--aplicar');

  const { db, fecharConexoes } = await import('@/lib/db');
  const { user } = await import('@/lib/db/schema');
  const { registrarAuditoria, ACOES, ATOR_DE_SCRIPT } = await import(
    '@/lib/palestras/auditoria'
  );

  try {
    const filtro = and(
      eq(user.ativo, true),
      or(...PREFIXOS.map((p) => like(user.name, p))),
    );

    const alvos = await db()
      .select({ id: user.id, nome: user.name, papel: user.papel })
      .from(user)
      .where(filtro);

    if (alvos.length === 0) {
      console.log('Nenhum usuário de teste ativo. Nada a fazer.');
      return;
    }

    console.log(`${alvos.length} usuário(s) de teste ativo(s):`);
    for (const a of alvos) console.log(`  ${a.papel.padEnd(18)} ${a.nome}`);

    const admins = alvos.filter((a) => a.papel === 'admin').length;
    if (admins > 0) {
      console.log(`\n  ${admins} deles com papel admin.`);
    }

    if (!aplicar) {
      console.log('\nNada foi alterado. Rode com --aplicar para desativar.');
      return;
    }

    await db().update(user).set({ ativo: false, updatedAt: new Date() }).where(filtro);

    for (const a of alvos) {
      await registrarAuditoria({
        ator: ATOR_DE_SCRIPT,
        acao: ACOES.usuarioDesativado,
        entidade: 'user',
        entidadeId: a.id,
        dados: { motivo: 'usuário de teste', origem: 'scripts/desativar-usuarios-de-teste.ts' },
      });
    }

    console.log(`\n${alvos.length} usuário(s) desativado(s).`);
    console.log('Rodar os scripts de integração de novo recria ou reativa.');
  } finally {
    await fecharConexoes();
  }
}

principal().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
