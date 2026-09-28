import { DOMINIO_CANONICO } from '@/lib/urls';

/**
 * `robots.txt` servido por Route Handler, e não pelo `app/robots.ts` do Next,
 * porque o conteúdo precisa ser **idêntico** ao do arquivo estático anterior
 * — inclusive o `User-agent` com "a" minúsculo, que o gerador do Next
 * normaliza para `User-Agent`. Paridade de conteúdo é requisito da change
 * `fundacao` (tarefa 1.10).
 *
 * As telas administrativas não entram aqui: elas são protegidas por guard e
 * marcadas com `noindex` (D7 do design), que é a defesa correta — listar o
 * caminho no robots.txt só anunciaria a existência delas.
 */
const CONTEUDO = `User-agent: *
Allow: /

Sitemap: ${DOMINIO_CANONICO}/sitemap.xml
`;

export const dynamic = 'force-static';

export function GET() {
  return new Response(CONTEUDO, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
