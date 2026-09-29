import type { Metadata } from 'next';

import { CabecalhoDeTela } from '@/components/palestras/cabecalho-de-tela';
import { Cartao, LinkBotao, Selo, Tabela, Cabecalho, Celula, CelulaDeTitulo, TituloDoCartao, Vazio } from '@/components/ui';
import { contextoDePalestra } from '@/lib/palestras/contexto-de-palestra';
import {
  listaDeImpressao,
  resumoNoEscopo,
  resumoPorLoja,
  totalDePessoasEsperadas,
  type ResumoDeContagem,
} from '@/lib/palestras/dados';
import { permitido, type Escopo } from '@/lib/palestras/escopo';
import { exigirPapel } from '@/lib/palestras/sessao';
import { calcularTaxas, formatarTaxa, totalGerados } from '@/lib/palestras/taxas';
import { agora, formatarData, formatarHorario, mesmoDiaCivil, noFusoDoEvento, venceu } from '@/lib/tempo';

export const metadata: Metadata = {
  title: 'Relatórios',
  robots: { index: false, follow: false, nocache: true },
};
export const dynamic = 'force-dynamic';

const MESES_ABREVIADOS = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez',
];

/* =========================================================
   /palestras/relatorios (tarefa 6.1)

   A palestra em contexto vem da barra de topo (`contextoDePalestra`, D2 do
   design), como em `painel/convites` e `painel/metricas`: esta tela
   deixa de ter o próprio seletor por formulário. Os números continuam
   vindo de `resumoNoEscopo`/`resumoPorLoja`, sem mudança nenhuma de
   consulta ou de Server Action: só a apresentação muda.
   ========================================================= */
export default async function PaginaDeRelatorios({
  searchParams,
}: {
  searchParams: Promise<{ palestra?: string }>;
}) {
  const atual = await exigirPapel(['admin', 'gerente_regional', 'gerente_loja', 'recepcao']);
  const { escopo } = atual;
  const { palestra } = await searchParams;

  const { atual: palestraAtual } = await contextoDePalestra(palestra);

  if (!palestraAtual) {
    return (
      <>
        <CabecalhoDeTela sobrancelha="Painel" titulo="Relatórios" />
        <Vazio titulo="Nenhuma palestra ativa">
          <p className="m-0">
            Assim que a administração cadastrar uma palestra, os relatórios aparecem aqui.
          </p>
        </Vazio>
      </>
    );
  }

  const podeExportarCsv = permitido(escopo, 'exportarCsv');
  const referencia = agora();

  return (
    <>
      <CabecalhoDeTela
        sobrancelha="Painel"
        titulo="Relatórios"
        acao={
          <LinkBotao
            href={`/palestras/relatorios/lista?palestra=${palestraAtual.id}`}
            tamanho="sm"
          >
            Lista para impressão
          </LinkBotao>
        }
      />

      <HeroDaPalestra palestra={palestraAtual} referencia={referencia} />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="flex flex-col gap-6 lg:col-span-3">
          {escopo.papel === 'recepcao' ? (
            <Cartao superficie="interna">
              <TituloDoCartao>Números e exportação são de gerentes e do Admin</TituloDoCartao>
              <p className="m-0 mt-2 font-corpo text-corpo text-texto-suave">
                A recepção usa a lista impressa ou o leitor de QR como contingência da
                porta. Os números do escopo e a exportação em CSV ficam com quem
                gerencia o circuito.
              </p>
            </Cartao>
          ) : (
            <NumerosDaPalestra escopo={escopo} eventoId={palestraAtual.id} papel={escopo.papel} />
          )}
        </div>

        <div className="flex flex-col gap-6 lg:col-span-2">
          <Cartao superficie="interna">
            <TituloDoCartao>Lista para impressão</TituloDoCartao>
            <p className="m-0 mt-2 mb-4 font-corpo text-corpo text-texto-suave">
              A4 retrato, uma linha por confirmado, com quadradinho de presença para
              marcar à mão. É a contingência da porta quando a internet cai.
            </p>
            <ul className="m-0 mb-4 list-disc pl-5 font-corpo text-corpo text-texto-suave">
              <li>Nº, titular, CPF mascarado, acompanhante</li>
              <li>Loja e colaborador de origem</li>
              <li>Total de confirmados e total de pessoas</li>
              <li>Data de geração e paginação no rodapé</li>
            </ul>
            <LinkBotao
              href={`/palestras/relatorios/lista?palestra=${palestraAtual.id}`}
              variante="claro"
              tamanho="sm"
            >
              Abrir para imprimir
            </LinkBotao>
          </Cartao>

          {podeExportarCsv ? (
            <Cartao superficie="interna">
              <TituloDoCartao>Exportação em CSV</TituloDoCartao>
              <p className="m-0 mt-2 mb-4 font-corpo text-corpo text-texto-suave">
                Traz o dado completo da confirmação, inclusive WhatsApp, cidade,
                propriedade e atividade, para trabalhar em planilha.
              </p>
              <LinkBotao
                href={`/palestras/relatorios/csv?palestra=${palestraAtual.id}`}
                variante="contorno"
                tamanho="sm"
              >
                Baixar CSV desta palestra
              </LinkBotao>
            </Cartao>
          ) : null}

          {escopo.papel === 'admin' ? (
            <Cartao superficie="interna" className="bg-superficie-alt">
              <TituloDoCartao>Toda geração fica registrada</TituloDoCartao>
              <p className="m-0 mt-2 mb-3 font-corpo text-corpo text-texto-suave">
                Imprimir a lista e exportar o CSV entram no rastro de auditoria, com
                quem pediu, quando e quantas linhas saíram.
              </p>
              <LinkBotao href="/palestras/admin/auditoria" variante="texto" tamanho="sm">
                Ver o rastro
              </LinkBotao>
            </Cartao>
          ) : null}
        </div>
      </div>
    </>
  );
}

