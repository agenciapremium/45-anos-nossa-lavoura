import { DOMINIO_CANONICO } from '@/lib/urls';

const ORG = 'https://nossalavoura.com.br/#organization';

/**
 * JSON-LD da landing, idêntico ao `@graph` da versão estática.
 *
 * As URLs absolutas saem de `DOMINIO_CANONICO`: se a página mudar de
 * domínio, muda num lugar só — que era justamente o aviso deixado no
 * `<head>` do `index.html`.
 */
export const grafoDaLanding = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': ORG,
      name: 'Nossa Lavoura',
      legalName: 'LINEAGRO PRODUTOS AGROPECUARIOS SA',
      url: 'https://nossalavoura.com.br',
      slogan: 'Nossa Lavoura, amiga de quem planta, cria e produz',
      description:
        'Rede de lojas agropecuárias com mais de 40 unidades em Rondônia, Acre e Amazonas, atendendo o produtor rural há 45 anos com nutrição animal, saúde do rebanho, sementes de pastagem, herbicidas, arames, cercas, máquinas e implementos.',
      taxID: '21.018.928/0053-02',
      image: `${DOMINIO_CANONICO}/assets/img/og.jpg`,
      address: {
        '@type': 'PostalAddress',
        streetAddress:
          'Rua Rui Barbosa esquina com Avenida dos Bandeirantes, 207, Beira Rio',
        addressLocality: 'Pimenta Bueno',
        addressRegion: 'RO',
        addressCountry: 'BR',
      },
      areaServed: [
        { '@type': 'State', name: 'Rondônia' },
        { '@type': 'State', name: 'Acre' },
        { '@type': 'State', name: 'Amazonas' },
      ],
      knowsAbout: [
        'Nutrição animal',
        'Saúde animal',
        'Sementes de pastagem',
        'Herbicidas para pastagem',
        'Arames e cercas',
        'Máquinas e implementos agrícolas',
      ],
    },
    {
      '@type': 'WebSite',
      '@id': `${DOMINIO_CANONICO}/#website`,
      url: `${DOMINIO_CANONICO}/`,
      name: 'Nossa Lavoura 45 Anos',
      inLanguage: 'pt-BR',
      publisher: { '@id': ORG },
    },
    {
      '@type': 'ImageObject',
      '@id': `${DOMINIO_CANONICO}/#primaryimage`,
      url: `${DOMINIO_CANONICO}/assets/img/og.jpg`,
      contentUrl: `${DOMINIO_CANONICO}/assets/img/og.jpg`,
      width: 1200,
      height: 630,
      caption:
        '45 anos cultivando confiança. Nossa Lavoura, amiga de quem planta, cria e produz.',
    },
    {
      '@type': 'WebPage',
      '@id': `${DOMINIO_CANONICO}/#webpage`,
      url: `${DOMINIO_CANONICO}/`,
      name: 'Nossa Lavoura 45 Anos | Uma história construída com quem faz o campo acontecer',
      description:
        'A Nossa Lavoura celebra 45 anos ao lado do produtor rural em Rondônia, Acre e Amazonas. Conheça a história e aproveite a semana de aniversário, de 19 a 24 de outubro.',
      inLanguage: 'pt-BR',
      isPartOf: { '@id': `${DOMINIO_CANONICO}/#website` },
      about: { '@id': ORG },
      primaryImageOfPage: { '@id': `${DOMINIO_CANONICO}/#primaryimage` },
    },
    {
      '@type': 'SaleEvent',
      '@id': `${DOMINIO_CANONICO}/#semana`,
      name: 'Semana de Aniversário 45 Anos Nossa Lavoura',
      description:
        'Uma semana inteira de condições especiais em nutrição animal, saúde do rebanho, pastagem, sementes, arames, máquinas e implementos. Válida em todas as lojas Nossa Lavoura de Rondônia, Acre e Amazonas.',
      startDate: '2026-10-19',
      endDate: '2026-10-24',
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      image: `${DOMINIO_CANONICO}/assets/img/og.jpg`,
      organizer: { '@id': ORG },
      location: {
        '@type': 'Place',
        name: 'Lojas Nossa Lavoura',
        address: {
          '@type': 'PostalAddress',
          addressRegion: 'RO',
          addressCountry: 'BR',
        },
      },
    },
  ],
};

export function DadosEstruturados({ grafo }: { grafo: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(grafo) }}
    />
  );
}
