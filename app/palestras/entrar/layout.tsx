import type { Metadata } from 'next';

import { SeloDoCircuito } from '@/components/palestras/selo';
import { IconeConfirmar } from '@/components/ui/icones';

export const metadata: Metadata = {
  title: { default: 'Entrar', template: '%s · Acesso' },
  // A tela de acesso não precisa de índice em busca, e não deve dar pista
  // de que existe uma área interna neste endereço.
  robots: { index: false, follow: false },
};

/**
 * Casca das telas de acesso, em duas colunas (tarefa 6.6).
 *
 * À esquerda, um painel de marca em terra 900: selo, sobrancelha, título do
 * circuito, a chamada da área e, fixos no rodapé do painel, dois pontos de
 * apoio e a assinatura. É o mesmo peso visual do cartão de marca das telas
 * do convidado, só que aqui vira parede inteira em vez de borda.
 *
 * À direita, sobre creme, o cartão do formulário: título, subtítulo, abas
 * segmentadas (tarefa 6.4), campos e ação vivem dentro dele. Título, abas e
 * formulário mudam por tela; só a casca é compartilhada, aqui.
 *
 * No celular as colunas empilham: o painel de marca vira um topo compacto
 * (selo menor, sobrancelha e título, sem os pontos de apoio nem a
 * assinatura) e o cartão vem logo abaixo.
 */
export default function LayoutDeAcesso({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      {/* ---------- painel de marca ---------- */}
      <div className="flex flex-col items-center gap-6 bg-inverso-fundo px-[var(--gutter-page)] py-10 text-center lg:w-[42%] lg:flex-none lg:items-start lg:justify-between lg:px-14 lg:py-14 lg:text-left">
        <div className="flex flex-col items-center gap-3 lg:items-start">
          <SeloDoCircuito tamanho={88} className="lg:hidden" />
          <SeloDoCircuito tamanho={140} className="hidden lg:block" />
          <p className="m-0 font-corpo text-rotulo font-bold uppercase tracking-sobrancelha text-lima-500">
            Outubro de 2026 · Rondônia
          </p>
          <h1 className="m-0 max-w-[20ch] font-titulo text-t2 font-bold leading-justo tracking-destaque text-creme-500 text-balance lg:text-t1">
            Circuito de Palestras Acelera no Campo 3.0
          </h1>
          <p className="hidden max-w-prosa font-corpo text-corpo-lg font-light text-texto-inverso-suave lg:block">
            Área da equipe da Nossa Lavoura: convites, confirmações, check-in
            e relatórios das quatro palestras do circuito.
          </p>
        </div>

        <div className="hidden flex-col gap-4 lg:flex">
          <ul className="m-0 flex list-none flex-col gap-4 p-0">
            <li className="flex items-start gap-3">
              <IconeConfirmar className="mt-0.5 size-5 flex-none text-lima-500" />
              <p className="m-0 font-corpo text-corpo-sm leading-confortavel text-texto-inverso-suave">
                Quem não tem e-mail entra com{' '}
                <strong className="font-bold text-creme-500">
                  CPF e data de nascimento
                </strong>
                .
              </p>
            </li>
            <li className="flex items-start gap-3">
              <IconeConfirmar className="mt-0.5 size-5 flex-none text-lima-500" />
              <p className="m-0 font-corpo text-corpo-sm leading-confortavel text-texto-inverso-suave">
                O convidado{' '}
                <strong className="font-bold text-creme-500">
                  não entra aqui
                </strong>
                : ele confirma pelo link que recebe no WhatsApp.
              </p>
            </li>
          </ul>
          <p className="m-0 border-t border-linha-inversa pt-4 font-corpo text-corpo-sm leading-confortavel text-texto-inverso-suave">
            Nossa Lavoura · Grupo Axia Agro · Virbac e Supremax
            <br />
            Problemas para entrar? Fale com a administração do circuito.
          </p>
        </div>
      </div>

      {/* ---------- coluna do formulário ---------- */}
      <main className="flex flex-1 items-center justify-center bg-superficie px-[var(--gutter-page)] py-12">
        <div className="w-full max-w-xl">
          <div className="rounded-cartao border border-linha bg-cartao p-6 sm:p-8">
            {children}
          </div>

          <div className="mt-5 rounded-cartao border border-linha bg-superficie-alt p-4">
            <p className="m-0 text-center font-corpo text-corpo-sm text-texto-suave lg:text-left">
              Cinco tentativas erradas e o acesso pausa por alguns minutos. A
              mensagem é sempre a mesma, acerte ou erre o identificador: é
              proteção, não falta de clareza.
            </p>
          </div>

          {/*
            No celular o painel de marca encolhe e leva junto a linha de
            suporte. Ela volta aqui, porque quem não consegue entrar precisa
            saber com quem falar justamente no aparelho em que está travado.
          */}
          <p className="mt-4 text-center font-corpo text-corpo-sm text-texto-suave lg:hidden">
            Problemas para entrar? Fale com a administração do circuito.
          </p>
        </div>
      </main>
    </div>
  );
}
