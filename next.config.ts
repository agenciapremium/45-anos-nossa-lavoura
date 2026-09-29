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

  // `trailingSlash: false` e `cleanUrls: true` do vercel.json: no App Router
  // os dois são o comportamento padrão.
  trailingSlash: false,
  poweredByHeader: false,

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
