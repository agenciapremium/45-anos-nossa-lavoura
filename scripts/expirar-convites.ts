/**
 * Executa a rotina de expiração pela linha de comando.
 *
 * Existe para o caso previsto no design: se o plano da Vercel não permitir
 * cron diário, a consolidação passa a ser acionada à mão.
 *
 *   npm run expirar-convites
 */
import { config } from 'dotenv';

config({ path: '.env', quiet: true });

async function main() {
  const { expirarConvitesVencidos } = await import('@/lib/palestras/expiracao');
  const { limparLimitesAntigos } = await import('@/lib/palestras/limite');
  const { fecharConexoes } = await import('@/lib/db');
  try {
    const r = await expirarConvitesVencidos();
    console.log(
      `Convites expirados: ${r.atualizados} (${r.duracaoMs} ms, ${r.executadoEm})`,
    );
    const limites = await limparLimitesAntigos();
    console.log(`Linhas de limite antigas removidas: ${limites}`);
  } catch (erro) {
    console.error('Falha na rotina de expiração:', erro);
    process.exitCode = 1;
  } finally {
    await fecharConexoes();
  }
}

void main();
