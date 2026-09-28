import 'server-only';

import { z } from 'zod';

/**
 * Configuração de servidor, validada com Zod.
 *
 * Duas garantias desta implementação:
 *
 * - **Falha explícita**: se faltar variável obrigatória, a leitura lança um
 *   erro nomeando exatamente quais faltaram, sem imprimir o valor de
 *   nenhuma outra. `instrumentation.ts` força essa leitura na subida do
 *   servidor, para o erro aparecer na inicialização e não no primeiro
 *   pedido que por acaso tocar no banco.
 * - **Nada vaza para o cliente**: o módulo é `server-only`, então qualquer
 *   import a partir de um componente cliente quebra o build. Nenhuma das
 *   variáveis tem prefixo `NEXT_PUBLIC_`, então o bundler do navegador
 *   também não as substitui.
 */
/**
 * Valores que o `.env.example` traz para serem substituídos. Tratá-los como
 * ausentes evita o pior dos mundos: uma configuração que parece pronta e
 * falha só na primeira tentativa de envio.
 */
const PLACEHOLDERS = new Set([
  're_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  'DEFINIR',
  'defina-no-painel-do-resend',
]);

const esquema = z.object({
  /** String de conexão do Neon. */
  DATABASE_URL: z
    .string()
    .min(1, 'obrigatória')
    .refine(
      (v) => v.startsWith('postgres://') || v.startsWith('postgresql://'),
      'deve ser uma URL postgres:// ou postgresql://',
    ),

  /**
   * Origem pública desta instalação, usada para montar o link do convite
   * (`{origem}/palestras/c/{codigo}`). Varia por ambiente.
   */
  APP_BASE_URL: z
    .string()
    .min(1, 'obrigatória')
    .url('deve ser uma URL absoluta, com esquema')
    .transform((v) => v.replace(/\/+$/, '')),

  /** Segredo que autoriza a rotina diária de expiração. */
  CRON_SECRET: z.string().min(16, 'deve ter ao menos 16 caracteres'),

  /**
   * Segredo do Better Auth: assina cookies de sessão e tokens de
   * verificação. Trocá-lo derruba todas as sessões e invalida os links
   * mágicos em trânsito — o que é exatamente o que se quer num vazamento.
   *
   * Gere com:
   *   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
   */
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, 'deve ter ao menos 32 caracteres'),

  /**
   * Origem que o Better Auth considera sua. É a base dos links de acesso e
   * a origem confiável na verificação contra CSRF, por isso é separada de
   * `APP_BASE_URL`: num preview as duas coincidem, mas nada obriga.
   */
  BETTER_AUTH_URL: z
    .string()
    .min(1, 'obrigatória')
    .url('deve ser uma URL absoluta, com esquema')
    .transform((v) => v.replace(/\/+$/, '')),

  /**
   * Chave do Resend. **Opcional de propósito**: sem ela o envio falha com
   * mensagem neutra e registro no log, e o restante do sistema continua de
   * pé — quem tem senha ou CPF + nascimento ainda entra. Derrubar a
   * aplicação inteira por falta de e-mail seria pior que o problema.
   */
  RESEND_API_KEY: z
    .string()
    .trim()
    .min(1)
    .optional()
    .transform((v) => (v && !PLACEHOLDERS.has(v) ? v : undefined)),

  /**
   * Remetente dos e-mails transacionais. Precisa ser do domínio
   * `agpremium.com.br`, que é onde SPF, DKIM e DMARC estão configurados —
   * um remetente de outro domínio entrega direto no spam.
   */
  EMAIL_FROM: z
    .string()
    .trim()
    .min(1)
    .default('Acelera no Campo <palestras@agpremium.com.br>')
    .refine(
      (v) => /@agpremium\.com\.br>?\s*$/.test(v),
      'o remetente precisa ser um endereço do domínio agpremium.com.br',
    ),
});


export type Ambiente = z.infer<typeof esquema>;

let cache: Ambiente | null = null;

function ler(): Ambiente {
  const resultado = esquema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    APP_BASE_URL: process.env.APP_BASE_URL,
    CRON_SECRET: process.env.CRON_SECRET,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? process.env.APP_BASE_URL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
  });

  if (resultado.success) return resultado.data;

  // A mensagem nomeia a variável e o motivo, e nunca inclui valores.
  const problemas = resultado.error.issues
    .map((issue) => {
      const nome = issue.path.join('.') || '(raiz)';
      const motivo =
        issue.code === 'invalid_type' && issue.received === 'undefined'
          ? 'ausente'
          : issue.message;
      return `  - ${nome}: ${motivo}`;
    })
    .join('\n');

  throw new Error(
    'Configuração inválida. Corrija as variáveis de ambiente abaixo ' +
      '(veja .env.example):\n' +
      problemas,
  );
}

/** Lê e valida a configuração. Lança na primeira chamada se algo faltar. */
export function env(): Ambiente {
  cache ??= ler();
  return cache;
}

/** Só para testes: descarta o cache entre cenários. */
export function limparCacheDeAmbiente(): void {
  cache = null;
}
