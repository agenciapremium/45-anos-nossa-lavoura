/**
 * Validação da configuração na subida do servidor.
 *
 * Sem isto, uma variável ausente só apareceria no primeiro pedido que por
 * acaso tocasse o banco — provavelmente em produção, provavelmente durante a
 * operação do circuito. Aqui o processo falha logo, com a variável nomeada.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { env } = await import('@/lib/env');
  env();
}
