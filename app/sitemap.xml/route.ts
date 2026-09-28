import { DOMINIO_CANONICO } from '@/lib/urls';

/**
 * `sitemap.xml` servido por Route Handler, e não pelo `app/sitemap.ts` do
 * Next, por dois motivos: o gerador do Next não emite `image:title` nem
 * `image:caption`, e a paridade de conteúdo com a versão estática é
 * requisito da change (tarefa 1.10).
 */
const CONTEUDO = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>${DOMINIO_CANONICO}/</loc>
    <lastmod>2026-09-02</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
    <image:image>
      <image:loc>${DOMINIO_CANONICO}/assets/img/og.jpg</image:loc>
      <image:title>Nossa Lavoura 45 Anos</image:title>
      <image:caption>45 anos cultivando confiança. Semana de aniversário de 19 a 24 de outubro.</image:caption>
    </image:image>
  </url>
  <url>
    <loc>${DOMINIO_CANONICO}/foto-comemorativa</loc>
    <lastmod>2026-09-16</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
</urlset>
`;

export const dynamic = 'force-static';

export function GET() {
  return new Response(CONTEUDO, {
    headers: { 'Content-Type': 'application/xml' },
  });
}
