import type { Metadata } from 'next';

import '../globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Circuito de Palestras Acelera no Campo 3.0',
    template: '%s · Acelera no Campo 3.0',
  },
};

/**
 * Casca de todas as telas do módulo.
 *
 * É aqui que o Tailwind entra no projeto: a landing dos 45 anos e a foto
 * comemorativa continuam sem ele, com o CSS que já tinham. Ver o cabeçalho
 * de `app/globals.css`.
 */
export default function LayoutDoModulo({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-superficie text-texto flex flex-col">
      {children}
    </div>
  );
}
