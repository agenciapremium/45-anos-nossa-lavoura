import { z } from 'zod';

import { cpfValido, somenteDigitos } from '@/lib/palestras/cpf';
import { VALORES_DE_ATIVIDADE, whatsappValido } from '@/lib/palestras/confirmacao';

/* =========================================================
   Esquema de confirmação

   O mesmo objeto valida os dois lados: a tela mostra o erro antes de
   enviar, o servidor recusa de novo ao receber, porque o formulário é do
   visitante e pode ser contornado. Duas validações escritas em lugares
   diferentes divergem — é só questão de quando.

   Separado de `confirmacao.ts` para que o Zod não atravesse a fronteira
   até o navegador: quem abre este link está num celular, no interior de
   Rondônia, e cada quilobyte é tempo de tela em branco.
   ========================================================= */

const texto = (campo: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${campo} é obrigatório.`)
    .max(max, `${campo} passa de ${max} caracteres.`);

/**
 * Nome completo, não só o primeiro.
 *
 * A recepção confere o nome do ingresso contra um documento na porta do
 * evento; "João" não serve para isso. Duas palavras de duas letras é o
 * mínimo que não recusa um nome legítimo curto.
 */
const nomeCompleto = (campo: string) =>
  texto(campo, 200).refine(
    (v) => v.split(/\s+/).filter((p) => p.length >= 2).length >= 2,
    `${campo} precisa vir completo, com nome e sobrenome.`,
  );

export const esquemaDeConfirmacao = z.object({
  cpf: z
    .string()
    .trim()
    .min(1, 'O CPF é obrigatório.')
    .refine(cpfValido, 'CPF inválido: confira os números digitados.')
    .transform(somenteDigitos),

  nome: nomeCompleto('O nome'),

  whatsapp: z
    .string()
    .trim()
    .min(1, 'O WhatsApp é obrigatório.')
    .refine(whatsappValido, 'WhatsApp inválido. Informe DDD e número.')
    .transform(somenteDigitos),

  cidade: texto('A cidade', 120),
  propriedade: texto('O nome da propriedade', 160),

  atividade: z.enum(VALORES_DE_ATIVIDADE, {
    errorMap: () => ({ message: 'Escolha a atividade da propriedade.' }),
  }),

  acompanhanteNome: z
    .string()
    .trim()
    .max(200, 'O nome do acompanhante passa de 200 caracteres.')
    .optional()
    .or(z.literal(''))
    .transform((v) => (v ? v : null)),

  aceitePolitica: z.literal(true, {
    errorMap: () => ({
      message: 'Para confirmar, é preciso autorizar o uso dos seus dados.',
    }),
  }),

  aceiteComunicacoes: z.boolean().default(false),
});

export type EntradaDeConfirmacao = z.input<typeof esquemaDeConfirmacao>;
export type ConfirmacaoValidada = z.output<typeof esquemaDeConfirmacao>;

/** Campos do formulário, na ordem em que aparecem na tela. */
export const CAMPOS_DO_FORMULARIO = [
  'cpf',
  'nome',
  'whatsapp',
  'cidade',
  'propriedade',
  'atividade',
  'acompanhanteNome',
  'aceitePolitica',
  'aceiteComunicacoes',
] as const;

/**
 * Lê o `FormData` como o esquema espera.
 *
 * Caixa de seleção não enviada simplesmente não existe no `FormData` — daí
 * a conversão explícita para booleano, em vez de deixar `undefined` chegar
 * ao Zod como "campo ausente".
 */
export function lerFormularioDeConfirmacao(
  dados: FormData,
): Record<string, unknown> {
  const ler = (campo: string) => String(dados.get(campo) ?? '');
  return {
    cpf: ler('cpf'),
    nome: ler('nome'),
    whatsapp: ler('whatsapp'),
    cidade: ler('cidade'),
    propriedade: ler('propriedade'),
    atividade: ler('atividade'),
    acompanhanteNome: ler('acompanhanteNome'),
    aceitePolitica: dados.get('aceitePolitica') != null,
    aceiteComunicacoes: dados.get('aceiteComunicacoes') != null,
  };
}
