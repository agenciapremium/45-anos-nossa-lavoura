import type * as React from 'react';

import { ItemDoMenu } from '@/components/palestras/item-do-menu';
import {
  IconeCalendario,
  IconeConvites,
  IconeDocumento,
  IconeDownload,
  IconeEquipe,
  IconeEscudo,
  IconeEstrutura,
  IconeInicio,
  IconeMais,
  IconeMetricas,
  IconeQr,
  IconeUpload,
} from '@/components/ui/icones';
import { alcanceDe, painelInicial, type Papel } from '@/lib/palestras/papeis';

/* =========================================================
   Menu lateral (D3 do design)

   Cada item declara a ação protegida que o habilita, e o item só entra na
   lista quando `alcanceDe(papel, acao)` não é `'nenhum'`: o mesmo padrão
   que `painel/page.tsx` já usa para os atalhos, agora generalizado para o
   menu inteiro. É cortesia de navegação, não proteção: quem protege é o
   `matcher` do middleware e o `exigirPapel`/`exigirAcao` de cada rota.

   Duas exceções documentadas, porque não são linha da matriz do PRD:

   - **Equipe**: não é uma ação da matriz, é leitura agregada sobre
     `verConvitesEConfirmacoes` reservada a quem tem mais de um
     colaborador no escopo (mesmo critério de `painel/page.tsx`).
   - **Auditoria**: a tela só existe para o Admin (`exigirPapel(['admin'])`
     em `admin/auditoria/page.tsx`) e não corresponde a nenhuma linha do
     PRD; a checagem aqui é o papel direto, não `alcanceDe`.

   **Métricas** usa `alcanceDe` mas exige mais que "diferente de nenhum":
   a spec da tela pede alcance acima de `proprios`, o que tira o
   colaborador (que só vê os próprios convites) sem tirar quem gerencia.
   ========================================================= */

type ItemDeMenu = {
  href: string;
  rotulo: string;
  icone: React.ReactNode;
  exato?: boolean;
  visivel: (papel: Papel) => boolean;
};

type GrupoDeMenu = {
  rotulo: string;
  itens: ItemDeMenu[];
};

const PAPEIS_COM_EQUIPE: readonly Papel[] = [
  'admin',
  'gerente_regional',
  'gerente_loja',
];

function grupos(papel: Papel): GrupoDeMenu[] {
  return [
    {
      rotulo: 'Visão geral',
      itens: [
        {
          href: painelInicial(papel),
          rotulo: 'Início',
          icone: <IconeInicio />,
          exato: true,
          visivel: () => true,
        },
        {
          href: '/palestras/painel/metricas',
          rotulo: 'Métricas',
          icone: <IconeMetricas />,
          visivel: (p) => {
            const alcance = alcanceDe(p, 'verConvitesEConfirmacoes');
            return alcance !== 'nenhum' && alcance !== 'proprios';
          },
        },
      ],
    },
    {
      rotulo: 'Convites',
      itens: [
        {
          href: '/palestras/painel/convites',
          rotulo: 'Convites',
          icone: <IconeConvites />,
          visivel: (p) => alcanceDe(p, 'verConvitesEConfirmacoes') !== 'nenhum',
        },
        {
          href: '/palestras/painel/equipe',
          rotulo: 'Equipe',
          icone: <IconeEquipe />,
          visivel: (p) => PAPEIS_COM_EQUIPE.includes(p),
        },
        {
          href: '/palestras/admin/distribuir',
          rotulo: 'PDFs de distribuição',
          icone: <IconeDownload />,
          visivel: (p) => p === 'admin',
        },
        {
          href: '/palestras/painel/convites/pdf',
          rotulo: 'Meu PDF',
          icone: <IconeDownload />,
          visivel: (p) => p === 'colaborador',
        },
      ],
    },
    {
      rotulo: 'Evento',
      itens: [
        {
          href: '/palestras/checkin',
          rotulo: 'Check-in',
          icone: <IconeQr />,
          visivel: (p) => alcanceDe(p, 'fazerCheckin') !== 'nenhum',
        },
        {
          href: '/palestras/relatorios',
          rotulo: 'Relatórios',
          icone: <IconeDocumento />,
          visivel: (p) => alcanceDe(p, 'listaImpressaECsv') !== 'nenhum',
        },
      ],
    },
    {
      rotulo: 'Cadastro',
      itens: [
        {
          href: '/palestras/admin/palestras',
          rotulo: 'Palestras',
          icone: <IconeCalendario />,
          visivel: (p) => alcanceDe(p, 'cadastrarPalestras') !== 'nenhum',
        },
        {
          href: '/palestras/admin/organizacao',
          rotulo: 'Estrutura',
          icone: <IconeEstrutura />,
          visivel: (p) => alcanceDe(p, 'cadastrarEImportarEstrutura') !== 'nenhum',
        },
        {
          href: '/palestras/admin/importar',
          rotulo: 'Importar colaboradores',
          icone: <IconeUpload />,
          visivel: (p) => alcanceDe(p, 'cadastrarEImportarEstrutura') !== 'nenhum',
        },
        {
          href: '/palestras/admin/gerar',
          rotulo: 'Gerar convites',
          icone: <IconeMais />,
          visivel: (p) => alcanceDe(p, 'gerarLotes') !== 'nenhum',
        },
      ],
    },
    {
      rotulo: 'Sistema',
      itens: [
        {
          href: '/palestras/admin/auditoria',
          rotulo: 'Auditoria',
          icone: <IconeEscudo />,
          // Não é linha da matriz do PRD: a tela é `exigirPapel(['admin'])`
          // direto (ver `admin/auditoria/page.tsx`), sem ação protegida.
          visivel: (p) => p === 'admin',
        },
      ],
    },
  ];
}

/** Monta os grupos visíveis para o papel, já sem grupos vazios. */
export function itensDoMenuPara(papel: Papel): GrupoDeMenu[] {
  return grupos(papel)
    .map((grupo) => ({
      ...grupo,
      itens: grupo.itens.filter((item) => item.visivel(papel)),
    }))
    .filter((grupo) => grupo.itens.length > 0);
}

/** Conteúdo do menu: os grupos e itens. Usado na casca e na gaveta do celular. */
export function ConteudoDoMenu({ papel }: { papel: Papel }) {
  const grupoDeItens = itensDoMenuPara(papel);

  return (
    <>
      {grupoDeItens.map((grupo) => (
        <div key={grupo.rotulo}>
          <p className="m-0 mb-1.5 px-2.5 font-corpo text-[10px] font-bold uppercase tracking-sobrancelha text-lima-600">
            {grupo.rotulo}
          </p>
          <div className="flex flex-col gap-0.5">
            {grupo.itens.map((item) => (
              <ItemDoMenu
                key={item.href}
                href={item.href}
                exato={item.exato}
                icone={item.icone}
              >
                {item.rotulo}
              </ItemDoMenu>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

/**
 * Menu lateral fixo do desktop. Server Component: só decide o quê
 * mostrar; o realce do item ativo é o único pedaço de cliente (ver
 * `ItemDoMenu`).
 */
export function MenuLateral({ papel }: { papel: Papel }) {
  return (
    <nav
      aria-label="Seções do sistema"
      className="flex flex-1 flex-col gap-3.5 overflow-y-auto p-3"
    >
      <ConteudoDoMenu papel={papel} />
    </nav>
  );
}
