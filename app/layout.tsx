import type { Metadata, Viewport } from 'next';

import './base.css';
import { classesDeFonte } from './fontes';
import { URL_BASE } from '@/lib/urls';

/**
 * Metadados comuns. Cada página sobrescreve o que é seu — a landing dos
 * 45 anos em `app/page.tsx`, a foto comemorativa e o módulo `/palestras`
 * nos respectivos arquivos.
 */
export const metadata: Metadata = {
  metadataBase: new URL(URL_BASE),
  title: 'Nossa Lavoura',
  icons: {
    icon: '/assets/img/selo-600.webp',
    apple: '/assets/img/selo-600.webp',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#2a1512',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={classesDeFonte}>
      <body>{children}</body>
    </html>
  );
}
