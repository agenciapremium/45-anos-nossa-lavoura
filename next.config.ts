import type { NextConfig } from 'next';

/**
 * Domínio canônico da campanha. Os dois domínios `*.vercel.app` do projeto
 * redirecionam para cá — é o que o `vercel.json` fazia antes da migração.
 */
const DOMINIO_CANONICO = 'https://45anosnossalavoura.agpremium.com.br';

const HOSTS_VERCEL = [
  '45-anos-nossa-lavoura.vercel.app',
  '45-anos-nossa-lavoura-agencia-premium.vercel.app',
];

const nextConfig: NextConfig = {
  reactStrictMode: true,

  /*
     `forbidden()` e `app/forbidden.tsx`: é o que faz uma recusa de acesso
     sair com status HTTP 403 de verdade, em vez de um 200 com cara de
     erro. A spec de controle de acesso pede 403 explicitamente.
  */
  experimental: {
    authInterrupts: true,
  },
  // `trailingSlash: false` e `cleanUrls: true` do vercel.json: no App Router
  // os dois são o comportamento padrão.
  trailingSlash: false,
  poweredByHeader: false,

  /*
     Pacotes que o bundler do servidor NÃO pode empacotar.

     - `@react-pdf/renderer` e `archiver` usam APIs de Node (disco, streams)
       que não existem no Edge Runtime.
     - `@react-email/render` e `@react-email/components` precisam de
       `react-dom/server`, que sob a condição `react-server` — a que o App
       Router aplica a Server Components, Server Actions e Route Handlers —
       resolve para um módulo que **lança** "react-dom/server is not
       supported in React Server Components". Externalizar faz o Next
       carregá-los por `require()` em tempo de execução, com as condições
       normais de Node, e a renderização do e-mail volta a funcionar.
  */
  serverExternalPackages: [
    '@react-pdf/renderer',
    'archiver',
    '@react-email/render',
    '@react-email/components',
  ],

  // As fontes TTF e o selo em PNG do PDF são lidos do disco em tempo de
  // execução, por caminho montado em `process.cwd()`. O rastreador não tem
  // como descobrir isso sozinho, então a inclusão é declarada.
  outputFileTracingIncludes: {
    '/palestras/admin/distribuir/pdf': ['./lib/palestras/pdf/recursos/**'],
    '/palestras/admin/distribuir/lote': ['./lib/palestras/pdf/recursos/**'],
    '/palestras/painel/convites/pdf': ['./lib/palestras/pdf/recursos/**'],
  },

  async redirects() {
    return [
      ...HOSTS_VERCEL.map((host) => ({
        source: '/:path*',
        has: [{ type: 'host' as const, value: host }],
        destination: `${DOMINIO_CANONICO}/:path*`,
        permanent: true,
      })),
      {
        source: '/figurinhas',
        destination: '/foto-comemorativa',
        permanent: true,
      },
      {
        source: '/figurinhas/:path*',
        destination: '/foto-comemorativa/:path*',
        permanent: true,
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/assets/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ];
  },
};

export default nextConfig;
