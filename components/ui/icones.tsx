import * as React from 'react';

import { cn } from '@/lib/utils';

/* =========================================================
   Ícones de interface · desvio deliberado do design system (D9)

   O design system reconhece só quatro pictogramas de marca (boi, grama,
   saco, seta): eles vivem nas superfícies de campanha e nunca são
   substituídos por outra coisa. O menu lateral e os controles do painel
   precisam de vocabulário funcional que os quatro pictogramas não cobrem,
   e a alternativa (uma biblioteca de ícones) é dependência nova, proibida
   por esta change.

   Por isso este arquivo: um conjunto próprio, de traço, 24×24,
   `stroke-width` 1.8, herdando a cor do texto por `currentColor`. Nunca
   usar estes como pictograma de marca, e nunca os quatro da marca aqui.
   Trocar o conjunto inteiro, se a marca pedir, é editar só este arquivo.
   ========================================================= */

export type PropsDoIcone = React.SVGProps<SVGSVGElement>;

const moldura = (className?: string) =>
  cn('size-6 shrink-0', className) satisfies string;

/** Início: casa. */
export function IconeInicio({ className, ...props }: PropsDoIcone) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={moldura(className)}
      {...props}
    >
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M10 21v-6h4v6" />
    </svg>
  );
}

/** Métricas: barras. */
export function IconeMetricas({ className, ...props }: PropsDoIcone) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={moldura(className)}
      {...props}
    >
      <path d="M4 20h16" />
      <path d="M7 20v-7" />
      <path d="M12 20V6" />
      <path d="M17 20v-11" />
    </svg>
  );
}

/** Convites: bilhete. */
export function IconeConvites({ className, ...props }: PropsDoIcone) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={moldura(className)}
      {...props}
    >
      <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1a2 2 0 0 0 0 4v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1a2 2 0 0 0 0-4z" />
      <path d="M15 7v12" />
    </svg>
  );
}

/** Equipe: pessoas. */
export function IconeEquipe({ className, ...props }: PropsDoIcone) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={moldura(className)}
      {...props}
    >
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1" />
      <path d="M17 11a3 3 0 1 0 0-6" />
      <path d="M19 20v-1a4.5 4.5 0 0 0-2-3.7" />
    </svg>
  );
}

/** Download: seta para bandeja, usado nos PDFs de distribuição. */
export function IconeDownload({ className, ...props }: PropsDoIcone) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={moldura(className)}
      {...props}
    >
      <path d="M12 4v11" />
      <path d="M8 11l4 4 4-4" />
      <path d="M4 20h16" />
    </svg>
  );
}

/** Upload: seta para cima, usado na importação. */
export function IconeUpload({ className, ...props }: PropsDoIcone) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={moldura(className)}
      {...props}
    >
      <path d="M12 16V5" />
      <path d="M8 9l4-4 4 4" />
      <path d="M4 20h16" />
    </svg>
  );
}

/** QR: grade de quadrados, usado no check-in. */
export function IconeQr({ className, ...props }: PropsDoIcone) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={moldura(className)}
      {...props}
    >
      <path d="M4 4h6v6H4z" />
      <path d="M14 4h6v6h-6z" />
      <path d="M4 14h6v6H4z" />
      <path d="M14 14h2v2h-2z" />
      <path d="M18 18h2v2h-2z" />
    </svg>
  );
}

/** Documento: folha com dobra, usado nos relatórios. */
export function IconeDocumento({ className, ...props }: PropsDoIcone) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={moldura(className)}
      {...props}
    >
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
    </svg>
  );
}

/** Calendário: usado em Palestras, porque cada palestra é uma data. */
export function IconeCalendario({ className, ...props }: PropsDoIcone) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={moldura(className)}
      {...props}
    >
      <path d="M4 6h16v15H4z" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
      <path d="M4 11h16" />
    </svg>
  );
}

/** Estrutura: organograma, usado em regionais e lojas. */
export function IconeEstrutura({ className, ...props }: PropsDoIcone) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={moldura(className)}
      {...props}
    >
      <path d="M9 4h6v4H9z" />
      <path d="M3 16h5v4H3z" />
      <path d="M16 16h5v4h-5z" />
      <path d="M12 8v4" />
      <path d="M5.5 16v-2h13v2" />
    </svg>
  );
}

/** Mais: círculo com cruz, usado em gerar convites. */
export function IconeMais({ className, ...props }: PropsDoIcone) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={moldura(className)}
      {...props}
    >
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8.5v7" />
      <path d="M8.5 12h7" />
    </svg>
  );
}

/** Escudo: usado na auditoria. */
export function IconeEscudo({ className, ...props }: PropsDoIcone) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={moldura(className)}
      {...props}
    >
      <path d="M12 3l7 3v6c0 4.5-3 6.8-7 8.5-4-1.7-7-4-7-8.5V6z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

/** Sair: porta com seta, usado para encerrar sessão. */
export function IconeSair({ className, ...props }: PropsDoIcone) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={moldura(className)}
      {...props}
    >
      <path d="M9 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3" />
      <path d="M14 8l4 4-4 4" />
      <path d="M18 12H9" />
    </svg>
  );
}

/** Busca: lupa, usada na busca da barra de topo e nos filtros. */
export function IconeBusca({ className, ...props }: PropsDoIcone) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={moldura(className)}
      {...props}
    >
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-4.5-4.5" />
    </svg>
  );
}

/** Menu: três traços, para abrir a gaveta de navegação no celular. */
export function IconeMenu({ className, ...props }: PropsDoIcone) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={moldura(className)}
      {...props}
    >
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}

/** Fechar: X, para fechar a gaveta e painéis laterais. */
export function IconeFechar({ className, ...props }: PropsDoIcone) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={moldura(className)}
      {...props}
    >
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

/** Mais opções: três pontos, para o menu de ações de uma linha. */
export function IconeMaisOpcoes({ className, ...props }: PropsDoIcone) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={moldura(className)}
      {...props}
    >
      <circle cx="5" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="19" cy="12" r="1.7" />
    </svg>
  );
}

/** Chevron para baixo: usado em painéis expansíveis (auditoria). */
export function IconeChevron({ className, ...props }: PropsDoIcone) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={moldura(className)}
      {...props}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

/** Copiar: dois retângulos sobrepostos, usado em "copiar link". */
export function IconeCopiar({ className, ...props }: PropsDoIcone) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={moldura(className)}
      {...props}
    >
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </svg>
  );
}

/** WhatsApp: balão de fala, usado para enviar convite. */
export function IconeWhatsapp({ className, ...props }: PropsDoIcone) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={moldura(className)}
      {...props}
    >
      <path d="M12 20a8 8 0 1 0-6.9-4" />
      <path d="M5 20l1.2-4.3" />
      <path d="M9 9.5c0 3 2.5 5.5 5.5 5.5.4-.7.6-1.3.5-1.6l-1.8-.9c-.3-.1-.6-.1-.8.1l-.4.5a4.2 4.2 0 0 1-2.1-2.1l.5-.4c.2-.2.2-.5.1-.8L9.6 9c-.3-.1-.9.1-.6.5z" />
    </svg>
  );
}

/** Voltar: seta para a esquerda, usada para retornar de um detalhe à lista. */
export function IconeVoltar({ className, ...props }: PropsDoIcone) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={moldura(className)}
      {...props}
    >
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

/** Confirmar: marca de certo, usada em avisos de sucesso e check-in. */
export function IconeConfirmar({ className, ...props }: PropsDoIcone) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={moldura(className)}
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.8 2.8L16.5 9" />
    </svg>
  );
}
