import 'server-only';

import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createAuthEndpoint } from 'better-auth/api';
import { setSessionCookie } from 'better-auth/cookies';
import type { BetterAuthPlugin } from 'better-auth';

import { db } from '@/lib/db';
import { user as tabelaDeUsuario, type Papel } from '@/lib/db/schema';
import { somenteDigitos } from '@/lib/palestras/cpf';
import { duracaoDaSessao, metodoPermitido } from '@/lib/palestras/papeis';
import { dataBrParaISO } from '@/lib/tempo';

import { iguaisEmTempoConstante } from './comum';

/* =========================================================
   Plugin · CPF e data de nascimento

   A credencial fraca do sistema, e o desenho assume isso (D2 do design).
   Existe porque parte dos colaboradores de loja não tem e-mail corporativo
   — e são eles que distribuem os convites. Sem este método, o grupo que
   opera a distribuição fica de fora.

   As travas que acompanham:

   1. **Só `colaborador` e `recepcao`.** A verificação acontece DEPOIS de
      resolver o usuário: um gerente com CPF e data de nascimento corretos é
      recusado, e a recusa é igual à de dados errados.
   2. **Sessão de 12 horas**, como nos demais métodos desses papéis.
   3. **Bloqueio por tentativas**, por CPF e por IP — aplicado antes daqui,
      na camada de serviço.

   A resposta é a mesma em todos os casos de recusa: CPF inexistente, data
   errada, papel de gestão, usuário desativado. Qualquer diferença entre
   eles transformaria o endpoint num verificador de cadastro.
   ========================================================= */

type Resultado =
  | { entrou: true; papel: Papel; usuarioId: string }
  | { entrou: false };

const RECUSADO: Resultado = { entrou: false };

/* Só a forma do corpo. O conteúdo é julgado adiante, e qualquer problema
   produz a mesma recusa — inclusive um CPF com dígito verificador errado. */
const corpo = z.object({ cpf: z.string(), dataNascimento: z.string() });

export const cpfENascimento = () =>
  ({
    id: 'cpf-e-nascimento',
    endpoints: {
      entrarPorCpfENascimento: createAuthEndpoint(
        '/palestras/cpf-nascimento/entrar',
        { method: 'POST', body: corpo },
        async (ctx): Promise<Resultado> => {
          const cpf = somenteDigitos(ctx.body.cpf);
          const informada = ctx.body.dataNascimento.trim();

          if (cpf.length !== 11 || !informada) return RECUSADO;

          // Aceita DD/MM/AAAA (o que a pessoa digita) e AAAA-MM-DD (o que o
          // campo `type="date"` envia).
          const iso = /^\d{4}-\d{2}-\d{2}$/.test(informada)
            ? informada
            : dataBrParaISO(informada);
          if (!iso) return RECUSADO;

          const [usuario] = await db()
            .select({
              id: tabelaDeUsuario.id,
              dataNascimento: tabelaDeUsuario.dataNascimento,
              papel: tabelaDeUsuario.papel,
              ativo: tabelaDeUsuario.ativo,
            })
            .from(tabelaDeUsuario)
            .where(eq(tabelaDeUsuario.cpf, cpf))
            .limit(1);

          if (!usuario || !usuario.ativo) return RECUSADO;

          // A ordem é a que D2 exige: primeiro resolve o usuário, só então
          // confere o papel. Recusar antes de resolver seria mais barato e
          // diria ao atacante que aquele CPF é de um gerente.
          const papel = usuario.papel as Papel;
          if (!metodoPermitido(papel, 'cpf-e-nascimento')) return RECUSADO;

          if (!iguaisEmTempoConstante(usuario.dataNascimento, iso)) {
            return RECUSADO;
          }

          // A expiração por papel e a recusa de usuário desativado moram
          // no gatilho `session.create.before` de `auth.ts`.
          const sessao = await ctx.context.internalAdapter.createSession(
            usuario.id,
            ctx,
          );
          if (!sessao) return RECUSADO;

          const completo = await ctx.context.internalAdapter.findUserById(
            usuario.id,
          );
          if (!completo) return RECUSADO;

          await setSessionCookie(ctx, { session: sessao, user: completo }, false, {
            maxAge: duracaoDaSessao(papel),
          });

          return { entrou: true, papel, usuarioId: usuario.id };
        },
      ),
    },
  }) satisfies BetterAuthPlugin;
