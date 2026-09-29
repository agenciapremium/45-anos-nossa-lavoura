import 'server-only';

import { and, asc, count, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  auditoria,
  convite,
  evento,
  importacao,
  loja,
  lote,
  regional,
  user,
  type EstadoDeConvite,
} from '@/lib/db/schema';
import { estadoEfetivo } from '@/lib/palestras/estado-do-convite';
import { SemAcesso, type Escopo } from '@/lib/palestras/escopo';
import type { AcaoProtegida } from '@/lib/palestras/papeis';
import { agora } from '@/lib/tempo';

/* =========================================================
   Consultas de leitura

   Toda consulta que devolve convite passa o estado por `estadoEfetivo`
   (D3 do design): o cron consolida, mas não é a fonte da verdade.
   ========================================================= */

/* ---------------------------------------------------------
   Escopo obrigatório (D4 do design)

   As consultas deste arquivo alimentam telas **exclusivas do Admin**:
   estrutura organizacional, geração de lotes, lotes emitidos, números
   gerais. Por isso recebem o escopo e exigem o papel `admin` — e não um
   filtro por vínculo, que aqui não faria sentido.

   As consultas equivalentes para gerentes e colaboradores, com filtro por
   regional, loja ou autoria, estão em `lib/palestras/dados.ts`, onde o
   escopo restringe em vez de barrar.

   O parâmetro não tem valor padrão de propósito: é a assinatura que
   impede uma tela nova de ler dado de domínio sem dizer quem está pedindo.
   --------------------------------------------------------- */
function exigirAdministracao(
  escopo: Escopo,
  acao: AcaoProtegida = 'cadastrarEImportarEstrutura',
): void {
  if (escopo.papel !== 'admin') throw new SemAcesso(acao, 'papel');
}

/* ---------------------------------------------------------
   Palestras

   Palestra não é dado de escopo: a agenda do circuito é pública e a
   página `/palestras` a mostra para qualquer visitante. Por isso as
   consultas abaixo não pedem escopo — pedir seria teatro.
   --------------------------------------------------------- */

export async function listarPalestrasAtivas() {
  return db()
    .select()
    .from(evento)
    .where(eq(evento.ativo, true))
    .orderBy(asc(evento.dataHora));
}

export async function listarPalestras() {
  return db().select().from(evento).orderBy(asc(evento.dataHora));
}

export async function buscarPalestra(id: string) {
  const [linha] = await db()
    .select()
    .from(evento)
    .where(eq(evento.id, id))
    .limit(1);
  return linha ?? null;
}

export async function buscarPalestraPorSlug(slug: string) {
  const [linha] = await db()
    .select()
    .from(evento)
    .where(eq(evento.slug, slug))
    .limit(1);
  return linha ?? null;
}

export async function slugsDePalestra(): Promise<string[]> {
  const linhas = await db().select({ slug: evento.slug }).from(evento);
  return linhas.map((l) => l.slug);
}

/** Quantos convites cada palestra já tem. Usado para impedir exclusão. */
export async function convitesPorPalestra(
  escopo: Escopo,
): Promise<Map<string, number>> {
  exigirAdministracao(escopo, 'verConvitesEConfirmacoes');
  const linhas = await db()
    .select({ eventoId: convite.eventoId, total: count() })
    .from(convite)
    .groupBy(convite.eventoId);
  return new Map(linhas.map((l) => [l.eventoId, Number(l.total)]));
}

export async function totalDeConvitesDaPalestra(
  escopo: Escopo,
  eventoId: string,
) {
  exigirAdministracao(escopo, 'verConvitesEConfirmacoes');
  const [linha] = await db()
    .select({ total: count() })
    .from(convite)
    .where(eq(convite.eventoId, eventoId));
  return Number(linha?.total ?? 0);
}

/* ---------------------------------------------------------
   Estrutura organizacional
   --------------------------------------------------------- */

export async function listarRegionais(escopo: Escopo) {
  exigirAdministracao(escopo);
  return db().select().from(regional).orderBy(asc(regional.nome));
}

export async function listarLojas(escopo: Escopo) {
  exigirAdministracao(escopo);
  return db()
    .select({
      id: loja.id,
      codigo: loja.codigo,
      nome: loja.nome,
      cidade: loja.cidade,
      ativo: loja.ativo,
      regionalId: loja.regionalId,
      regionalNome: regional.nome,
    })
    .from(loja)
    .innerJoin(regional, eq(regional.id, loja.regionalId))
    .orderBy(asc(regional.nome), asc(loja.nome));
}

export type UsuarioComEscopo = Awaited<
  ReturnType<typeof listarUsuarios>
>[number];

