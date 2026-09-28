import { somenteDigitos } from '@/lib/palestras/cpf';

/* =========================================================
   Confirmação de presença · vocabulário compartilhado

   Opções, máscaras e textos que a tela e o servidor precisam enxergar do
   mesmo jeito.

   Módulo puro: sem banco, sem `server-only` e **sem Zod**. É o que
   permite que o componente cliente importe as máscaras e as opções de
   atividade sem arrastar a camada de dados — nem 13 kB de validador — para
   dentro do pacote do navegador. O esquema em si mora em
   `confirmacao-esquema.ts`, que só o servidor carrega.
   ========================================================= */

/* ---------------------------------------------------------
   Atividade do produtor
   --------------------------------------------------------- */

export const ATIVIDADES = [
  { valor: 'corte', rotulo: 'Gado de corte' },
  { valor: 'leite', rotulo: 'Gado de leite' },
  { valor: 'cria', rotulo: 'Cria' },
  { valor: 'outra', rotulo: 'Outra' },
] as const;

export const VALORES_DE_ATIVIDADE = ATIVIDADES.map((a) => a.valor) as [
  'corte',
  'leite',
  'cria',
  'outra',
];

export type Atividade = (typeof ATIVIDADES)[number]['valor'];

export function rotuloDaAtividade(valor: string | null): string {
  return ATIVIDADES.find((a) => a.valor === valor)?.rotulo ?? '—';
}

/* ---------------------------------------------------------
   WhatsApp

   Guardado só com dígitos, como o CPF. A máscara é coisa de tela, e a
   exportação para o Excel (em `operacao-evento`) formata na saída.
   --------------------------------------------------------- */

/** DDD válido (11 a 99) e 8 ou 9 dígitos de número. */
export function whatsappValido(valor: string): boolean {
  const d = somenteDigitos(valor);
  if (d.length !== 10 && d.length !== 11) return false;
  const ddd = Number(d.slice(0, 2));
  if (ddd < 11 || ddd > 99) return false;
  // Celular de 9 dígitos sempre começa com 9; fixo de 8 nunca começa com 0 ou 1.
  if (d.length === 11 && d[2] !== '9') return false;
  if (d.length === 10 && (d[2] === '0' || d[2] === '1')) return false;
  return true;
}

/** `(69) 99999-0000` */
export function formatarWhatsapp(valor: string): string {
  const d = somenteDigitos(valor);
  if (d.length === 11) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  if (d.length === 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  return valor;
}

/** Máscara enquanto a pessoa digita, sem atrapalhar o apagar. */
export function mascaraDeWhatsapp(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  const corte = d.length > 10 ? 7 : 6;
  if (d.length <= corte) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, corte)}-${d.slice(corte)}`;
}

/* ---------------------------------------------------------
   Mensagens

   Reunidas num lugar só para que a mesma recusa nunca apareça com duas
   redações diferentes — e para que a revisão de texto seja um diff curto.
   --------------------------------------------------------- */

export const MENSAGENS = {
  cpfJaConfirmado:
    'Esse CPF já tem presença confirmada no Circuito Acelera no Campo 3.0. ' +
    'Cada CPF confirma em uma única palestra. Se você precisa trocar de ' +
    'palestra, cancele a confirmação anterior pelo ingresso ou fale com o ' +
    'colaborador que enviou o convite.',

  conviteJaUtilizado:
    'Este convite já foi utilizado. Se a confirmação foi sua, recupere o ' +
    'seu ingresso informando o CPF e o código do convite.',

  prazoVencido:
    'O prazo de confirmação desta palestra já encerrou. Fale com o ' +
    'colaborador da Nossa Lavoura que enviou o convite.',

  conviteCancelado:
    'Este convite foi cancelado e não pode mais ser usado. Fale com o ' +
    'colaborador da Nossa Lavoura que enviou o convite.',

  limiteExcedido:
    'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.',

  falhaGenerica:
    'Não foi possível concluir agora. Tente de novo em alguns instantes.',

  recuperacaoSemResultado:
    'Não encontramos um ingresso com esse CPF e esse código. Confira os dois ' +
    'e tente de novo.',

  cancelamentoForaDoPrazo:
    'O prazo de cancelamento desta palestra já encerrou.',
} as const;

/** A confirmação vale para uma palestra só — dito antes do envio. */
export const AVISO_DE_PALESTRA_UNICA =
  'Cada CPF confirma presença em uma única palestra do circuito. ' +
  'Ao confirmar aqui, você não poderá confirmar em outra cidade.';
