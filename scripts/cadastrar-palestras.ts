/**
 * Cadastra as quatro palestras do Circuito Acelera no Campo 3.0.
 *
 * Os dados são os do PRD (seção "As quatro palestras"). O prazo NÃO é
 * digitado: é calculado pelo mesmo `prazoPadrao` que a tela usa, e o script
 * confere o resultado contra o que o PRD publicou. Se a conta divergir, o
 * script falha em vez de gravar.
 *
 * Idempotente pelo slug: rodar de novo atualiza em vez de duplicar.
 *
 *   npx tsx scripts/cadastrar-palestras.ts
 */
import { config } from 'dotenv';
import { eq } from 'drizzle-orm';

config({ path: '.env', quiet: true });

const PALESTRAS = [
  {
    cidade: 'Vilhena',
    dataHoraLocal: '2026-10-13T19:00',
    localNome: 'Degustare Restaurante',
    localEndereco: 'Av. Major Amarante, 4360',
    prazoEsperado: '12/10/2026 às 23h59',
  },
  {
    cidade: "Espigão d'Oeste",
    dataHoraLocal: '2026-10-14T19:00',
    localNome: 'Casarão Eventos e Reuniões',
    localEndereco: 'Av. 7 de Setembro, 145',
    prazoEsperado: '13/10/2026 às 23h59',
  },
  {
    cidade: 'Ji-Paraná',
    dataHoraLocal: '2026-10-15T19:00',
    localNome: 'Espaço Imagem Eventos',
    localEndereco: 'Av. JK, 1711, Casa Preta',
    prazoEsperado: '14/10/2026 às 23h59',
  },
  {
    cidade: 'Porto Velho',
    dataHoraLocal: '2026-10-17T10:30',
    localNome: 'Restaurante O Compadre',
    localEndereco: 'BR 364, Km 04',
    prazoEsperado: '16/10/2026 às 23h59',
  },
];

async function main() {
  const { db, fecharConexoes } = await import('@/lib/db');
  const { evento } = await import('@/lib/db/schema');
  const { MENSAGEM_PADRAO_WHATSAPP } = await import('@/lib/palestras/mensagem');
  const { slugDePalestra, slugDisponivel } = await import(
    '@/lib/palestras/slug'
  );
  const { deHoraLocal, formatarData, formatarDataHora, prazoPadrao } =
    await import('@/lib/tempo');
  const { registrarAuditoria, ACOES, ATOR_DE_SCRIPT } = await import(
    '@/lib/palestras/auditoria'
  );

  try {
    const existentes = await db()
      .select({ id: evento.id, slug: evento.slug })
      .from(evento);
    const slugs = existentes.map((e) => e.slug);

    for (const p of PALESTRAS) {
      const dataHora = deHoraLocal(p.dataHoraLocal);
      const prazo = prazoPadrao(dataHora);
      const prazoFormatado = formatarDataHora(prazo);

      if (prazoFormatado !== p.prazoEsperado) {
        throw new Error(
          `Prazo calculado para ${p.cidade} (${prazoFormatado}) não bate com o do PRD (${p.prazoEsperado}).`,
        );
      }

      const slugBase = slugDePalestra(p.cidade, formatarData(dataHora));
      const ja = existentes.find((e) => e.slug === slugBase);

      const valores = {
        cidade: p.cidade,
        dataHora,
        localNome: p.localNome,
        localEndereco: p.localEndereco,
        prazoConfirmacao: prazo,
        prazoAjustadoManualmente: false,
        mensagemWhatsapp: MENSAGEM_PADRAO_WHATSAPP,
        ativo: true,
        atualizadoEm: new Date(),
      };

      if (ja) {
        await db().update(evento).set(valores).where(eq(evento.id, ja.id));
        console.log(`atualizada  ${p.cidade.padEnd(18)} prazo ${prazoFormatado}`);
      } else {
        const slug = slugDisponivel(slugBase, slugs);
        slugs.push(slug);
        const [criada] = await db()
          .insert(evento)
          .values({ ...valores, slug })
          .returning({ id: evento.id });
        await registrarAuditoria({
          ator: ATOR_DE_SCRIPT,
          acao: ACOES.palestraCriada,
          entidade: 'palestra_evento',
          entidadeId: criada?.id ?? null,
          dados: { slug, cidade: p.cidade, origem: 'script de cadastro' },
        });
        console.log(`criada      ${p.cidade.padEnd(18)} prazo ${prazoFormatado}`);
      }
    }

    console.log('\nAs quatro palestras do circuito estão cadastradas.');
  } catch (erro) {
    console.error('Falha ao cadastrar:', erro);
    process.exitCode = 1;
  } finally {
    await fecharConexoes();
  }
}

void main();