export async function listarUsuarios(
  escopo: Escopo,
  filtro?: {
    regionalId?: string;
    lojaId?: string;
    papel?: string;
    somenteAtivos?: boolean;
  },
) {
  exigirAdministracao(escopo);
  const condicoes = [];
  if (filtro?.regionalId) condicoes.push(eq(user.regionalId, filtro.regionalId));
  if (filtro?.lojaId) condicoes.push(eq(user.lojaId, filtro.lojaId));
  if (filtro?.papel) condicoes.push(eq(user.papel, filtro.papel));
  if (filtro?.somenteAtivos) condicoes.push(eq(user.ativo, true));

  return db()
    .select({
      id: user.id,
      nome: user.name,
      email: user.email,
      cpf: user.cpf,
      dataNascimento: user.dataNascimento,
      whatsapp: user.whatsapp,
      papel: user.papel,
      ativo: user.ativo,
      regionalId: user.regionalId,
      lojaId: user.lojaId,
      lojaNome: loja.nome,
      lojaCodigo: loja.codigo,
      regionalNome: regional.nome,
    })
    .from(user)
    .leftJoin(loja, eq(loja.id, user.lojaId))
    .leftJoin(regional, eq(regional.id, sql`coalesce(${user.regionalId}, ${loja.regionalId})`))
    .where(condicoes.length ? and(...condicoes) : undefined)
    .orderBy(asc(user.name));
}

export async function buscarUsuario(escopo: Escopo, id: string) {
  exigirAdministracao(escopo);
  const [linha] = await db().select().from(user).where(eq(user.id, id)).limit(1);
  return linha ?? null;
}

/**
 * Colaboradores elegíveis para receber convites: ativos, com papel
 * `colaborador`, opcionalmente filtrados por regional ou loja.
 */
export async function listarColaboradoresParaGeracao(
  escopo: Escopo,
  filtro: { regionalId?: string; lojaId?: string },
) {
  exigirAdministracao(escopo, 'gerarLotes');
  const condicoes = [eq(user.ativo, true), eq(user.papel, 'colaborador')];
  if (filtro.lojaId) condicoes.push(eq(user.lojaId, filtro.lojaId));
  if (filtro.regionalId) condicoes.push(eq(loja.regionalId, filtro.regionalId));

  return db()
    .select({
      id: user.id,
      nome: user.name,
      cpf: user.cpf,
      lojaId: user.lojaId,
      lojaNome: loja.nome,
      lojaCodigo: loja.codigo,
      regionalId: loja.regionalId,
      regionalNome: regional.nome,
    })
    .from(user)
    .innerJoin(loja, eq(loja.id, user.lojaId))
    .innerJoin(regional, eq(regional.id, loja.regionalId))
    .where(and(...condicoes))
    .orderBy(asc(regional.nome), asc(loja.nome), asc(user.name));
}

/* ---------------------------------------------------------
   Convites
   --------------------------------------------------------- */

export type ConviteParaDistribuicao = {
  id: string;
  codigo: string;
  estado: EstadoDeConvite;
  eventoId: string;
};

/**
 * Convites de um colaborador em uma ou mais palestras, já com o estado
 * efetivo (expiração avaliada na leitura).
 */
export async function convitesDoColaborador(
  escopo: Escopo,
  colaboradorId: string,
  eventoIds?: string[],
) {
  // O Admin lê o de qualquer um; o colaborador, só o próprio. Nenhum
  // outro papel passa por aqui — a visão de gerente vem de `dados.ts`.
  if (escopo.papel !== 'admin' && escopo.usuarioId !== colaboradorId) {
    throw new SemAcesso('verConvitesEConfirmacoes', 'escopo');
  }
  const condicoes = [eq(convite.colaboradorId, colaboradorId)];
  if (eventoIds?.length) condicoes.push(inArray(convite.eventoId, eventoIds));

  const linhas = await db()
    .select({
      id: convite.id,
      codigo: convite.codigo,
      estadoGravado: convite.estado,
      eventoId: convite.eventoId,
      criadoEm: convite.criadoEm,
      prazo: evento.prazoConfirmacao,
    })
    .from(convite)
    .innerJoin(evento, eq(evento.id, convite.eventoId))
    .where(and(...condicoes))
    .orderBy(asc(evento.dataHora), asc(convite.criadoEm), asc(convite.codigo));

  const referencia = agora();
  return linhas.map((l) => ({
    id: l.id,
    codigo: l.codigo,
    eventoId: l.eventoId,
    criadoEm: l.criadoEm,
    estado: estadoEfetivo(
      l.estadoGravado as EstadoDeConvite,
      new Date(l.prazo),
      referencia,
    ),
  }));
}

