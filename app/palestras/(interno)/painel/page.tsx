import Link from 'next/link';

import { CabecalhoDeTela } from '@/components/palestras/cabecalho-de-tela';
import {
  Cartao,
  LinkBotao,
  Selo,
  Subtitulo,
  TituloDoCartao,
  Vazio,
} from '@/components/ui';
import type { Evento } from '@/lib/db/schema';
import { listarPalestrasAtivas } from '@/lib/palestras/consultas';
import {
  confirmacoesNoEscopo,
  convitesNoEscopo,
  resumoNoEscopo,
  totalDeUsuariosNoEscopo,
  type ResumoDeContagem,
} from '@/lib/palestras/dados';
import type { Escopo } from '@/lib/palestras/escopo';
import { ROTULO_DO_PAPEL, alcanceDe, type AcaoProtegida } from '@/lib/palestras/papeis';
import { exigirEscopo } from '@/lib/palestras/sessao';
import { totalGerados } from '@/lib/palestras/taxas';
import {
  agora,
  formatarCarimbo,
  formatarData,
  formatarDataCurta,
  formatarHorario,
  mesmoDiaCivil,
  venceu,
} from '@/lib/tempo';

export const dynamic = 'force-dynamic';

/* =========================================================
   /palestras/painel · início por papel (3.1 das tasks)

   Os números já vêm filtrados pelo escopo (`lib/palestras/dados.ts`): o
   gerente de loja vê os convites da loja dele, o gerente regional os da
   regional, o colaborador os próprios. O Admin vê tudo, mas o lugar dele é
   a administração (`painelInicial` já manda ele para lá; esta tela só
   continua funcionando se ele digitar o endereço).

   Os atalhos saem da matriz de permissões, não de uma lista escrita à mão
   (mesmo padrão do menu lateral, D3). O selo "em breve" que existia para
   Relatórios e Check-in saiu: as duas telas existem desde `operacao-evento`.
   ========================================================= */

type Atalho = {
  acao: AcaoProtegida;
  href: string;
  rotulo: string;
  descricao: string;
};

const ATALHOS: Atalho[] = [
  {
    acao: 'cadastrarPalestras',
    href: '/palestras/admin',
    rotulo: 'Administração',
    descricao: 'Palestras, estrutura, importação, geração e PDFs.',
  },
  {
    acao: 'verConvitesEConfirmacoes',
    href: '/palestras/painel/convites',
    rotulo: 'Convites',
    descricao: 'Links por palestra e estado, com envio e cancelamento.',
  },
  {
    acao: 'listaImpressaECsv',
    href: '/palestras/relatorios',
    rotulo: 'Relatórios',
    descricao: 'Lista para impressão e exportação em CSV.',
  },
  {
    acao: 'fazerCheckin',
    href: '/palestras/checkin',
    rotulo: 'Check-in',
    descricao: 'Leitura do QR e busca manual no dia da palestra.',
  },
];

const PAPEIS_COM_EQUIPE: ReadonlyArray<Escopo['papel']> = [
  'admin',
  'gerente_regional',
  'gerente_loja',
];

function descricaoDoEscopo(escopo: Escopo): string {
  switch (escopo.papel) {
    case 'admin':
      return 'Você enxerga todas as regionais e lojas do circuito.';
    case 'gerente_regional':
      return 'Você enxerga os convites e confirmações das lojas da sua regional.';
    case 'gerente_loja':
      return 'Você enxerga os convites e confirmações da sua loja.';
    case 'colaborador':
      return 'Convites pessoais e intransferíveis: envie pelo WhatsApp ou copie o link, o convidado escolhe o contato.';
    case 'recepcao':
      return 'Você atende a portaria: titular, acompanhante e CPF mascarado.';
  }
}

/** Chip de situação de uma palestra, a partir da data e do prazo. */
function situacaoDaPalestra(
  palestra: Pick<Evento, 'dataHora' | 'prazoConfirmacao'>,
  referencia: Date,
): { rotulo: string; tom: 'positivo' | 'atencao' | 'neutro' } {
  if (palestra.dataHora.getTime() < referencia.getTime()) {
    return { rotulo: 'Realizada', tom: 'neutro' };
  }
  if (mesmoDiaCivil(palestra.dataHora, referencia)) {
    return { rotulo: `É hoje, às ${formatarHorario(palestra.dataHora)}`, tom: 'positivo' };
  }
  if (venceu(palestra.prazoConfirmacao, referencia)) {
    return { rotulo: 'Prazo de confirmação encerrado', tom: 'neutro' };
  }
  if (mesmoDiaCivil(palestra.prazoConfirmacao, referencia)) {
    return { rotulo: 'Prazo de confirmação vence hoje', tom: 'atencao' };
  }
  return { rotulo: `Palestra em ${formatarData(palestra.dataHora)}`, tom: 'neutro' };
}

