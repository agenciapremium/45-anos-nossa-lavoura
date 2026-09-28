import 'server-only';

import { forbidden } from 'next/navigation';
import { headers } from 'next/headers';

import type { Papel } from '@/lib/db/schema';
import { auth } from '@/lib/palestras/auth';
import type { Ator } from '@/lib/palestras/auditoria';
import {
  SemAcesso,
  escopoCompleto,
  exigir,
  type Escopo,
  type Recurso,
} from '@/lib/palestras/escopo';
import type { AcaoProtegida } from '@/lib/palestras/papeis';

/* =========================================================
   Sessão do lado do servidor

   Primeira camada da autorização (D4 do design). A segunda — o filtro de
   escopo dentro da consulta — está em `lib/palestras/dados.ts`, e é ela que
   realmente protege. Esta camada existe para barrar cedo e para produzir o
   `Escopo` que a outra exige.

   **A verificação de `ativo` acontece aqui, a cada requisição.** Não é uma
   leitura desperdiçada: é o que faz a desativação de um usuário valer na
   requisição seguinte, sem esperar a sessão expirar (D5).
   ========================================================= */

export type Autenticado = {
  usuarioId: string;
  nome: string;
  email: string | null;
  papel: Papel;
  escopo: Escopo;
};

/**
 * Quem está pedindo, ou `null`.
 *
 * Nunca lança. Serve às telas que mudam de forma conforme haja sessão —
 * o rodapé público, por exemplo — e é a base de `exigirSessao`.
 */
export async function sessaoAtual(): Promise<Autenticado | null> {
  const sessao = await auth.api.getSession({ headers: await headers() });
  if (!sessao?.user) return null;

  const usuario = sessao.user as typeof sessao.user & {
    papel?: string;
    ativo?: boolean;
    regionalId?: string | null;
    lojaId?: string | null;
  };

  // Desativado depois de a sessão nascer: acaba aqui, na primeira
  // requisição seguinte.
  if (usuario.ativo === false) return null;

  const papel = (usuario.papel ?? 'colaborador') as Papel;
  const escopo: Escopo = {
    usuarioId: usuario.id,
    papel,
    regionalId: usuario.regionalId ?? null,
    lojaId: usuario.lojaId ?? null,
  };

  return {
    usuarioId: usuario.id,
    nome: usuario.name,
    email: usuario.email ?? null,
    papel,
    escopo,
  };
}

/**
 * Exige sessão válida.
 *
 * Sem sessão, `forbidden()`. Quem precisa mandar para o login é o
 * middleware, que roda antes e conhece o endereço pedido; chegar aqui sem
 * sessão significa que a rota escapou do `matcher` — e aí 403 é a resposta
 * certa, não um convite a tentar de novo.
 */
export async function exigirSessao(): Promise<Autenticado> {
  const atual = await sessaoAtual();
  if (!atual) forbidden();
  return atual;
}

/**
 * Exige sessão com escopo utilizável.
 *
 * Um gerente de loja sem loja vinculada não enxerga "a loja nula" — ele
 * simplesmente não passa. Ver `escopoCompleto`.
 */
export async function exigirEscopo(): Promise<Autenticado> {
  const atual = await exigirSessao();
  if (!escopoCompleto(atual.escopo)) forbidden();
  return atual;
}

/** Exige que o papel esteja na lista. */
export async function exigirPapel(
  permitidos: readonly Papel[],
): Promise<Autenticado> {
  const atual = await exigirEscopo();
  if (!permitidos.includes(atual.papel)) forbidden();
  return atual;
}

/**
 * Exige a permissão da matriz do PRD, opcionalmente sobre um recurso.
 *
 * As duas recusas possíveis — papel sem a ação, recurso fora do escopo —
 * produzem o mesmo 403. A página de 403 não recebe, e não tem como
 * receber, nenhum dado do recurso.
 */
export async function exigirAcao(
  acao: AcaoProtegida,
  recurso?: Recurso,
): Promise<Autenticado> {
  const atual = await exigirEscopo();
  try {
    exigir(atual.escopo, acao, recurso);
  } catch (erro) {
    if (erro instanceof SemAcesso) forbidden();
    throw erro;
  }
  return atual;
}

/** Converte a sessão no ator da trilha de auditoria. */
export function atorDe(atual: Autenticado): Ator {
  return { id: atual.usuarioId, nome: atual.nome };
}

/** Atalho: exige a ação e já devolve o ator para auditar. */
export async function atorAutorizado(
  acao: AcaoProtegida,
  recurso?: Recurso,
): Promise<{ atual: Autenticado; ator: Ator }> {
  const atual = await exigirAcao(acao, recurso);
  return { atual, ator: atorDe(atual) };
}

/* ---------------------------------------------------------
   Route Handlers

   `forbidden()` é uma interrupção de renderização: serve a páginas, não a
   rotas que devolvem PDF, CSV ou JSON. Para essas, a autorização devolve
   ou a sessão, ou uma `Response` pronta.
   --------------------------------------------------------- */

export type AutorizacaoDeRota =
  | { ok: true; atual: Autenticado; ator: Ator }
  /**
   * `atual` vem preenchido quando existe sessão (a recusa foi por papel ou
   * por escopo, não por falta de login) — é o que permite a quem chama
   * auditar a tentativa recusada sem reautenticar ninguém (spec
   * `exportacao-csv`: "a tentativa é registrada para apuração"). `null`
   * quando não há sessão nenhuma: aí não há quem auditar como autor.
   */
  | { ok: false; resposta: Response; atual: Autenticado | null };

const RECUSA_DE_ROTA = () =>
  new Response('Forbidden', {
    status: 403,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });

export async function autorizarRota(
  acao: AcaoProtegida,
  recurso?: Recurso,
): Promise<AutorizacaoDeRota> {
  const atual = await sessaoAtual();
  if (!atual || !escopoCompleto(atual.escopo)) {
    return { ok: false, resposta: RECUSA_DE_ROTA(), atual: atual ?? null };
  }
  const decisao = (() => {
    try {
      exigir(atual.escopo, acao, recurso);
      return true;
    } catch (erro) {
      if (erro instanceof SemAcesso) return false;
      throw erro;
    }
  })();
  if (!decisao) return { ok: false, resposta: RECUSA_DE_ROTA(), atual };
  return { ok: true, atual, ator: atorDe(atual) };
}
