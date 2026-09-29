'use client';

import { useState } from 'react';

import { CabecalhoDoMenu } from '@/components/palestras/cabecalho-do-menu';
import { IdentidadeDaSessao } from '@/components/palestras/identidade-da-sessao';
import { ConteudoDoMenu } from '@/components/palestras/menu-lateral';
import { Gaveta } from '@/components/ui/gaveta';
import { IconeFechar, IconeMenu } from '@/components/ui/icones';
import type { Papel } from '@/lib/db/schema';

/**
 * Gaveta de navegação no celular (2.7 das tarefas, requisito "Navegação
 * no celular" da spec).
 *
 * Client Component pelo estado de aberto/fechado. O botão de abrir mora
 * na barra de topo; a gaveta em si é um overlay `fixed`, então a posição
 * de onde este componente é montado na árvore não importa visualmente.
 * Os alvos de toque (botão de menu, fechar, sair, cada item) têm 44px.
 */
export function NavegacaoMobile({
  papel,
  nome,
  rotuloDoPapel,
}: {
  papel: Papel;
  nome: string;
  rotuloDoPapel: string;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-label="Abrir menu de navegação"
        className="inline-flex size-11 flex-none items-center justify-center rounded-controle border border-linha text-texto-forte lg:hidden"
      >
        <IconeMenu className="size-5" />
      </button>

      <Gaveta
        aberto={aberto}
        aoFechar={() => setAberto(false)}
        lado="esquerda"
        rotulo="Seções do sistema"
        className="bg-inverso-fundo text-texto-inverso"
      >
        <CabecalhoDoMenu
          acaoFechar={
            <button
              type="button"
              onClick={() => setAberto(false)}
              aria-label="Fechar o menu"
              className="inline-flex size-11 flex-none items-center justify-center rounded-controle border border-linha-inversa text-texto-inverso-suave"
            >
              <IconeFechar className="size-5" />
            </button>
          }
        />
        <nav className="flex flex-1 flex-col gap-3.5 overflow-y-auto p-3">
          <ConteudoDoMenu papel={papel} />
        </nav>
        <IdentidadeDaSessao nome={nome} papel={rotuloDoPapel} />
      </Gaveta>
    </>
  );
}
