import { notFound } from 'next/navigation';

/**
 * Rota coringa do módulo.
 *
 * Sem ela, `/palestras/qualquer-coisa` cairia no `not-found` da raiz — que no
 * App Router é quem atende toda URL sem rota — e o visitante veria a 404
 * genérica do Next em vez da do Acelera no Campo 3.0. O `not-found.js` de um
 * segmento só entra quando alguém chama `notFound()` dentro dele; é
 * exatamente o que esta página faz.
 *
 * Rotas mais específicas (`/palestras/admin/*`) continuam vencendo o coringa.
 */
export default function RotaInexistente() {
  notFound();
}
