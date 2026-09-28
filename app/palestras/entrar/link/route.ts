import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';

import { db } from '@/lib/db';
import { user as tabelaDeUsuario, type Papel } from '@/lib/db/schema';
import { ACOES, registrarAuditoria } from '@/lib/palestras/auditoria';
import { auth } from '@/lib/palestras/auth';
import { painelInicial } from '@/lib/palestras/papeis';

/* =========================================================
   Destino do link mágico

   O e-mail aponta para cá, e não para o endpoint nativo do Better Auth —
   que não está montado (ver o cabeçalho de `lib/palestras/auth.ts`). A
   verificação do token acontece do lado do servidor, por `auth.api`, e o
   cookie de sessão é gravado pelo gancho `nextCookies`.

   **Qualquer falha vira o mesmo destino.** Token inexistente, expirado, já
   usado, e-mail que não é mais de ninguém, usuário desativado: todos caem
   em `/palestras/entrar?aviso=expirada`. Distinguir "expirou" de "não
   existe" transformaria o endereço num oráculo de tokens.
   ========================================================= */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(pedido: NextRequest) {
  const token = pedido.nextUrl.searchParams.get('t') ?? '';
  if (!token) redirect('/palestras/entrar?aviso=expirada');

  let usuarioId: string;
  try {
    const resposta = await auth.api.magicLinkVerify({
      query: { token },
      headers: await headers(),
    });
    usuarioId = resposta.user.id;
  } catch {
    await registrarAuditoria({
      ator: { id: null, nome: 'tentativa de acesso' },
      acao: ACOES.acessoRecusado,
      entidade: 'acesso',
      dados: { metodo: 'link-magico', motivo: 'link inválido ou expirado' },
    }).catch(() => undefined);
    redirect('/palestras/entrar?aviso=expirada');
  }

  /*
     O papel não vem no retorno do Better Auth, e o cookie recém-gravado
     ainda não está nos cabeçalhos deste pedido — ele só chega no próximo.
     Uma leitura resolve, e é a mesma que o painel faria de qualquer jeito.
  */
  const [linha] = await db()
    .select({ papel: tabelaDeUsuario.papel, nome: tabelaDeUsuario.name })
    .from(tabelaDeUsuario)
    .where(eq(tabelaDeUsuario.id, usuarioId))
    .limit(1);

  await registrarAuditoria({
    ator: { id: usuarioId, nome: linha?.nome ?? 'acesso por link' },
    acao: ACOES.acessoEfetuado,
    entidade: 'acesso',
    dados: { metodo: 'link-magico' },
  }).catch(() => undefined);

  redirect(painelInicial((linha?.papel ?? 'colaborador') as Papel));
}