function situacaoDaPalestra(
  palestra: { dataHora: Date },
  referencia: Date,
): string {
  if (palestra.dataHora.getTime() < referencia.getTime()) return 'Realizada';
  if (mesmoDiaCivil(palestra.dataHora, referencia)) {
    return `Hoje · abre às ${formatarHorario(palestra.dataHora)}`;
  }
  return `Em ${formatarData(palestra.dataHora)}`;
}

function HeroDaPalestra({
  palestra,
  referencia,
}: {
  palestra: {
    cidade: string;
    dataHora: Date;
    localNome: string;
    localEndereco: string;
    prazoConfirmacao: Date;
  };
  referencia: Date;
}) {
  const noFuso = noFusoDoEvento(palestra.dataHora);
  const dia = String(noFuso.getDate()).padStart(2, '0');
  const mes = MESES_ABREVIADOS[noFuso.getMonth()];
  const prazoVencido = venceu(palestra.prazoConfirmacao, referencia);

  return (
    <section className="mb-6 flex flex-wrap items-center gap-6 rounded-cartao bg-inverso-fundo px-6 py-6 text-texto-inverso sm:px-7">
      <div className="flex-none rounded-cartao bg-lima-500 px-4 py-3 text-center">
        <p className="m-0 font-corpo text-t2 font-bold leading-none text-texto-forte">{dia}</p>
        <p className="m-0 mt-1 font-corpo text-corpo-sm font-bold uppercase tracking-rotulo text-texto-forte">
          {mes}
        </p>
      </div>

      <div className="min-w-0 flex-1">
        <p className="m-0 font-corpo text-rotulo font-bold uppercase tracking-sobrancelha text-lima-500">
          {situacaoDaPalestra(palestra, referencia)}
        </p>
        <h2 className="mt-1 mb-0 font-titulo text-t2 font-bold leading-justo tracking-destaque text-texto-inverso">
          {palestra.cidade}
        </h2>
        <p className="mt-2 mb-0 font-corpo text-corpo font-bold text-texto-inverso">
          {palestra.localNome}
        </p>
        <p className="mt-1 mb-0 font-corpo text-corpo-sm text-texto-inverso-suave">
          {palestra.localEndereco} · Confirmações {prazoVencido ? 'encerradas em' : 'até'}{' '}
          {formatarData(palestra.prazoConfirmacao)}
        </p>
      </div>
    </section>
  );
}

