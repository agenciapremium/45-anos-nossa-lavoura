import type { Metadata } from 'next';
import Link from 'next/link';
import { count, eq } from 'drizzle-orm';

import { CabecalhoDeTela } from '@/components/palestras/cabecalho-de-tela';
import { AbaSegmentada, AbasSegmentadas, LinkBotao, Vazio } from '@/components/ui';
import { db } from '@/lib/db';
import { convite } from '@/lib/db/schema';
import { contextoDePalestra } from '@/lib/palestras/contexto-de-palestra';
import {
  listarColaboradoresParaGeracao,
  listarLojas,
  listarPalestras,
  listarRegionais,
} from '@/lib/palestras/consultas';
import { exigirPapel } from '@/lib/palestras/sessao';
import { agora, formatarDataCurta, formatarHorario, mesmoDiaCivil, venceu } from '@/lib/tempo';
import { FormularioDeGeracao, type PalestraDisponivel } from './formulario';
import { FormularioAvulso } from './formulario-avulso';

export const metadata: Metadata = { title: 'Gerar convites' };
export const dynamic = 'force-dynamic';

/* =========================================================
   /palestras/admin/gerar · dois modos de geração (tarefa 4.1)

   O modo vem da URL (`?modo=avulso`), não de estado de cliente: as abas
   são links, o servidor decide qual formulário montar, e cada modo tem
   endereço próprio para compartilhar e para voltar depois. É o mesmo
   padrão das abas de `painel/metricas`.

   Consequência que o mockup já previa: a lista de colaboradores vazia
   **não** é mais um `Vazio` que toma a tela inteira. Sem loja cadastrada
   (situação de hoje, depois da limpeza da estrutura), o modo por
   colaborador não tem destinatário, e o aviso passa a ficar dentro da aba
   dele — a aba avulsa continua utilizável, que é justamente o caminho que
   não depende da rede de lojas.
   ========================================================= */

type Filtros = { palestra?: string; modo?: string };

