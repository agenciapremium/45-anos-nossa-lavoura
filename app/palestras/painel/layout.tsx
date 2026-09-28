import type { Metadata } from 'next';

import { CabecalhoDoCircuito } from '@/components/palestras/selo';
import { BarraDaSessao } from '@/components/palestras/barra-da-sessao';
import { ROTULO_DO_PAPEL } from '@/lib/palestras/papeis';
import { exigirEscopo } from '@/lib/palestras/sessao';

export const metadata: Metadata = {
  title: { default: 'Painel', template: '%s · Painel' },
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = 'force-dynamic';

/**
 * Casca das telas autenticadas que não são de administração.
 *
 * Exige sessão **e escopo utilizável**: um gerente de loja sem loja
 * vinculada não passa daqui. É um cadastro incompleto, e tratá-lo como
 * "vê tudo" seria a pior das saídas.
 */
export default async function LayoutDoPainel({
  children,
}: {
  children: React.ReactNode;
}) {
  const atual = await exigirEscopo();

  return (
    <>
      <CabecalhoDoCircuito titulo="Painel">
        <BarraDaSessao nome={atual.nome} papel={ROTULO_DO_PAPEL[atual.papel]} />
      </CabecalhoDoCircuito>

      <main className="mx-auto w-full max-w-conteudo flex-1 px-[var(--gutter-page)] py-8">
        {children}
      </main>
    </>
  );
}
