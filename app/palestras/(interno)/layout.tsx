import type { Metadata } from 'next';

import { CabecalhoDoMenu } from '@/components/palestras/cabecalho-do-menu';
import { IdentidadeDaSessao } from '@/components/palestras/identidade-da-sessao';
import { MenuLateral } from '@/components/palestras/menu-lateral';
import { NavegacaoMobile } from '@/components/palestras/navegacao-mobile';
import { SeletorDePalestra } from '@/components/palestras/seletor-de-palestra';
import { TrilhaDaSecao } from '@/components/palestras/trilha-da-secao';
import { contextoDePalestra } from '@/lib/palestras/contexto-de-palestra';
import { ROTULO_DO_PAPEL } from '@/lib/palestras/papeis';
import { exigirEscopo } from '@/lib/palestras/sessao';

export const metadata: Metadata = {
  title: { default: 'Painel', template: '%s · Acelera no Campo 3.0' },
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = 'force-dynamic';

/* =========================================================
   Casca única das telas autenticadas (D1 do design)

   Substitui `admin/layout.tsx` (barra de abas) e `painel/layout.tsx`
   (sem navegação nenhuma) por um só layout, em route group: as rotas não
   mudam de endereço, `/palestras/painel/convites` e
   `/palestras/admin/gerar` continuam iguais (o `(interno)` não aparece na
   URL).

   `exigirEscopo()` sobe para aqui: sem sessão ou sem escopo utilizável
   (um gerente de loja sem loja vinculada, por exemplo), ninguém passa da
   casca. Cada `page.tsx` mantém a própria checagem de papel ou ação
   (`exigirPapel`/`exigirAcao`) — a dupla camada de `auth-e-papeis`
   continua valendo, com este layout como primeira aplicação e o
   middleware como barreira anterior a ele.
   ========================================================= */
export default async function LayoutInterno({
  children,
}: {
  children: React.ReactNode;
}) {
  const atual = await exigirEscopo();
  const { eventos, atual: palestraPadrao } = await contextoDePalestra();
  const rotuloDoPapel = ROTULO_DO_PAPEL[atual.papel];

  return (
    <div className="flex min-h-screen bg-superficie text-texto">
      {/*
        `sticky top-0 h-dvh`: o menu acompanha a rolagem em vez de crescer
        com o conteúdo. Sem isto, o `<aside>` era só mais um item do flex e
        esticava até a altura da página — numa tela longa (convites,
        métricas), a identidade de quem está logado e o "Sair" ficavam no
        pé do documento, longe da janela, e era preciso rolar até o fim
        para sair do sistema. Com altura de viewport e `flex-1` no `<nav>`,
        o rodapé de identidade fica sempre no fim da JANELA, e um menu
        maior que a tela rola dentro do próprio `<nav>` (que já tem
        `overflow-y-auto`), não junto com a página.
      */}
      <aside className="hidden w-64 flex-none flex-col bg-inverso-fundo text-texto-inverso lg:sticky lg:top-0 lg:flex lg:h-dvh">
        <CabecalhoDoMenu />
        <MenuLateral papel={atual.papel} />
        <IdentidadeDaSessao nome={atual.nome} papel={rotuloDoPapel} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 flex-none items-center gap-3.5 border-b border-linha bg-cartao px-4 lg:px-6">
          <NavegacaoMobile
            papel={atual.papel}
            nome={atual.nome}
            rotuloDoPapel={rotuloDoPapel}
          />
          <TrilhaDaSecao />
          <div className="flex-1" />
          <SeletorDePalestra
            eventos={eventos}
            idPadrao={palestraPadrao?.id ?? null}
          />
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
