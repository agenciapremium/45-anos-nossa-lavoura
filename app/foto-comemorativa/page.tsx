import type { Metadata } from 'next';

import './foto-comemorativa.css';

import { AplicativoFotoComemorativa } from '@/components/foto-comemorativa/aplicativo';
import { DOMINIO_CANONICO } from '@/lib/urls';

const OG = `${DOMINIO_CANONICO}/foto-comemorativa/assets/og-foto-comemorativa.jpg`;

export const metadata: Metadata = {
  title: 'Foto comemorativa dos 45 anos | Nossa Lavoura',
  description:
    'Coloque sua foto na moldura dos 45 anos da Nossa Lavoura e use no perfil do WhatsApp e do Instagram ou no seu story. Grátis, direto do celular.',
  alternates: { canonical: `${DOMINIO_CANONICO}/foto-comemorativa` },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Nossa Lavoura',
    url: `${DOMINIO_CANONICO}/foto-comemorativa`,
    title: 'Crie sua foto comemorativa dos 45 anos da Nossa Lavoura',
    description:
      'Sua foto na moldura dos 45 anos, pronta para o perfil ou para o story.',
    images: [
      {
        url: OG,
        type: 'image/jpeg',
        width: 1200,
        height: 630,
        alt: 'Exemplos da moldura dos 45 anos da Nossa Lavoura: foto de perfil redonda e story vertical.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: [OG],
  },
};

export default function FotoComemorativa() {
  return <AplicativoFotoComemorativa />;
}
