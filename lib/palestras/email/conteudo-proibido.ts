/* =========================================================
   Guarda de conteúdo dos e-mails transacionais

   A spec proíbe CPF completo, senha e dados de convidados no corpo dos
   e-mails. Uma revisão de código garante isso hoje; um template novo,
   daqui a seis meses, não.

   Por isso a verificação é executada **no ponto de envio**, sobre o HTML já
   renderizado, e um e-mail reprovado não sai. É uma rede de segurança, não
   um substituto do cuidado ao escrever o template — mas é a diferença entre
   "não devia acontecer" e "não acontece".
   ========================================================= */

export type ConteudoProibido = {
  /** Rótulo do que foi encontrado. Nunca o valor em si. */
  tipo: 'cpf' | 'senha';
};

/** Onze dígitos seguidos, com ou sem a pontuação do CPF. */
const CPF_COM_MASCARA = /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/;
const CPF_SO_DIGITOS = /(?<![\d>])\d{11}(?![\d<])/;

/**
 * Rótulos que denunciam uma senha no corpo. Não há como detectar a senha em
 * si — o que dá para detectar é a frase que a acompanha.
 */
const ROTULOS_DE_SENHA = [
  // `\b` é fronteira ASCII: depois de "é" ela não existe, porque acentuada
  // e espaço são ambos não-palavra. Daí o olhar-adiante por espaço.
  /\bsua senha (é|e|atual|provisória|provisoria|temporária|temporaria)(?=\s|$)/i,
  /\bsenha:\s*\S/i,
  /\bsenha provis[óo]ri[ao](?=\s|$|[.,;!])/i,
];

/**
 * Procura conteúdo proibido no corpo renderizado.
 *
 * Trabalha sobre o texto visível: as tags são removidas antes, para que um
 * `style` com onze dígitos de comprimento não vire falso positivo.
 */
export function conteudoProibido(html: string): ConteudoProibido | null {
  const texto = html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ');

  if (CPF_COM_MASCARA.test(texto) || CPF_SO_DIGITOS.test(texto)) {
    return { tipo: 'cpf' };
  }
  for (const padrao of ROTULOS_DE_SENHA) {
    if (padrao.test(texto)) return { tipo: 'senha' };
  }
  return null;
}
