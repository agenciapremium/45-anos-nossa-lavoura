import type * as React from 'react';

import { LinkBotao, Sobrancelha, Titulo } from '@/components/ui';
import { IconeVoltar } from '@/components/ui/icones';

/* =========================================================
   Cabeçalho de tela (correção da casca, item 2)

   O layout do grupo `(interno)` não recebe `searchParams` nem sabe em qual
   página está (só `page.tsx` recebe as duas coisas no App Router), e a
   solução anterior (`TituloDaBarra` comparando `usePathname()` contra o
   mapa do menu) mostrava o título do ITEM DE MENU, não o da tela: o
   detalhe de um convite confirmado, por exemplo, herdava "Convites" em vez
   de "Convite <código>".

   Por isso o título e a ação principal passam a ser da página: cada
   `page.tsx` renderiza este componente como primeiro bloco do conteúdo, e
   a barra de topo do layout fica só com a trilha curta da seção, o
   contexto de palestra e a identidade da sessão.
   ========================================================= */
export function CabecalhoDeTela({
  sobrancelha,
  titulo,
  extra,
  acao,
  voltar,
}: {
  /** Texto da sobrancelha (ex.: o papel, ou a cidade da palestra). */
  sobrancelha: React.ReactNode;
  titulo: React.ReactNode;
  /** Conteúdo ao lado do H1, na mesma linha (ex.: um `Selo` de estado). */
  extra?: React.ReactNode;
  /** Ação principal da tela, alinhada à direita. */
  acao?: React.ReactNode;
  /** Quando presente, mostra um botão de voltar antes da sobrancelha. */
  voltar?: { href: string; rotulo: string };
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-4">
      {voltar ? (
        <LinkBotao
          href={voltar.href}
          aria-label={voltar.rotulo}
          title={voltar.rotulo}
          variante="contorno"
          tamanho="sm"
          className="min-h-11 w-11 flex-none px-0"
        >
          <IconeVoltar className="size-4" />
        </LinkBotao>
      ) : null}

      <div className="min-w-0 flex-1">
        <Sobrancelha className="mb-1">{sobrancelha}</Sobrancelha>
        <div className="flex flex-wrap items-center gap-3">
          <Titulo>{titulo}</Titulo>
          {extra}
        </div>
      </div>

      {acao ? <div className="flex-none">{acao}</div> : null}
    </div>
  );
}
