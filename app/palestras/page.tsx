import type { Metadata } from 'next';

import { RodapePublico } from '@/components/palestras/publico';
import { SeloDoCircuito } from '@/components/palestras/selo';
import { Aviso, Cartao, LinkBotao, Sobrancelha, Vazio } from '@/components/ui';
import { listarPalestrasAtivas } from '@/lib/palestras/consultas';
import {
  formatarData,
  formatarDataPorExtenso,
  formatarHorario,
} from '@/lib/tempo';
import { DOMINIO_CANONICO } from '@/lib/urls';

export const metadata: Metadata = {
  title: 'Circuito de Palestras Acelera no Campo 3.0',
  description:
    'Quatro palestras técnicas gratuitas em Rondônia, em outubro de 2026, com Giovani Pastre, da Virbac, e Ricardo Arantes. Veja cidades, datas, horários e locais.',
  alternates: { canonical: `${DOMINIO_CANONICO}/palestras` },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Nossa Lavoura',
    title: 'Circuito de Palestras Acelera no Campo 3.0',
    description:
      'Quatro palestras técnicas gratuitas em Rondônia, em outubro de 2026.',
  },
};

// O conteúdo vem do banco e muda quando o Admin cadastra ou desativa uma
// palestra: nada de cache estático.
export const dynamic = 'force-dynamic';

export default async function PaginaDoCircuito() {
  const palestras = await listarPalestrasAtivas();

  return (
    <>
      <header className="bg-inverso-fundo text-creme-500">
        <div className="mx-auto flex w-full max-w-conteudo flex-col items-center gap-6 px-[var(--gutter-page)] py-24 text-center">
          <SeloDoCircuito tamanho={180} />
          <p className="m-0 font-corpo text-rotulo font-bold uppercase tracking-sobrancelha text-lima-500">
            Outubro de 2026 · Rondônia
          </p>
          <h1 className="m-0 max-w-[20ch] font-titulo text-destaque font-bold leading-justo tracking-destaque text-creme-500 text-balance">
            Circuito de Palestras Acelera no Campo 3.0
          </h1>
          <p className="m-0 max-w-prosa font-corpo text-chamada font-light text-texto-inverso-suave">
            Palestras técnicas gratuitas com{' '}
            <strong className="font-bold text-creme-500">Giovani Pastre</strong>
            , da Virbac, e{' '}
            <strong className="font-bold text-creme-500">Ricardo Arantes</strong>
            . Uma noite de conteúdo para quem faz o campo produzir.
          </p>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto w-full max-w-conteudo px-[var(--gutter-page)] py-24">
          <Sobrancelha>As quatro palestras</Sobrancelha>

          {palestras.length === 0 ? (
            <Vazio titulo="As datas ainda vão ser anunciadas.">
              <p>
                Assim que o calendário do circuito for publicado, as cidades,
                os horários e os locais aparecem aqui.
              </p>
            </Vazio>
          ) : (
            <ol className="m-0 grid list-none gap-6 p-0 sm:grid-cols-2">
              {palestras.map((p) => (
                <li key={p.id}>
                  <Cartao elevado className="h-full">
                    <p className="m-0 font-corpo text-rotulo font-bold uppercase tracking-sobrancelha text-texto-suave">
                      {formatarData(p.dataHora)} · {formatarHorario(p.dataHora)}
                    </p>
                    <h2 className="mt-2 mb-3 font-titulo text-t2 font-bold leading-justo tracking-destaque text-texto-forte">
                      {p.cidade}
                    </h2>
                    <p className="m-0 font-corpo text-corpo-lg font-bold text-texto-forte">
                      {p.localNome}
                    </p>
                    <p className="mt-1 mb-4 font-corpo text-corpo text-texto">
                      {p.localEndereco}
                    </p>
                    <p className="m-0 border-l-4 border-linha-acento pl-4 font-corpo text-corpo-sm text-texto-suave">
                      {formatarDataPorExtenso(p.dataHora)}
                    </p>
                  </Cartao>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="bg-acento">
          <div className="mx-auto w-full max-w-conteudo px-[var(--gutter-page)] py-16">
            {/*
              Esta página NÃO confirma presença. A confirmação acontece
              exclusivamente pelo link pessoal que o colaborador envia, e é
              isso que amarra cada convite a um CPF. Nada de campo de CPF
              aqui.
            */}
            <Aviso
              tom="informacao"
              titulo="Como confirmar sua presença"
              className="border-terra-700 bg-creme-500"
            >
              <p>
                A confirmação é feita pelo <strong>link pessoal</strong> que
                você recebe de um colaborador da Nossa Lavoura, pelo WhatsApp.
                Cada link vale para uma pessoa e um acompanhante.
              </p>
              <p>
                Ainda não recebeu o seu? Fale com o consultor da loja Nossa
                Lavoura mais próxima.
              </p>
              <div className="mt-4">
                <LinkBotao
                  href="/palestras/ingresso"
                  variante="secundario"
                  tamanho="lg"
                  className="w-full"
                >
                  Já confirmei · ver meu ingresso
                </LinkBotao>
              </div>
            </Aviso>
          </div>
        </section>
      </main>

      {/*
        Rodapé comum às páginas públicas do módulo: link da política de
        privacidade e canal do encarregado de dados, como a spec
        `consentimento-lgpd` exige em `/palestras`, `/palestras/c/[codigo]`
        e `/palestras/ingresso`.
      */}
      <RodapePublico />
    </>
  );
}
