import type { Metadata } from 'next';

import { SeloDoCircuito } from '@/components/palestras/selo';

export const metadata: Metadata = {
  title: { default: 'Entrar', template: '%s · Acesso' },
  // A tela de acesso não precisa de índice em busca, e não deve dar pista
  // de que existe uma área interna neste endereço.
  robots: { index: false, follow: false },
};

/**
 * Casca das telas de acesso.
 *
 * O selo do circuito aparece **inteiro e em proporção 1:1**, discreto, no
 * topo do cartão: ele carrega as marcas Virbac e Supremax e não pode ser
 * recortado nem distorcido. Aqui ele é assinatura, não protagonista —
 * quem entra já sabe onde está.
 */
export default function LayoutDeAcesso({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 items-center justify-center bg-inverso-fundo px-[var(--gutter-page)] py-12">
      <div className="w-full max-w-[28rem]">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <SeloDoCircuito tamanho={88} />
          <p className="m-0 font-corpo text-rotulo font-bold uppercase tracking-sobrancelha text-lima-500">
            Acelera no Campo 3.0
          </p>
        </div>

        <div className="rounded-cartao border-2 border-terra-700 bg-superficie p-6 shadow-slab-md sm:p-8">
          {children}
        </div>

        <p className="mt-6 text-center font-corpo text-corpo-sm text-texto-inverso-suave">
          Acesso restrito à equipe do circuito. Problemas para entrar? Fale com
          a administração.
        </p>
      </div>
    </main>
  );
}
