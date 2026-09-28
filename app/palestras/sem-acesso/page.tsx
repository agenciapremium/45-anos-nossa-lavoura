import { forbidden } from 'next/navigation';

/**
 * Destino da recusa por papel vinda do middleware.
 *
 * O middleware precisa devolver **403**, e `NextResponse.rewrite` não
 * carrega status: o que ele carrega é o endereço. Então ele reescreve para
 * cá, e a página chama `forbidden()` — que é quem define o status e
 * renderiza `app/forbidden.tsx`.
 *
 * A página não recebe, e não tem como receber, nenhum dado do recurso que
 * a pessoa tentou alcançar. É o requisito da spec: o 403 não revela nada.
 */
export const dynamic = 'force-dynamic';

export default function SemAcesso() {
  forbidden();
}
