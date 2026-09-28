/* =========================================================
   Mensagens das telas de acesso · todas neutras

   Módulo puro, sem banco e sem Better Auth, por um motivo prático: a
   neutralidade das respostas é uma regra de segurança, e regra de
   segurança precisa de teste. Aqui ela é testável sem infraestrutura
   (ver `tests/acesso.test.ts`).

   A regra, em uma frase: **nenhuma mensagem pode revelar se um cadastro
   existe**. Vale para CPF desconhecido, CPF sem e-mail, e-mail não
   cadastrado, senha errada, usuário desativado e papel de gestão tentando
   o método fraco — tudo cai na mesma frase.

   A única exceção é deliberada e está na spec: o e-mail **mascarado** do
   fluxo de código por CPF, que só aparece depois de o CPF ser aceito.
   ========================================================= */

export const MENSAGENS = {
  /** Serve a senha errada, identificador inexistente e conta desativada. */
  credencial:
    'Não foi possível entrar com esses dados. Confira o que você digitou, ' +
    'use outro método de acesso ou fale com a administração do circuito.',

  /** Resposta a qualquer pedido de envio, exista ou não o cadastro. */
  envio:
    'Se houver um cadastro com esses dados, a mensagem de acesso já foi ' +
    'enviada. Confira a caixa de entrada e a pasta de spam.',

  /** CPF sem e-mail vinculado — e, de propósito, CPF inexistente também. */
  semEmail:
    'Não é possível enviar um código para esse CPF. Entre pela aba ' +
    '“CPF e nascimento” ou fale com a administração do circuito.',

  /** Código de 6 dígitos recusado. */
  codigo: 'Código inválido ou expirado. Peça um novo código e tente de novo.',

  /** Código esgotado por excesso de tentativas. */
  codigoEsgotado:
    'Esse código não vale mais. Peça um novo e digite com atenção.',

  /** Link mágico ou de senha que não serve mais. */
  link:
    'Este link não é mais válido. Ele vale por poucos minutos e só pode ' +
    'ser usado uma vez. Peça um novo na tela de acesso.',

  /** Falha inesperada. */
  falha: 'Não foi possível concluir agora. Tente de novo em alguns instantes.',
} as const;

export function mensagemDeBloqueio(minutos: number): string {
  const tempo = minutos === 1 ? '1 minuto' : `${minutos} minutos`;
  return `Muitas tentativas seguidas. Aguarde ${tempo} e tente de novo.`;
}

/**
 * Expressões que denunciariam a existência (ou a ausência) de um cadastro.
 *
 * A lista não é uma sugestão de estilo: é o que `tests/acesso.test.ts`
 * varre em cada mensagem antes de deixar passar.
 */
export const EXPRESSOES_QUE_VAZAM = [
  'não encontrado',
  'nao encontrado',
  'não existe',
  'nao existe',
  'inexistente',
  'não cadastrad',
  'nao cadastrad',
  'já cadastrad',
  'senha incorreta',
  'senha errada',
  'usuário inválido',
  'usuario invalido',
  'e-mail inválido',
  'cpf inválido',
  'cpf invalido',
  'conta desativada',
  'usuário desativado',
  'usuario desativado',
  'sem permissão',
  'sem permissao',
] as const;