export default async function Gerar({
  searchParams,
}: {
  searchParams: Promise<Filtros>;
}) {
  const { escopo } = await exigirPapel(['admin']);
  const f = await searchParams;
  const modoAvulso = f.modo === 'avulso';

  const [palestras, colaboradores, regionais, lojas, contexto] = await Promise.all([
    listarPalestras(),
    listarColaboradoresParaGeracao(escopo, {}),
    listarRegionais(escopo),
    listarLojas(escopo),
    contextoDePalestra(f.palestra),
  ]);

  const referencia = agora();
  const ativas = palestras.filter((p) => p.ativo);

  /*
   * Quantos convites cada colaborador já tem na palestra escolhida. Sem esse
   * número, o Admin não tem como saber se já gerou, e gerar de novo dobra
   * os convites em vez de somar.
   */
  const eventoEscolhido =
    f.palestra ?? ativas.find((p) => !venceu(p.prazoConfirmacao))?.id;

  const jaTemPorColaborador = new Map<string, number>();
  if (!modoAvulso && eventoEscolhido && colaboradores.length) {
    const linhas = await db()
      .select({ colaboradorId: convite.colaboradorId, total: count() })
      .from(convite)
      .where(eq(convite.eventoId, eventoEscolhido))
      .groupBy(convite.colaboradorId);
    for (const l of linhas) {
      // Convite avulso (`colaboradorId` nulo) não é de nenhum colaborador
      // desta lista: fica fora da contagem "já tem" por colaborador.
      if (!l.colaboradorId) continue;
      jaTemPorColaborador.set(l.colaboradorId, Number(l.total));
    }
  }

  const palestrasParaFormulario: PalestraDisponivel[] = ativas.map((p) => {
    const prazoVencido = venceu(p.prazoConfirmacao, referencia);
    const prazoVenceHoje =
      !prazoVencido && mesmoDiaCivil(p.prazoConfirmacao, referencia);
    const sufixo = prazoVencido
      ? ' · prazo encerrado'
      : prazoVenceHoje
        ? ' · prazo vence hoje'
        : '';
    return {
      id: p.id,
      rotulo: `${p.cidade} · ${formatarDataCurta(p.dataHora)}${sufixo}`,
      rotuloResumo: `${p.cidade} · ${formatarDataCurta(p.dataHora)}`,
      prazoVencido,
      prazoVenceHoje,
      prazoFormatado: formatarHorario(p.prazoConfirmacao),
    };
  });

  // A palestra do contexto só entra pré-escolhida no modo avulso se ainda
  // aceitar convites: pré-selecionar uma palestra com prazo vencido seria
  // convidar a uma recusa.
  const palestraDoContexto = contexto.atual;
  const palestraPadraoId =
    palestraDoContexto &&
    palestrasParaFormulario.some((p) => p.id === palestraDoContexto.id && !p.prazoVencido)
      ? palestraDoContexto.id
      : null;

  function comModo(modo: string | undefined): string {
    const params = new URLSearchParams();
    if (f.palestra) params.set('palestra', f.palestra);
    if (modo) params.set('modo', modo);
    const texto = params.toString();
    return `/palestras/admin/gerar${texto ? `?${texto}` : ''}`;
  }

  return (
    <>
      <CabecalhoDeTela
        sobrancelha="Administração · convites"
        titulo="Gerar convites"
        acao={
          palestraDoContexto ? (
            <LinkBotao
              href={`/palestras/admin/gerar/lotes?palestra=${palestraDoContexto.id}`}
              variante="contorno"
              tamanho="sm"
            >
              Ver lotes avulsos
            </LinkBotao>
          ) : undefined
        }
      />

      <AbasSegmentadas className="mb-5">
        <AbaSegmentada href={comModo(undefined)} ativo={!modoAvulso}>
          Por colaborador
        </AbaSegmentada>
        <AbaSegmentada href={comModo('avulso')} ativo={modoAvulso}>
          Avulso
        </AbaSegmentada>
      </AbasSegmentadas>

      <p className="mt-0 mb-6 max-w-prosa font-corpo text-corpo-lg text-texto">
        {modoAvulso
          ? 'Convites sem colaborador de origem, gerados direto pela administração: imprensa, patrocinador, autoridade, convidado do Grupo. Cada um recebe um código de 6 caracteres e nasce disponível, como qualquer outro.'
          : 'Uma operação cobre vários colaboradores com quantidades diferentes na mesma palestra. Cada convite recebe um código de 6 caracteres e nasce disponível.'}
      </p>

      {ativas.length === 0 ? (
        <Vazio titulo="Nenhuma palestra ativa.">
          <p>Cadastre e ative ao menos uma palestra antes de gerar convites.</p>
        </Vazio>
      ) : modoAvulso ? (
        <FormularioAvulso
          palestras={palestrasParaFormulario}
          palestraPadraoId={palestraPadraoId}
        />
      ) : colaboradores.length === 0 ? (
        <Vazio titulo="Nenhum colaborador cadastrado.">
          <p>
            Só entram aqui usuários ativos com papel{' '}
            <code className="font-mono">colaborador</code> e loja vinculada. Importe a base pela{' '}
            <Link
              href="/palestras/admin/importar"
              className="font-bold underline underline-offset-4"
            >
              tela de importação
            </Link>
            .
          </p>
          <p>
            Enquanto a rede de lojas não estiver cadastrada, use a aba{' '}
            <Link href={comModo('avulso')} className="font-bold underline underline-offset-4">
              Avulso
            </Link>
            : ela gera convites sem vínculo com colaborador nem regional.
          </p>
        </Vazio>
      ) : (
        <FormularioDeGeracao
          palestras={palestrasParaFormulario}
          colaboradores={colaboradores.map((c) => ({
            id: c.id,
            nome: c.nome,
            lojaId: c.lojaId,
            lojaCodigo: c.lojaCodigo,
            lojaNome: c.lojaNome,
            regionalId: c.regionalId,
            regionalNome: c.regionalNome,
            jaTem: jaTemPorColaborador.get(c.id) ?? 0,
          }))}
          regionais={regionais.map((r) => ({ id: r.id, nome: r.nome }))}
          lojas={lojas.map((l) => ({
            id: l.id,
            nome: l.nome,
            codigo: l.codigo,
            regionalId: l.regionalId,
          }))}
        />
      )}
    </>
  );
}
