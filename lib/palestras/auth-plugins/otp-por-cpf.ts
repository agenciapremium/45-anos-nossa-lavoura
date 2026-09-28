import 'server-only';

import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createAuthEndpoint } from 'better-auth/api';
import { setSessionCookie } from 'better-auth/cookies';
import type { BetterAuthPlugin } from 'better-auth';

import { db } from '@/lib/db';
import { user as tabelaDeUsuario, type Papel } from '@/lib/db/schema';
import { somenteDigitos } from '@/lib/palestras/cpf';
import {
  TENTATIVAS_POR_CODIGO,
  VALIDADE_DO_CODIGO_SEGUNDOS,
} from '@/lib/palestras/limite-politicas';
import { mascararEmail } from '@/lib/palestras/mascaras';
import { duracaoDaSessao } from '@/lib/palestras/papeis';

import {
  gerarCodigo,
  iguaisEmTempoConstante,
  impressaoDoCodigo,
  lerValor,
  montarValor,
} from './comum';

/* =========================================================
   Plugin · OTP por CPF

   Não é o "email OTP" nativo do Better Auth, e a diferença não é cosmética:
   **o identificador digitado é o CPF**, não o e-mail. O plugin resolve
   CPF → usuário → e-mail vinculado, gera o código, manda enviar e devolve o
   e-mail mascarado para a tela (D1 do design).

   Duas coisas que este plugin faz questão de **não** fazer:

   - **Não diz se o CPF existe.** Um CPF desconhecido, um CPF sem e-mail e
     um usuário desativado produzem exatamente a mesma resposta: sem
     e-mail mascarado. A única informação que escapa é a existência de um
     cadastro *com e-mail*, e ela escapa de propósito — sem o endereço
     mascarado a pessoa não sabe em que caixa procurar (D3 do design).
   - **Não guarda o código.** O banco guarda a impressão HMAC dele.

   O contador de tentativas vive junto da impressão, na linha de
   verificação: cinco erros invalidam o código, como manda a spec.
   ========================================================= */

const PREFIXO = 'otp-cpf:';

/*
   Os esquemas descrevem a FORMA do corpo, e só. A validação de verdade —
   CPF com dígito verificador, código de seis dígitos — não acontece aqui:
   recusar cedo, com mensagem específica, transformaria o endpoint num
   validador de CPF para quem está adivinhando. Tudo o que não presta
   segue o mesmo caminho e recebe a mesma resposta neutra.
*/
const corpoDoEnvio = z.object({ cpf: z.string() });
const corpoDaVerificacao = z.object({ cpf: z.string(), codigo: z.string() });

export type EnvioDeCodigo = {
  para: string;
  nome: string | null;
  codigo: string;
  minutos: number;
};

export type OpcoesDeOtpPorCpf = {
  /**
   * Entrega o código. Recebe o e-mail em claro — é o destinatário — e
   * devolve se conseguiu enviar.
   *
   * Uma falha de envio **não** vira erro para quem chamou: a resposta
   * continua sendo a neutra. Quem registra a falha é a camada de e-mail.
   */
  enviarCodigo: (envio: EnvioDeCodigo) => Promise<boolean>;
};

type Resultado =
  | { enviado: true; emailMascarado: string }
  | { enviado: false; emailMascarado: null };

async function porCpf(cpf: string) {
  const digitos = somenteDigitos(cpf);
  if (digitos.length !== 11) return null;
  const [linha] = await db()
    .select({
      id: tabelaDeUsuario.id,
      nome: tabelaDeUsuario.name,
      email: tabelaDeUsuario.email,
      papel: tabelaDeUsuario.papel,
      ativo: tabelaDeUsuario.ativo,
    })
    .from(tabelaDeUsuario)
    .where(eq(tabelaDeUsuario.cpf, digitos))
    .limit(1);
  return linha ?? null;
}

