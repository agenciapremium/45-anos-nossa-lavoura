import 'server-only';

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { magicLink } from 'better-auth/plugins/magic-link';
import { eq } from 'drizzle-orm';

import { db, dbTx } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { user as tabelaDeUsuario, type Papel } from '@/lib/db/schema';
import { env } from '@/lib/env';
import { cpfENascimento } from '@/lib/palestras/auth-plugins/cpf-e-nascimento';
import { otpPorCpf } from '@/lib/palestras/auth-plugins/otp-por-cpf';
import { EmailDeCodigoDeAcesso, EmailDeLinkMagico, EmailDeSenha } from '@/lib/palestras/email/modelos';
import { enviarEmail } from '@/lib/palestras/email/enviar';
import {
  VALIDADE_DO_LINK_DE_SENHA_SEGUNDOS,
  VALIDADE_DO_LINK_MAGICO_SEGUNDOS,
} from '@/lib/palestras/limite-politicas';
import {
  SETE_DIAS_EM_SEGUNDOS,
  duracaoDaSessao,
} from '@/lib/palestras/papeis';

/* =========================================================
   Better Auth sobre o Neon

   Reaproveita as quatro tabelas que `fundacao` já criou (`user`, `session`,
   `account`, `verification`), com a `user` estendida por papel, vínculos,
   CPF e data de nascimento. Nenhuma migração nova foi necessária para a
   autenticação em si — o esquema foi desenhado para receber esta change.

   Três decisões que valem a pena conhecer antes de mexer aqui:

   ── 1. O manipulador HTTP do Better Auth **não é montado**.

   Não existe `/api/auth/[...all]`. Todo fluxo de autenticação entra por
   Server Action ou por Route Handler deste projeto, que chamam `auth.api.*`
   do lado do servidor.

   O motivo é a spec: bloqueio por CPF e por IP, respostas neutras e
   registro das tentativas vivem na camada de serviço
   (`servicos/autenticacao.ts`). Montar o manipulador publicaria
   `/api/auth/sign-in/email`, que responde "user not found" e não passa por
   nada disso — um verificador de cadastro pronto, ao lado da porta que
   acabamos de trancar.

   ── 2. O cache de sessão em cookie está **desligado**.

   O Better Auth sabe guardar a sessão assinada no próprio cookie e evitar
   uma leitura por requisição. Seria mais rápido, e tornaria a desativação
   de um usuário demorada até o cache vencer. D5 do design pede efeito
   imediato; a leitura por requisição é o preço, e é baixo na escala do
   projeto.

   ── 3. A sessão **não é rolante**.

   `updateAge` igual a `expiresIn` faz o Better Auth nunca esticar a
   validade. "12 horas" quer dizer 12 horas desde o login, não 12 horas
   desde o último clique.
   ========================================================= */

const origensConfiaveis = Array.from(
  new Set([env().BETTER_AUTH_URL, env().APP_BASE_URL]),
);

const emProducao = process.env.NODE_ENV === 'production';

/** Papel e estado de um usuário, para o gatilho de criação de sessão. */
async function papelEEstado(
  usuarioId: string,
): Promise<{ papel: Papel; ativo: boolean } | null> {
  const [linha] = await db()
    .select({ papel: tabelaDeUsuario.papel, ativo: tabelaDeUsuario.ativo })
    .from(tabelaDeUsuario)
    .where(eq(tabelaDeUsuario.id, usuarioId))
    .limit(1);
  return linha ? { papel: linha.papel as Papel, ativo: linha.ativo } : null;
}

