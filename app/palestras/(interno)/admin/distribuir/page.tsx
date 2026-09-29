import type { Metadata } from 'next';
import { and, eq, inArray } from 'drizzle-orm';

import { CabecalhoDeTela } from '@/components/palestras/cabecalho-de-tela';
import { Vazio } from '@/components/ui';
import { db } from '@/lib/db';
import { convite, evento } from '@/lib/db/schema';
import {
  listarColaboradoresParaGeracao,
  listarLojas,
  listarPalestras,
  listarRegionais,
} from '@/lib/palestras/consultas';
import { estadoEfetivo } from '@/lib/palestras/estado-do-convite';
import { LIMITE_POR_LOTE } from '@/lib/palestras/pdf/limites';
import { exigirPapel } from '@/lib/palestras/sessao';
import { agora, formatarDataCurta } from '@/lib/tempo';
import { PainelDeDistribuicao, type LinhaDeDistribuicao } from './painel';

export const metadata: Metadata = { title: 'PDFs de distribuição' };
export const dynamic = 'force-dynamic';

export default async function Distribuir() {
  const { escopo } = await exigirPapel(['admin']);

  const [palestras, colaboradores, regionais, lojas] = await Promise.all([
    listarPalestras(),
    listarColaboradoresParaGeracao(escopo, {}),
    listarRegionais(escopo),
    listarLojas(escopo),
  ]);

  const ativas = palestras.filter((p) => p.ativo);

  /*
   * Contagem de disponíveis por colaborador e palestra, com a expiração
   * avaliada na leitura: um convite cujo prazo venceu não conta, mesmo que o
   * cron ainda não tenha rodado.
   */
  const disponiveis = new Map<string, Record<string, number>>();
  if (ativas.length && colaboradores.length) {
    const linhas = await db()
      .select({
        colaboradorId: convite.colaboradorId,
        eventoId: convite.eventoId,
        estado: convite.estado,
        prazo: evento.prazoConfirmacao,
      })
      .from(convite)
      .innerJoin(evento, eq(evento.id, convite.eventoId))
      .where(
        and(
          eq(convite.estado, 'disponivel'),
          inArray(
            convite.eventoId,
            ativas.map((p) => p.id),
          ),
        ),
      );

    const referencia = agora();
    for (const l of linhas) {
      if (
        estadoEfetivo(l.estado as never, new Date(l.prazo), referencia) !==
        'disponivel'
      ) {
        continue;
      }
      const atual = disponiveis.get(l.colaboradorId) ?? {};
      atual[l.eventoId] = (atual[l.eventoId] ?? 0) + 1;
      disponiveis.set(l.colaboradorId, atual);
    }
  }

  const linhas: LinhaDeDistribuicao[] = colaboradores.map((c) => ({
    colaboradorId: c.id,
    nome: c.nome,
    lojaId: c.lojaId,
    lojaCodigo: c.lojaCodigo,
    lojaNome: c.lojaNome,
    regionalId: c.regionalId,
    regionalNome: c.regionalNome,
    disponiveisPorPalestra: disponiveis.get(c.id) ?? {},
  }));

  return (
    <>
      <CabecalhoDeTela sobrancelha="Administração · distribuição" titulo="PDFs de distribuição" />

      <p className="mt-0 mb-6 max-w-prosa font-corpo text-corpo-lg text-texto">
        Um PDF por colaborador, com os convites disponíveis no momento da
        geração, o endereço em texto puro e o botão “Enviar via WhatsApp” já
        com a mensagem da palestra. Nada é armazenado: o arquivo é montado na
        hora.
      </p>

      {ativas.length === 0 ? (
        <Vazio titulo="Nenhuma palestra ativa." />
      ) : colaboradores.length === 0 ? (
        <Vazio titulo="Nenhum colaborador cadastrado." />
      ) : (
        <PainelDeDistribuicao
          palestras={ativas.map((p) => ({
            id: p.id,
            rotulo: `${p.cidade} · ${formatarDataCurta(p.dataHora)}`,
          }))}
          regionais={regionais.map((r) => ({ id: r.id, nome: r.nome }))}
          lojas={lojas.map((l) => ({
            id: l.id,
            nome: l.nome,
            codigo: l.codigo,
            regionalId: l.regionalId,
          }))}
          linhas={linhas}
          limitePorLote={LIMITE_POR_LOTE}
        />
      )}
    </>
  );
}