/** Contagem por estado efetivo, por palestra. */
export async function resumoDeConvites(escopo: Escopo, eventoId: string) {
  exigirAdministracao(escopo, 'verConvitesEConfirmacoes');
  const linhas = await db()
    .select({
      estadoGravado: convite.estado,
      prazo: evento.prazoConfirmacao,
      total: count(),
    })
    .from(convite)
    .innerJoin(evento, eq(evento.id, convite.eventoId))
    .where(eq(convite.eventoId, eventoId))
    .groupBy(convite.estado, evento.prazoConfirmacao);

  const referencia = agora();
  const resumo: Record<EstadoDeConvite, number> = {
    disponivel: 0,
    confirmado: 0,
    presente: 0,
    expirado: 0,
    cancelado: 0,
  };
  for (const l of linhas) {
    const estado = estadoEfetivo(
      l.estadoGravado as EstadoDeConvite,
      new Date(l.prazo),
      referencia,
    );
    resumo[estado] += Number(l.total);
  }
  return resumo;
}

export async function listarLotes(escopo: Escopo, eventoId?: string) {
  exigirAdministracao(escopo, 'gerarLotes');
  const condicao = eventoId ? eq(lote.eventoId, eventoId) : undefined;
  return db()
    .select({
      id: lote.id,
      quantidade: lote.quantidade,
      criadoEm: lote.criadoEm,
      eventoId: lote.eventoId,
      eventoCidade: evento.cidade,
      colaboradorId: lote.colaboradorId,
      colaboradorNome: user.name,
      lojaNome: loja.nome,
    })
    .from(lote)
    .innerJoin(evento, eq(evento.id, lote.eventoId))
    .innerJoin(user, eq(user.id, lote.colaboradorId))
    .leftJoin(loja, eq(loja.id, user.lojaId))
    .where(condicao)
    .orderBy(desc(lote.criadoEm))
    .limit(200);
}

/* ---------------------------------------------------------
   Importações e auditoria
   --------------------------------------------------------- */

export async function listarImportacoes(escopo: Escopo) {
  exigirAdministracao(escopo);
  return db()
    .select({
      id: importacao.id,
      arquivoNome: importacao.arquivoNome,
      total: importacao.total,
      criados: importacao.criados,
      atualizados: importacao.atualizados,
      errosJson: importacao.errosJson,
      feitoEm: importacao.feitoEm,
      feitoPorNome: user.name,
    })
    .from(importacao)
    .leftJoin(user, eq(user.id, importacao.feitoPor))
    .orderBy(desc(importacao.feitoEm))
    .limit(100);
}

export type FiltroDeAuditoria = {
  ator?: string;
  acao?: string;
  entidade?: string;
  /**
   * Estreita para o rastro de um registro específico (o convite de código
   * X, por exemplo). Opcional e só reduz o resultado: sem ele, a consulta
   * se comporta como antes (tarefa 5.8 do redesenho de interface).
   */
  entidadeId?: string;
  de?: Date;
  ate?: Date;
};

export async function listarAuditoria(
  escopo: Escopo,
  filtro: FiltroDeAuditoria = {},
) {
  exigirAdministracao(escopo);
  const condicoes = [];
  if (filtro.ator) condicoes.push(eq(auditoria.atorNome, filtro.ator));
  if (filtro.acao) condicoes.push(eq(auditoria.acao, filtro.acao));
  if (filtro.entidade) condicoes.push(eq(auditoria.entidade, filtro.entidade));
  if (filtro.entidadeId)
    condicoes.push(eq(auditoria.entidadeId, filtro.entidadeId));
  if (filtro.de) condicoes.push(gte(auditoria.criadoEm, filtro.de));
  if (filtro.ate) condicoes.push(lte(auditoria.criadoEm, filtro.ate));

  return db()
    .select()
    .from(auditoria)
    .where(condicoes.length ? and(...condicoes) : undefined)
    .orderBy(desc(auditoria.criadoEm))
    .limit(300);
}

/** Valores distintos para preencher os filtros da tela de auditoria. */
export async function opcoesDeAuditoria(escopo: Escopo) {
  exigirAdministracao(escopo);
  const [acoes, entidades, atores] = await Promise.all([
    db().selectDistinct({ v: auditoria.acao }).from(auditoria).orderBy(asc(auditoria.acao)),
    db()
      .selectDistinct({ v: auditoria.entidade })
      .from(auditoria)
      .orderBy(asc(auditoria.entidade)),
    db()
      .selectDistinct({ v: auditoria.atorNome })
      .from(auditoria)
      .orderBy(asc(auditoria.atorNome)),
  ]);
  return {
    acoes: acoes.map((a) => a.v).filter(Boolean) as string[],
    entidades: entidades.map((e) => e.v).filter(Boolean) as string[],
    atores: atores.map((a) => a.v).filter(Boolean) as string[],
  };
}
