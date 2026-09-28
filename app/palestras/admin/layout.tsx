import type { Metadata } from 'next';
import Link from 'next/link';

import { CabecalhoDoCircuito } from '@/components/palestras/selo';
import { BarraDaSessao } from '@/components/palestras/barra-da-sessao';
import { ROTULO_DO_PAPEL } from '@/lib/palestras/papeis';
import { exigirPapel } from '@/lib/palestras/sessao';

export const metadata: Metadata = {
  title: { default: 'Administração', template: '%s · Administração' },
  // Telas administrativas nunca entram em índice de busca.
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Toda tela administrativa passa por aqui.
 *
 * O guard por `ADMIN_PREVIEW_TOKEN` de `fundacao` **saiu** nesta change: o
 * que protege estas telas agora é sessão do Better Auth mais o papel
 * `admin`, conferido no middleware e de novo aqui.
 *
 * Duas camadas de propósito (D4 do design). O middleware barra cedo e
 * barato, e é ele quem devolve 404 a quem não tem sessão — a rota não pode
 * denunciar que existe. Esta segunda camada existe porque o middleware
 * pode ser contornado por uma rota que escape do `matcher`, e porque cada
 * consulta desta seção exige o escopo que só sai daqui.
 */
export const dynamic = 'force-dynamic';

const MENU = [
  { href: '/palestras/admin', rotulo: 'Início' },
  { href: '/palestras/admin/palestras', rotulo: 'Palestras' },
  { href: '/palestras/admin/organizacao', rotulo: 'Estrutura' },
  { href: '/palestras/admin/importar', rotulo: 'Importar' },
  { href: '/palestras/admin/gerar', rotulo: 'Gerar convites' },
  { href: '/palestras/admin/distribuir', rotulo: 'PDFs' },
  { href: '/palestras/admin/auditoria', rotulo: 'Auditoria' },
];

export default async function LayoutAdministrativo({
  children,
}: {
  children: React.ReactNode;
}) {
  const atual = await exigirPapel(['admin']);

  return (
    <>
      <CabecalhoDoCircuito titulo="Administração">
        <BarraDaSessao nome={atual.nome} papel={ROTULO_DO_PAPEL[atual.papel]} />
      </CabecalhoDoCircuito>

      <nav
        aria-label="Seções da administração"
        className="border-b-2 border-terra-700 bg-superficie-alt"
      >
        <ul className="mx-auto flex w-full max-w-conteudo list-none flex-wrap gap-1 px-[var(--gutter-page)] py-2">
          {MENU.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="inline-block rounded-controle px-3 py-2 font-corpo text-corpo font-bold text-terra-700 no-underline hover:bg-lima-100"
              >
                {item.rotulo}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <main className="mx-auto w-full max-w-conteudo flex-1 px-[var(--gutter-page)] py-8">
        {children}
      </main>
    </>
  );
}
