/* =========================================================
   Tetos das rotas públicas do convidado

   Num módulo próprio porque nem página nem arquivo `'use server'` podem
   exportar constante: o Next reserva os exports de uma página para os
   campos que ele conhece, e um módulo de Server Actions só exporta
   funções assíncronas.

   Os valores em si são a política, e ela é deliberadamente generosa. O
   público é rural e móvel: uma operadora pode pôr uma loja inteira atrás
   do mesmo endereço (CGNAT), e barrar o produtor legítimo é pior do que
   aceitar um punhado de envios automatizados — que esbarram, logo
   adiante, no convite travado e na unicidade de CPF.
   ========================================================= */

/** Envios do formulário de confirmação, por IP. */
export const LIMITE_DE_CONFIRMACAO = { maximo: 20, janelaSegundos: 600 };

/**
 * Tentativas de recuperação de ingresso, por IP.
 *
 * Mais apertado que o da confirmação porque aqui o atacante tem alvo: um
 * CPF que ele conhece e um código que ele quer adivinhar.
 */
export const LIMITE_DE_RECUPERACAO = { maximo: 8, janelaSegundos: 900 };

/**
 * Códigos de convite inexistentes abertos por um mesmo IP.
 *
 * Vinte e cinco em quinze minutos, e o bloqueio vale para o IP inteiro —
 * inclusive para códigos válidos, porque bloquear só os inexistentes
 * devolveria o oráculo que o bloqueio existe para fechar.
 *
 * O número é alto de propósito. A defesa real contra varredura é o
 * espaço de códigos (31^6 ≈ 887 milhões para alguns milhares de convites
 * emitidos): nenhum teto de requisições torna isso viável, e nenhum teto
 * plausível o impede. O que este limite faz é encarecer o ruído. Do outro
 * lado da balança está o produtor atrás do CGNAT da operadora,
 * compartilhando endereço com a cidade inteira — e um bloqueio disparado
 * por vizinhos que erraram ao copiar o link custaria uma presença real.
 *
 * Se o bloqueio disparar em produção sem varredura de verdade, é este
 * número que sobe, não a regra.
 */
export const LIMITE_DE_VARREDURA = { maximo: 25, janelaSegundos: 900 };