export const otpPorCpf = (opcoes: OpcoesDeOtpPorCpf) =>
  ({
    id: 'otp-por-cpf',
    endpoints: {
      /* ---------------------------------------------------
         Passo 1 · CPF entra, código sai
         --------------------------------------------------- */
      enviarCodigoPorCpf: createAuthEndpoint(
        '/palestras/otp-cpf/enviar',
        { method: 'POST', body: corpoDoEnvio },
        async (ctx): Promise<Resultado> => {
          const cpf = ctx.body.cpf;

          const neutro: Resultado = { enviado: false, emailMascarado: null };

          const usuario = await porCpf(cpf);
          // Desativado entra aqui de propósito: a recusa por desativação
          // tem de ser indistinguível da de CPF inexistente.
          if (!usuario || !usuario.ativo || !usuario.email) return neutro;

          // Um novo código invalida o anterior (spec de proteção contra
          // abuso). Apagar antes de criar é o que garante isso, mesmo que
          // o envio falhe depois.
          const identificador = `${PREFIXO}${usuario.id}`;
          await ctx.context.internalAdapter.deleteVerificationByIdentifier(
            identificador,
          );

          const codigo = gerarCodigo();
          await ctx.context.internalAdapter.createVerificationValue(
            {
              identifier: identificador,
              value: montarValor(impressaoDoCodigo(codigo), 0),
              expiresAt: new Date(
                Date.now() + VALIDADE_DO_CODIGO_SEGUNDOS * 1000,
              ),
            },
            ctx,
          );

          await opcoes.enviarCodigo({
            para: usuario.email,
            nome: usuario.nome,
            codigo,
            minutos: Math.round(VALIDADE_DO_CODIGO_SEGUNDOS / 60),
          });

          // Mesmo com falha de envio a resposta é positiva: dizer "não
          // consegui enviar" confirmaria que há um e-mail ali. A falha já
          // foi registrada pela camada de e-mail, e a tela sempre oferece
          // reenviar.
          return { enviado: true, emailMascarado: mascararEmail(usuario.email) };
        },
      ),

      /* ---------------------------------------------------
         Passo 2 · código entra, sessão sai
         --------------------------------------------------- */
      verificarCodigoPorCpf: createAuthEndpoint(
        '/palestras/otp-cpf/verificar',
        { method: 'POST', body: corpoDaVerificacao },
        async (
          ctx,
        ): Promise<
          | { entrou: true; papel: Papel; usuarioId: string }
          | { entrou: false; motivo: 'recusado' | 'expirado' | 'esgotado' }
        > => {
          const cpf = ctx.body.cpf;
          const codigo = somenteDigitos(ctx.body.codigo);

          const recusado = { entrou: false, motivo: 'recusado' } as const;

          const usuario = await porCpf(cpf);
          if (!usuario || !usuario.ativo) return recusado;

          const identificador = `${PREFIXO}${usuario.id}`;
          const linha =
            await ctx.context.internalAdapter.findVerificationValue(
              identificador,
            );
          if (!linha) return recusado;

          if (new Date(linha.expiresAt).getTime() <= Date.now()) {
            await ctx.context.internalAdapter.deleteVerificationValue(linha.id);
            return { entrou: false, motivo: 'expirado' };
          }

          const { impressao, tentativas } = lerValor(linha.value);

          if (!iguaisEmTempoConstante(impressao, impressaoDoCodigo(codigo))) {
            const agora = tentativas + 1;
            if (agora >= TENTATIVAS_POR_CODIGO) {
              // Cinco erros no mesmo código: ele morre aqui e um novo
              // precisa ser pedido.
              await ctx.context.internalAdapter.deleteVerificationValue(
                linha.id,
              );
              return { entrou: false, motivo: 'esgotado' };
            }
            await ctx.context.internalAdapter.updateVerificationValue(
              linha.id,
              { value: montarValor(impressao, agora) },
            );
            return recusado;
          }

          // Código certo: some da tabela antes de a sessão nascer. Um
          // código de uso único que sobrevive ao uso não é de uso único.
          await ctx.context.internalAdapter.deleteVerificationValue(linha.id);

          const papel = usuario.papel as Papel;
          // A expiração por papel e a recusa de usuário desativado moram
          // no gatilho `session.create.before` de `auth.ts`: um ponto só
          // para os quatro métodos, em vez de quatro cópias da regra.
          const sessao = await ctx.context.internalAdapter.createSession(
            usuario.id,
            ctx,
          );
          if (!sessao) return recusado;

          const completo = await ctx.context.internalAdapter.findUserById(
            usuario.id,
          );
          if (!completo) return recusado;

          await setSessionCookie(ctx, { session: sessao, user: completo }, false, {
            maxAge: duracaoDaSessao(papel),
          });

          return { entrou: true, papel, usuarioId: usuario.id };
        },
      ),
    },
  }) satisfies BetterAuthPlugin;
