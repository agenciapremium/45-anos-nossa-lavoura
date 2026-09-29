import type { Metadata } from 'next';

import { Abertura } from '@/components/palestras/landing/abertura';
import { Agenda } from '@/components/palestras/landing/agenda';
import { Palestrantes } from '@/components/palestras/landing/palestrantes';
import { Presenca } from '@/components/palestras/landing/presenca';
import { RodapePublico } from '@/components/palestras/publico';
import { listarPalestrasAtivas } from '@/lib/palestras/consultas';
import { DOMINIO_CANONICO } from '@/lib/urls';

const DESCRICAO =
  'Palestras técnicas gratuitas em Rondônia, em outubro de 2026. Ricardo Arantes: "Desafios do Agro Moderno: você está preparado?". Giovani Pastre, da Virbac: "Controle sanitário na reprodução". Veja cidades, datas e locais.';

export const metadata: Metadata = {
  title: 'Circuito de Palestras Acelera no Campo 3.0',
  description: DESCRICAO,
  alternates: { canonical: `${DOMINIO_CANONICO}/palestras` },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Nossa Lavoura',
    title: 'Circuito de Palestras Acelera no Campo 3.0',
    description:
      'Conheça os palestrantes Ricardo Arantes e Giovani Pastre e veja onde e quando acontece cada palestra.',
  },
};

// O conteúdo vem do banco e muda quando o Admin cadastra ou desativa uma
// palestra: nada de cache estático.
export const dynamic = 'force-dynamic';

/**
 * Landing do circuito (change `landing-do-circuito`). Segue a sequência do
 * carrossel da campanha: abertura, palestrantes, onde e quando, garanta
 * sua presença e promoção. Palestrantes e promoção vêm de
 * `lib/palestras/conteudo-da-landing.ts`; a agenda, do banco.
 */
export default async function PaginaDoCircuito() {
  const palestras = await listarPalestrasAtivas();
  const cidades = new Set(palestras.map((p) => p.cidade)).size;

  return (
    <>
      <Abertura cidades={cidades} />
      <main className="flex-1">
        <Palestrantes />
        <Agenda palestras={palestras} />
        <Presenca />
      </main>
      {/*
        Rodapé comum às páginas públicas do módulo: link da política de
        privacidade e canal do encarregado de dados, como a spec
        `consentimento-lgpd` exige.
      */}
      <RodapePublico />
    </>
  );
}
