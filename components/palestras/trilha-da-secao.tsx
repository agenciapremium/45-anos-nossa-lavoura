'use client';

import { usePathname } from 'next/navigation';

/* =========================================================
   Trilha curta da seção, na barra de topo (correção da casca, item 2)

   Substitui `TituloDaBarra`: o título da TELA agora é responsabilidade de
   cada `page.tsx` (ver `cabecalho-de-tela.tsx`). A barra de topo do layout
   só precisa dizer em que seção do sistema o usuário está: "Painel",
   "Administração", "Relatórios" ou "Check-in": um rótulo curto e estável,
   que não depende do mapa inteiro do menu.

   Client Component pela mesma razão de sempre: o `layout.tsx` do grupo não
   recebe o caminho atual (só `page.tsx` recebe `searchParams`, nenhum dos
   dois recebe o pathname), então a única forma de saber a seção é
   `usePathname()`.
   ========================================================= */

const SECOES: readonly { prefixo: string; rotulo: string }[] = [
  { prefixo: '/palestras/admin', rotulo: 'Administração' },
  { prefixo: '/palestras/painel', rotulo: 'Painel' },
  { prefixo: '/palestras/relatorios', rotulo: 'Relatórios' },
  { prefixo: '/palestras/checkin', rotulo: 'Check-in' },
];

export function TrilhaDaSecao() {
  const pathname = usePathname();
  const secao = SECOES.find(
    (s) => pathname === s.prefixo || pathname.startsWith(`${s.prefixo}/`),
  );

  return (
    <p className="m-0 min-w-0 truncate font-corpo text-[10px] font-bold uppercase tracking-sobrancelha text-texto-suave">
      {secao?.rotulo ?? 'Painel'}
    </p>
  );
}