export const auth = betterAuth({
  appName: 'Circuito Acelera no Campo 3.0',
  secret: env().BETTER_AUTH_SECRET,
  baseURL: env().BETTER_AUTH_URL,
  trustedOrigins: origensConfiaveis,

  /*
     A conexão por WebSocket, não a HTTP. O adaptador do Drizzle envolve
     algumas operações em transação, e o transporte HTTP do Neon abre uma
     sessão por consulta: a transação não daria erro, simplesmente não
     valeria (ver o cabeçalho de `lib/db/index.ts`).
  */
  database: drizzleAdapter(dbTx(), {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),

  user: {
    modelName: 'user',
    /*
       Campos do domínio que a sessão precisa carregar. Todos com
       `input: false`: nenhum deles pode chegar por corpo de requisição.
       `papel` decide o que a pessoa vê — se pudesse ser enviado, o
       controle de acesso inteiro seria decorativo.
    */
    additionalFields: {
      /*
         Os nomes aqui são os das PROPRIEDADES do esquema Drizzle
         (`regionalId`), não os das colunas (`regional_id`): o adaptador
         procura `schema.user[campo]`, e é a definição da coluna que
         carrega o nome físico. Declarar `fieldName: 'regional_id'` faz o
         adaptador procurar uma propriedade que não existe — o campo volta
         vazio, o escopo fica incompleto e todo gerente leva 403.
      */
      cpf: { type: 'string', required: true, input: false },
      dataNascimento: { type: 'string', required: true, input: false },
      whatsapp: { type: 'string', required: false, input: false },
      papel: { type: 'string', required: true, input: false },
      regionalId: { type: 'string', required: false, input: false },
      lojaId: { type: 'string', required: false, input: false },
      ativo: { type: 'boolean', required: true, input: false },
    },
  },

  session: {
    /*
       Teto do cookie: o maior dos dois prazos. A duração de verdade é a da
       linha em `session`, gravada por papel no gatilho abaixo. Um cookie
       que sobrevive à sessão não dá acesso nenhum — a próxima requisição
       não encontra sessão válida e o middleware apaga o cookie.
    */
    expiresIn: SETE_DIAS_EM_SEGUNDOS,
    // Igual a `expiresIn`: desliga a renovação por atividade.
    updateAge: SETE_DIAS_EM_SEGUNDOS,
    cookieCache: { enabled: false },
  },

  advanced: {
    cookiePrefix: 'palestras',
    useSecureCookies: emProducao,
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: emProducao,
    },
  },

  emailAndPassword: {
    enabled: true,
    /*
       Ninguém se cadastra sozinho: usuários nascem da importação de CSV ou
       do cadastro do Admin (Non-Goals do design).
    */
    disableSignUp: true,
    requireEmailVerification: false,
    autoSignIn: false,
    minPasswordLength: 10,
    maxPasswordLength: 200,
    resetPasswordTokenExpiresIn: VALIDADE_DO_LINK_DE_SENHA_SEGUNDOS,
    sendResetPassword: async ({ user, token }) => {
      if (!user.email) return;
      const url = `${env().APP_BASE_URL}/palestras/entrar/senha/nova?t=${encodeURIComponent(token)}`;
      await enviarEmail({
        para: user.email,
        assunto: 'Redefina a sua senha · Acelera no Campo 3.0',
        conteudo: EmailDeSenha({
          nome: user.name,
          url,
          minutos: Math.round(VALIDADE_DO_LINK_DE_SENHA_SEGUNDOS / 60),
          primeiroAcesso: false,
        }),
      });
    },
  },

  databaseHooks: {
    session: {
      create: {
        /*
           O ponto único por onde passam os quatro métodos de login.

           Aqui acontecem duas coisas que, espalhadas, dariam quatro
           oportunidades de esquecimento:

           1. **Usuário desativado não abre sessão.** Devolver `false`
              aborta a criação, e quem chamou trata como credencial
              recusada — a mensagem genérica de sempre.
           2. **A sessão dura o que o papel manda**: 12 horas para
              colaborador e recepção, 7 dias para admin e gerentes.
        */
        before: async (sessao) => {
          const estado = await papelEEstado(sessao.userId);
          if (!estado || !estado.ativo) return false;
          return {
            data: {
              expiresAt: new Date(
                Date.now() + duracaoDaSessao(estado.papel) * 1000,
              ),
            },
          };
        },
      },
    },
  },

  plugins: [
    magicLink({
      expiresIn: VALIDADE_DO_LINK_MAGICO_SEGUNDOS,
      // Sem cadastro automático: um e-mail desconhecido não vira usuário.
      disableSignUp: true,
      /*
         O link aponta para uma rota deste projeto, não para o endpoint
         nativo — que não está montado. Quem verifica o token é
         `app/palestras/entrar/link/route.ts`.
      */
      sendMagicLink: async ({ email, token }) => {
        const url = `${env().APP_BASE_URL}/palestras/entrar/link?t=${encodeURIComponent(token)}`;
        await enviarEmail({
          para: email,
          assunto: 'Seu link de acesso · Acelera no Campo 3.0',
          conteudo: EmailDeLinkMagico({
            nome: null,
            url,
            minutos: Math.round(VALIDADE_DO_LINK_MAGICO_SEGUNDOS / 60),
          }),
        });
      },
    }),

    otpPorCpf({
      enviarCodigo: async ({ para, nome, codigo, minutos }) => {
        const resultado = await enviarEmail({
          para,
          assunto: 'Seu código de acesso · Acelera no Campo 3.0',
          conteudo: EmailDeCodigoDeAcesso({ nome, codigo, minutos }),
        });
        return resultado.enviado;
      },
    }),

    cpfENascimento(),

    /*
       Precisa ser o último: o gancho lê os cabeçalhos que os demais
       plugins produziram e grava os cookies pelo `cookies()` do Next.
    */
    nextCookies(),
  ],
});

export type Sessao = typeof auth.$Infer.Session;

/** Nome do cookie de sessão, montado com o mesmo prefixo configurado acima. */
export const COOKIE_DE_SESSAO = 'palestras.session_token';
/** Em HTTPS o Better Auth prefixa o cookie com `__Secure-`. */
export const COOKIE_DE_SESSAO_SEGURO = `__Secure-${COOKIE_DE_SESSAO}`;

/** E-mail de definição de senha no primeiro acesso. */
export async function enviarConviteParaDefinirSenha(alvo: {
  email: string;
  nome: string | null;
  token: string;
}): Promise<boolean> {
  const url = `${env().APP_BASE_URL}/palestras/entrar/senha/nova?t=${encodeURIComponent(alvo.token)}`;
  const resultado = await enviarEmail({
    para: alvo.email,
    assunto: 'Defina a sua senha · Acelera no Campo 3.0',
    conteudo: EmailDeSenha({
      nome: alvo.nome,
      url,
      minutos: Math.round(VALIDADE_DO_LINK_DE_SENHA_SEGUNDOS / 60),
      primeiroAcesso: true,
    }),
  });
  return resultado.enviado;
}