export default async function Painel() {
  const atual = await exigirEscopo();
  const { escopo } = atual;
  const primeiroNome = atual.nome.trim().split(/\s+/)[0] ?? atual.nome;

  const palestras = await listarPalestrasAtivas();
  const referencia = agora();

  const podeVerNumeros = alcanceDe(escopo.papel, 'verConvitesEConfirmacoes') !== 'nenhum';

  const resumos = podeVerNumeros
    ? await Promise.all(
        palestras.map(async (p) => ({
          palestra: p,
          resumo: await resumoNoEscopo(escopo, p.id),
        })),
      )
    : [];

  const totalDoEscopo: ResumoDeContagem = resumos.reduce(
    (acc, { resumo }) => {
      for (const chave of Object.keys(acc) as (keyof ResumoDeContagem)[]) {
        acc[chave] += resumo[chave];
      }
      return acc;
    },
    { disponivel: 0, confirmado: 0, presente: 0, expirado: 0, cancelado: 0 },
  );
  const geradosNoEscopo = totalGerados(totalDoEscopo);
  const confirmadosNoEscopo = totalDoEscopo.confirmado + totalDoEscopo.presente;
  const percentualConfirmado =
    geradosNoEscopo > 0 ? Math.round((confirmadosNoEscopo / geradosNoEscopo) * 100) : 0;

  const pessoas =
    escopo.papel === 'gerente_regional' || escopo.papel === 'gerente_loja'
      ? await totalDeUsuariosNoEscopo(escopo)
      : null;

  // O colaborador é o único papel com escopo pequeno o bastante (os
  // próprios convites) para valer a pena ler a lista inteira e computar
  // "enviados" e "quem confirmou recentemente" em memória.
  const proprios = escopo.papel === 'colaborador' ? await convitesNoEscopo(escopo) : [];
  const enviados = proprios.filter((c) => c.enviadoPara !== null).length;
  const confirmacoesRecentes =
    escopo.papel === 'colaborador'
      ? (await confirmacoesNoEscopo(escopo))
          .slice()
          .sort((a, b) => b.confirmadoEm.getTime() - a.confirmadoEm.getTime())
          .slice(0, 4)
      : [];

  const atalhos = ATALHOS.filter((a) => alcanceDe(escopo.papel, a.acao) !== 'nenhum');
  const temEquipe = PAPEIS_COM_EQUIPE.includes(escopo.papel);

  const acaoPrincipal =
    escopo.papel === 'colaborador' ? (
      <LinkBotao href="/palestras/painel/convites" variante="primario" tamanho="sm">
        {totalDoEscopo.disponivel > 0 ? `Enviar os ${totalDoEscopo.disponivel}` : 'Ver meus convites'}
      </LinkBotao>
    ) : escopo.papel === 'recepcao' ? (
      <LinkBotao href="/palestras/checkin" variante="primario" tamanho="sm">
        Abrir check-in
      </LinkBotao>
    ) : temEquipe || podeVerNumeros ? (
      <LinkBotao href="/palestras/painel/convites" variante="primario" tamanho="sm">
        Ver convites
      </LinkBotao>
    ) : undefined;

  return (
    <>
      <CabecalhoDeTela
        sobrancelha={ROTULO_DO_PAPEL[escopo.papel]}
        titulo="Início"
        acao={acaoPrincipal}
      />

      <section className="mb-6 rounded-cartao bg-inverso-fundo px-6 py-6 text-texto-inverso sm:px-7">
        <p className="m-0 font-corpo text-rotulo font-bold uppercase tracking-sobrancelha text-lima-500">
          {ROTULO_DO_PAPEL[escopo.papel]}
        </p>
        <h2 className="mt-1 mb-0 font-titulo text-t2 font-bold leading-justo tracking-destaque text-texto-inverso">
          Olá, {primeiroNome}
        </h2>
        <p className="mt-2 mb-0 max-w-prosa font-corpo text-corpo-lg text-texto-inverso-suave">
          {descricaoDoEscopo(escopo)}
        </p>
        {escopo.papel === 'colaborador' ? (
          <div className="mt-4">
            <LinkBotao href="/palestras/painel/convites/pdf" variante="secundario" tamanho="sm">
              Baixar meu PDF
            </LinkBotao>
          </div>
        ) : null}
      </section>

      {podeVerNumeros ? (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Cartao superficie="interna">
            <p className="m-0 font-corpo text-corpo-sm text-texto-suave">
              {escopo.papel === 'colaborador' ? 'Convites recebidos' : 'Convites gerados'}
            </p>
            <p className="m-0 mt-1 font-corpo text-t1 font-bold leading-none text-texto-forte">
              {geradosNoEscopo}
            </p>
          </Cartao>
          {escopo.papel === 'colaborador' ? (
            <Cartao superficie="interna">
              <p className="m-0 font-corpo text-corpo-sm text-texto-suave">Enviados</p>
              <p className="m-0 mt-1 font-corpo text-t1 font-bold leading-none text-texto-forte">
                {enviados}
              </p>
              <p className="m-0 mt-2 font-corpo text-corpo-sm text-texto-suave">
                por anotação sua
              </p>
            </Cartao>
          ) : pessoas !== null ? (
            <Cartao superficie="interna">
              <p className="m-0 font-corpo text-corpo-sm text-texto-suave">Pessoas no escopo</p>
              <p className="m-0 mt-1 font-corpo text-t1 font-bold leading-none text-texto-forte">
                {pessoas}
              </p>
            </Cartao>
          ) : null}
          <Cartao superficie="interna">
            <p className="m-0 font-corpo text-corpo-sm text-texto-suave">Confirmados</p>
            <p className="m-0 mt-1 font-corpo text-t1 font-bold leading-none text-texto-forte">
              {confirmadosNoEscopo}
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-pilula bg-lima-100">
              <div
                className="h-2 rounded-pilula bg-lima-700"
                style={{ width: `${Math.min(100, Math.max(0, percentualConfirmado))}%` }}
              />
            </div>
            <p className="m-0 mt-2 font-corpo text-corpo-sm text-texto-suave">
              {percentualConfirmado}% {escopo.papel === 'colaborador' ? 'dos seus convites' : 'dos gerados'}
            </p>
          </Cartao>
          <Cartao superficie="interna">
            <p className="m-0 font-corpo text-corpo-sm text-texto-suave">
              {escopo.papel === 'colaborador' ? 'Compareceram' : 'Presentes'}
            </p>
            <p className="m-0 mt-1 font-corpo text-t1 font-bold leading-none text-texto-forte">
              {totalDoEscopo.presente}
            </p>
          </Cartao>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Subtitulo>{escopo.papel === 'colaborador' ? 'Suas palestras' : 'Palestras do circuito'}</Subtitulo>

          {palestras.length === 0 ? (
            <Vazio titulo="Nenhuma palestra ativa">
              <p className="m-0">
                Assim que a administração cadastrar as palestras, elas aparecem aqui.
              </p>
            </Vazio>
          ) : (
            palestras.map((palestra) => {
              // `resumos` só é preenchido quando `podeVerNumeros` (a
              // recepção não tem alcance em `verConvitesEConfirmacoes`,
              // mas continua vendo a lista de palestras, sem os números).
              const resumo = resumos.find((r) => r.palestra.id === palestra.id)?.resumo ?? null;
              const situacao = situacaoDaPalestra(palestra, referencia);
              const gerados = resumo ? totalGerados(resumo) : 0;
              return (
                <Cartao key={palestra.id} superficie="interna">
                  <div className="flex flex-wrap items-start gap-4">
                    <div className="flex-none rounded-cartao bg-superficie-alt px-3 py-2 text-center">
                      <p className="m-0 font-corpo text-t3 font-bold leading-none text-texto-forte">
                        {formatarDataCurta(palestra.dataHora)}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <TituloDoCartao>{palestra.cidade}</TituloDoCartao>
                        <Selo tom={situacao.tom}>{situacao.rotulo}</Selo>
                      </div>
                      <p className="m-0 mt-1 font-corpo text-corpo-sm text-texto-suave">
                        {palestra.localNome}
                      </p>
                      {resumo ? (
                        <ul className="m-0 mt-3 flex list-none flex-wrap gap-5 p-0">
                          <li>
                            <span className="block font-corpo text-corpo-sm text-texto-suave">
                              {escopo.papel === 'colaborador' ? 'meus convites' : 'gerados'}
                            </span>
                            <span className="block font-corpo text-corpo font-bold text-texto-forte">
                              {gerados}
                            </span>
                          </li>
                          <li>
                            <span className="block font-corpo text-corpo-sm text-texto-suave">
                              confirmados
                            </span>
                            <span className="block font-corpo text-corpo font-bold text-sucesso">
                              {resumo.confirmado + resumo.presente}
                            </span>
                          </li>
                          <li>
                            <span className="block font-corpo text-corpo-sm text-texto-suave">
                              disponíveis
                            </span>
                            <span className="block font-corpo text-corpo font-bold text-texto-forte">
                              {resumo.disponivel}
                            </span>
                          </li>
                        </ul>
                      ) : null}
                    </div>
                    {resumo ? (
                      <LinkBotao
                        href={`/palestras/painel/convites?palestra=${palestra.id}`}
                        variante={resumo.disponivel > 0 ? 'primario' : 'contorno'}
                        tamanho="sm"
                        className="flex-none"
                      >
                        {resumo.disponivel > 0 && escopo.papel === 'colaborador'
                          ? `Enviar os ${resumo.disponivel}`
                          : 'Ver convites'}
                      </LinkBotao>
                    ) : escopo.papel === 'recepcao' ? (
                      <LinkBotao
                        href="/palestras/checkin"
                        variante="primario"
                        tamanho="sm"
                        className="flex-none"
                      >
                        Abrir check-in
                      </LinkBotao>
                    ) : null}
                  </div>
                </Cartao>
              );
            })
          )}

          {confirmacoesRecentes.length > 0 ? (
            <Cartao superficie="interna">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
                <TituloDoCartao>Quem confirmou pelos seus links</TituloDoCartao>
                <Link
                  href="/palestras/painel/convites?estado=confirmado"
                  className="font-corpo text-corpo-sm font-bold text-terra-700 underline underline-offset-4"
                >
                  Ver todos
                </Link>
              </div>
              <ul className="m-0 flex list-none flex-col p-0">
                {confirmacoesRecentes.map((c) => (
                  <li
                    key={c.conviteId}
                    className="flex flex-wrap items-center justify-between gap-3 border-t border-linha py-3 first:border-t-0"
                  >
                    <span className="min-w-0">
                      <span className="block font-corpo text-corpo font-bold text-texto-forte">
                        {c.titular}
                      </span>
                      <span className="block font-corpo text-corpo-sm text-texto-suave">
                        {c.eventoCidade} · {c.acompanhante ? 'com acompanhante' : 'sem acompanhante'} ·{' '}
                        {formatarCarimbo(c.confirmadoEm)}
                      </span>
                    </span>
                    <Link
                      href={`/palestras/painel/convites/${c.codigo}`}
                      className="flex-none font-corpo text-corpo-sm font-bold text-terra-700 underline underline-offset-4"
                    >
                      Ver dados
                    </Link>
                  </li>
                ))}
              </ul>
            </Cartao>
          ) : null}
        </div>

        <div className="flex flex-col gap-4">
          <Subtitulo>O que você pode fazer</Subtitulo>
          {temEquipe ? (
            <Link href="/palestras/painel/equipe" className="no-underline">
              <Cartao superficie="interna" className="hover:border-linha-forte">
                <TituloDoCartao>Equipe</TituloDoCartao>
                <p className="m-0 mt-1 font-corpo text-corpo-sm text-texto-suave">
                  Números e listas por loja e por colaborador do seu escopo, em modo de leitura.
                </p>
              </Cartao>
            </Link>
          ) : null}
          {atalhos.map((atalho) => (
            <Link key={atalho.rotulo} href={atalho.href} className="no-underline">
              <Cartao superficie="interna" className="hover:border-linha-forte">
                <TituloDoCartao>{atalho.rotulo}</TituloDoCartao>
                <p className="m-0 mt-1 font-corpo text-corpo-sm text-texto-suave">
                  {atalho.descricao}
                </p>
              </Cartao>
            </Link>
          ))}
          {atalhos.length === 0 && !temEquipe ? (
            <Vazio titulo="Nada por aqui ainda">
              <p className="m-0">As telas do seu perfil ainda não têm atalho aqui.</p>
            </Vazio>
          ) : null}
        </div>
      </div>
    </>
  );
}
