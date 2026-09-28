import 'server-only';

import { and, asc, eq, inArray } from 'drizzle-orm';

import { db } from '@/lib/db';
import { convite, evento, loja, user } from '@/lib/db/schema';
import { env } from '@/lib/env';
import { estadoEfetivo } from '@/lib/palestras/estado-do-convite';
import { montarMensagemDoConvite } from '@/lib/palestras/mensagem';
import type { Escopo } from '@/lib/palestras/escopo';
import {
  agora,
  formatarCarimbo,
  formatarData,
  formatarHorario,
} from '@/lib/tempo';
import type { DadosDoPdf } from './documento';

/**
 * Reúne o que o PDF de um colaborador precisa.
 *
 * Recebe o **escopo do solicitante** (D1 do design de `painel-colaborador`):
 * quando quem pede é o próprio colaborador, o alvo é sempre ele mesmo — o
 * `colaboradorIdAlvo` vindo da requisição é **ignorado, não validado**. Só o
 * Admin (o único alcance `todos` da ação `baixarPdfDeColaborador`) pode
 * mirar em outro colaborador, e precisa informar o alvo explicitamente.
 *
 * É a mesma função para o PDF gerado por `/palestras/admin/distribuir` e
 * para o baixado pelo colaborador em `/palestras/painel`: o critério de
 * "mesmo conteúdo" é consequência de ser o mesmo código, não de duas
 * implementações mantidas em paralelo.
 *
 * Só convites `disponivel` **no estado efetivo**: um convite `disponivel` no
 * banco cujo prazo já venceu não entra, mesmo que o cron ainda não tenha
 * rodado. Imprimir um link morto é pior que não imprimir nada.
 */
export async function montarDadosDoPdf(
  escopo: Escopo,
  colaboradorIdAlvo: string | null,
  eventoIds: string[],
): Promise<DadosDoPdf | null> {
  // Regra central de D1: o colaborador nunca escolhe o alvo, mesmo que o
  // parâmetro da requisição diga outra coisa. Só o Admin mira em outro id.
  const colaboradorId =
    escopo.papel === 'admin' ? colaboradorIdAlvo : escopo.usuarioId;
  if (!colaboradorId) return null;

  const [pessoa] = await db()
    .select({
      id: user.id,
      nome: user.name,
      lojaNome: loja.nome,
      lojaCodigo: loja.codigo,
    })
    .from(user)
    .leftJoin(loja, eq(loja.id, user.lojaId))
    .where(eq(user.id, colaboradorId))
    .limit(1);

  if (!pessoa) return null;

  const condicoes = [eq(convite.colaboradorId, colaboradorId)];
  if (eventoIds.length) condicoes.push(inArray(convite.eventoId, eventoIds));

  const linhas = await db()
    .select({
      codigo: convite.codigo,
      estadoGravado: convite.estado,
      criadoEm: convite.criadoEm,
      eventoId: evento.id,
      cidade: evento.cidade,
      dataHora: evento.dataHora,
      localNome: evento.localNome,
      localEndereco: evento.localEndereco,
      prazo: evento.prazoConfirmacao,
      mensagem: evento.mensagemWhatsapp,
    })
    .from(convite)
    .innerJoin(evento, eq(evento.id, convite.eventoId))
    .where(and(...condicoes))
    .orderBy(asc(evento.dataHora), asc(convite.criadoEm), asc(convite.codigo));

  const referencia = agora();
  const origem = env().APP_BASE_URL;

  const porEvento = new Map<string, DadosDoPdf['blocos'][number]>();

  for (const l of linhas) {
    const prazo = new Date(l.prazo);
    if (estadoEfetivo(l.estadoGravado as never, prazo, referencia) !== 'disponivel') {
      continue;
    }

    const dataFormatada = formatarData(l.dataHora);
    const horarioFormatado = formatarHorario(l.dataHora);
    const prazoFormatado = formatarCarimbo(prazo);

    let bloco = porEvento.get(l.eventoId);
    if (!bloco) {
      bloco = {
        cidade: l.cidade,
        data: dataFormatada,
        horario: horarioFormatado,
        localNome: l.localNome,
        localEndereco: l.localEndereco,
        prazo: prazoFormatado,
        convites: [],
      };
      porEvento.set(l.eventoId, bloco);
    }

    // Mesmo montador que o painel do colaborador usa (`mensagem.ts`): é o
    // que garante que a mensagem dos dois caminhos é idêntica para o mesmo
    // convite, sem duas implementações para manter em paralelo.
    const { url, linkWhatsapp } = montarMensagemDoConvite({
      origem,
      codigo: l.codigo,
      mensagemTemplate: l.mensagem,
      cidade: l.cidade,
      data: dataFormatada,
      horario: horarioFormatado,
      local: l.localNome,
      prazo: prazoFormatado,
    });

    bloco.convites.push({
      codigo: l.codigo,
      url,
      linkWhatsapp,
    });
  }

  const blocos = [...porEvento.values()].filter((b) => b.convites.length > 0);
  if (blocos.length === 0) return null;

  return {
    colaborador: pessoa.nome,
    loja: pessoa.lojaCodigo
      ? `${pessoa.lojaCodigo} · ${pessoa.lojaNome ?? ''}`.trim()
      : (pessoa.lojaNome ?? 'Sem loja vinculada'),
    geradoEm: formatarCarimbo(referencia),
    blocos,
  };
}

/** `NL-014-maria-aparecida-de-souza.pdf` */
export function nomeDoArquivo(loja: string, colaborador: string): string {
  const limpar = (v: string) =>
    v
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/['’]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();
  return `${limpar(loja) || 'sem-loja'}-${limpar(colaborador)}.pdf`;
}
