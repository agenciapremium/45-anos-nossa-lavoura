/**
 * Domínio público da campanha.
 *
 * É o valor que a landing estática trazia fixo em `canonical`, `og:url`,
 * `og:image`, `twitter:image` e nos `@id` do JSON-LD. Fica constante de
 * propósito: os metadados da landing não podem variar com o ambiente, ou um
 * deploy de preview publicaria um `canonical` apontando para si mesmo.
 *
 * Os links de convite, esses sim, usam `APP_BASE_URL` (ver `lib/env.ts`),
 * porque precisam funcionar no preview antes de ir para produção.
 */
export const DOMINIO_CANONICO = 'https://45anosnossalavoura.agpremium.com.br';

export const URL_BASE = DOMINIO_CANONICO;

/** Monta uma URL absoluta no domínio canônico. */
export function urlAbsoluta(caminho: string): string {
  return new URL(caminho, `${DOMINIO_CANONICO}/`).toString();
}
