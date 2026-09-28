/* =========================================================
   Destino pós-login

   O `destino` vem da query, montado pelo middleware quando ele intercepta
   uma rota protegida. Por vir da URL, **não é confiável**: é o clássico
   redirecionamento aberto, em que um link
   `/palestras/entrar?destino=https://site-falso` usa a nossa tela de
   acesso como trampolim — o usuário vê o domínio certo, digita a senha e
   é despejado noutro lugar.

   O filtro é por lista de permissão, não por lista de proibição: só passa
   caminho interno do próprio módulo.
   ========================================================= */

export function destinoSeguro(pedido: string, padrao: string): string {
  const alvo = pedido.trim();
  if (!alvo) return padrao;

  // Precisa ser caminho absoluto interno.
  if (!alvo.startsWith('/')) return padrao;

  // `//outro.com` e `/\outro.com` são lidos pelo navegador como outro
  // domínio, apesar de começarem com barra.
  if (alvo.startsWith('//') || alvo.startsWith('/\\')) return padrao;

  // Nada de voltar para a própria tela de acesso, nem de sair do módulo.
  if (!alvo.startsWith('/palestras')) return padrao;
  if (alvo.startsWith('/palestras/entrar')) return padrao;

  // Caractere de controle ou nova linha abre espaço para injeção no header.
  if (/[\u0000-\u001f\u007f]/.test(alvo)) return padrao;

  return alvo;
}
