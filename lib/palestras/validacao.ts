import { z } from 'zod';

import { PAPEIS } from '@/lib/db/schema';
import { cpfValido, somenteDigitos } from '@/lib/palestras/cpf';
import { explicarProblemas, validarMensagem } from '@/lib/palestras/mensagem';
import { dataBrParaISO, deHoraLocal } from '@/lib/tempo';

/* =========================================================
   Esquemas compartilhados entre formulário e servidor.

   O mesmo objeto valida os dois lados: a tela mostra o erro antes de enviar,
   o servidor recusa de novo ao receber. Duas validações escritas em lugares
   diferentes divergem — é só questão de quando.
   ========================================================= */

const textoObrigatorio = (campo: string, max = 200) =>
  z
    .string()
    .trim()
    .min(1, `${campo} é obrigatório.`)
    .max(max, `${campo} passa de ${max} caracteres.`);

const dataHoraLocal = z
  .string()
  .trim()
  .min(1, 'Informe a data e a hora.')
  .refine((v) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(v), {
    message: 'Data e hora em formato inválido.',
  });

/* ---------------------------------------------------------
   Palestra
   --------------------------------------------------------- */

export const esquemaDePalestra = z
  .object({
    cidade: textoObrigatorio('A cidade', 120),
    dataHoraLocal,
    localNome: textoObrigatorio('O nome do local', 160),
    localEndereco: textoObrigatorio('O endereço', 300),
    /** Vazio = recalcular pela véspera. */
    prazoLocal: z.string().trim().optional(),
    mensagemWhatsapp: z
      .string()
      .trim()
      .min(1, 'A mensagem é obrigatória.')
      .max(4000, 'A mensagem passa de 4000 caracteres.'),
    ativo: z.boolean().default(true),
  })
  .superRefine((valor, ctx) => {
    const problemas = validarMensagem(valor.mensagemWhatsapp);
    if (problemas.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['mensagemWhatsapp'],
        message: explicarProblemas(problemas),
      });
    }

    if (!valor.prazoLocal) return;

    let palestra: Date;
    let prazo: Date;
    try {
      palestra = deHoraLocal(valor.dataHoraLocal);
      prazo = deHoraLocal(valor.prazoLocal);
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['prazoLocal'],
        message: 'Prazo em formato inválido.',
      });
      return;
    }

    // Regra de negócio explícita da spec: o prazo é sempre ANTES da palestra.
    if (prazo.getTime() >= palestra.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['prazoLocal'],
        message:
          'O prazo de confirmação precisa ser anterior à data e hora da palestra.',
      });
    }
  });

export type EntradaDePalestra = z.input<typeof esquemaDePalestra>;
export type PalestraValidada = z.output<typeof esquemaDePalestra>;

/* ---------------------------------------------------------
   Estrutura organizacional
   --------------------------------------------------------- */

export const esquemaDeRegional = z.object({
  nome: textoObrigatorio('O nome da regional', 120),
  ativo: z.boolean().default(true),
});

export const esquemaDeLoja = z.object({
  regionalId: textoObrigatorio('A regional', 64),
  codigo: textoObrigatorio('O código da loja', 40),
  nome: textoObrigatorio('O nome da loja', 160),
  cidade: z.string().trim().max(120).optional().or(z.literal('')),
  ativo: z.boolean().default(true),
});

const cpfZod = z
  .string()
  .trim()
  .min(1, 'O CPF é obrigatório.')
  .refine((v) => cpfValido(v), 'CPF inválido: confira o dígito verificador.')
  .transform(somenteDigitos);

const dataNascimentoZod = z
  .string()
  .trim()
  .min(1, 'A data de nascimento é obrigatória.')
  .refine(
    (v) => dataBrParaISO(v) !== null,
    'Data de nascimento inválida. Use DD/MM/AAAA.',
  )
  .transform((v) => dataBrParaISO(v) as string);

export const esquemaDeUsuario = z
  .object({
    nome: textoObrigatorio('O nome', 200),
    cpf: cpfZod,
    dataNascimento: dataNascimentoZod,
    email: z
      .string()
      .trim()
      .email('E-mail inválido.')
      .optional()
      .or(z.literal(''))
      .transform((v) => (v ? v.toLowerCase() : null)),
    whatsapp: z
      .string()
      .trim()
      .max(30)
      .optional()
      .or(z.literal(''))
      .transform((v) => (v ? v : null)),
    papel: z.enum(PAPEIS, {
      errorMap: () => ({
        message: `Papel inválido. Os aceitos são: ${PAPEIS.join(', ')}.`,
      }),
    }),
    regionalId: z
      .string()
      .trim()
      .optional()
      .or(z.literal(''))
      .transform((v) => (v ? v : null)),
    lojaId: z
      .string()
      .trim()
      .optional()
      .or(z.literal(''))
      .transform((v) => (v ? v : null)),
    ativo: z.boolean().default(true),
  })
  .superRefine((valor, ctx) => {
    // O escopo exigido depende do papel — a regra está numa lista só,
    // em `schema.ts`, para a tela, o servidor e o CSV usarem a mesma.
    if (
      (valor.papel === 'colaborador' || valor.papel === 'gerente_loja') &&
      !valor.lojaId
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['lojaId'],
        message: `A loja é obrigatória para o papel ${valor.papel}.`,
      });
    }
    if (valor.papel === 'gerente_regional' && !valor.regionalId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['regionalId'],
        message: 'A regional é obrigatória para o papel gerente_regional.',
      });
    }
  });

export type UsuarioValidado = z.output<typeof esquemaDeUsuario>;

/* ---------------------------------------------------------
   Geração de convites
   --------------------------------------------------------- */

export const esquemaDeQuantidade = z
  .number({ invalid_type_error: 'Quantidade inválida.' })
  .int('A quantidade precisa ser um número inteiro.')
  .positive('A quantidade precisa ser maior que zero.')
  .max(500, 'No máximo 500 convites por colaborador em uma operação.');

export const esquemaDeGeracao = z.object({
  eventoId: textoObrigatorio('A palestra', 64),
  quantidades: z
    .array(
      z.object({
        colaboradorId: z.string().trim().min(1),
        quantidade: esquemaDeQuantidade,
      }),
    )
    .min(1, 'Selecione ao menos um colaborador.'),
});

/* ---------------------------------------------------------
   Utilitário: erros do Zod por campo
   --------------------------------------------------------- */

export type ErrosPorCampo = Record<string, string>;

export function errosPorCampo(erro: z.ZodError): ErrosPorCampo {
  const saida: ErrosPorCampo = {};
  for (const problema of erro.issues) {
    const campo = problema.path.join('.') || '_';
    saida[campo] ??= problema.message;
  }
  return saida;
}