async function NumerosDaPalestra({
  escopo,
  eventoId,
  papel,
}: {
  escopo: Escopo;
  eventoId: string;
  papel: string;
}) {
  const total = await resumoNoEscopo(escopo, eventoId);
  const porLoja =
    papel === 'admin' || papel === 'gerente_regional'
      ? await resumoPorLoja(escopo, { eventoId })
      : null;

  // Mesma conta da lista impressa (tarefa 6.2), reaproveitada aqui em vez
  // de repetida (tarefa 6.7): quem chega a este componente sempre tem
  // alcance de `listaImpressaECsv`, porque é o mesmo grupo de papéis que a
  // recepção exclui logo antes de `NumerosDaPalestra` ser chamado.
  const linhasDeImpressao = await listaDeImpressao(escopo, eventoId);
  const totalDePessoas = totalDePessoasEsperadas(linhasDeImpressao);

  return (
    <>
      <Cartao superficie="interna">
        <TituloDoCartao>Números desta palestra, no seu escopo</TituloDoCartao>
        <ContagemPorEstado resumo={total} />
        <p className="m-0 mt-3 font-corpo text-corpo text-texto-suave">
          Total de pessoas esperadas (titulares e acompanhantes):{' '}
          <strong className="text-texto-forte">{totalDePessoas}</strong>
        </p>
        <DefinicaoDasTaxas resumo={total} />
      </Cartao>

      {porLoja ? (
        <Cartao superficie="interna">
          <TituloDoCartao>Por loja</TituloDoCartao>
          {porLoja.length === 0 ? (
            <p className="m-0 mt-2 font-corpo text-corpo text-texto-suave">
              Nenhuma loja com convites nesta palestra, no seu escopo.
            </p>
          ) : (
            <Tabela superficie="interna" className="mt-3">
              <Cabecalho superficie="interna">
                <tr>
                  <CelulaDeTitulo>Loja</CelulaDeTitulo>
                  <CelulaDeTitulo className="text-right">Gerados</CelulaDeTitulo>
                  <CelulaDeTitulo className="text-right">Confirmados</CelulaDeTitulo>
                  <CelulaDeTitulo className="text-right">Taxa</CelulaDeTitulo>
                </tr>
              </Cabecalho>
              <tbody>
                {porLoja.map((l) => {
                  const taxa = calcularTaxas(l.resumo).confirmacao;
                  return (
                    <tr key={l.lojaId}>
                      <Celula className="font-bold text-texto-forte">
                        {l.lojaCodigo} · {l.lojaNome}
                      </Celula>
                      <Celula className="text-right tabular-nums">
                        {totalGerados(l.resumo)}
                      </Celula>
                      <Celula className="text-right font-bold tabular-nums text-texto-forte">
                        {l.resumo.confirmado + l.resumo.presente}
                      </Celula>
                      <Celula className="text-right tabular-nums">{formatarTaxa(taxa)}</Celula>
                    </tr>
                  );
                })}
              </tbody>
            </Tabela>
          )}
        </Cartao>
      ) : null}
    </>
  );
}

function ContagemPorEstado({ resumo }: { resumo: ResumoDeContagem }) {
  return (
    <ul className="m-0 mt-3 flex list-none flex-wrap gap-1.5 p-0">
      <li>
        <Selo tom="neutro">{totalGerados(resumo)} gerados</Selo>
      </li>
      <li>
        <Selo tom="neutro">{resumo.disponivel} disponíveis</Selo>
      </li>
      <li>
        <Selo tom="positivo">{resumo.confirmado} confirmados</Selo>
      </li>
      <li>
        <Selo tom="acento">{resumo.presente} presentes</Selo>
      </li>
      <li>
        <Selo tom="negativo">{resumo.cancelado} cancelados</Selo>
      </li>
      <li>
        <Selo tom="atencao">{resumo.expirado} expirados</Selo>
      </li>
    </ul>
  );
}

/**
 * Tarefa 6.1: a definição de cada taxa fica escrita na tela, para não
 * haver dúvida sobre o que entra no denominador, em especial que os
 * cancelados continuam dentro do total de gerados.
 */
function DefinicaoDasTaxas({ resumo }: { resumo: ResumoDeContagem }) {
  const taxas = calcularTaxas(resumo);
  return (
    <div className="mt-4 grid gap-2 border-t border-linha pt-3 sm:grid-cols-2">
      <p className="m-0 font-corpo text-corpo-sm text-texto-suave">
        Taxa de confirmação (confirmados dividido por gerados, com os cancelados
        dentro de gerados):{' '}
        <strong className="text-texto-forte">{formatarTaxa(taxas.confirmacao)}</strong>
      </p>
      <p className="m-0 font-corpo text-corpo-sm text-texto-suave">
        Taxa de comparecimento (presentes dividido por confirmados):{' '}
        <strong className="text-texto-forte">{formatarTaxa(taxas.comparecimento)}</strong>
      </p>
    </div>
  );
}
