'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { db } from '@/lib/db';
import { evento } from '@/lib/db/schema';
import {
  ACOES,
  registrarAuditoria,
} from '@/lib/palestras/auditoria';
import {
  buscarPalestra,
  slugsDePalestra,
  totalDeConvitesDaPalestra,
} from '@/lib/palestras/consultas';
import { MENSAGEM_PADRAO_WHATSAPP } from '@/lib/palestras/mensagem';
import { slugDePalestra, slugDisponivel } from '@/lib/palestras/slug';
import { deHoraLocal, formatarData, prazoPadrao } from '@/lib/tempo';
import {
  errosPorCampo,
  esquemaDePalestra,
  type ErrosPorCampo,
} from '@/lib/palestras/validacao';
import { atorAutorizado } from '@/lib/palestras/sessao';

export type EstadoDoFormulario = {
  ok: boolean;
  mensagem?: string;
  erros?: ErrosPorCampo;
};

const VAZIO: EstadoDoFormulario = { ok: false };

function lerFormulario(dados: FormData) {
  return {
    cidade: String(dados.get('cidade') ?? ''),
    dataHoraLocal: String(dados.get('dataHoraLocal') ?? ''),
    localNome: String(dados.get('localNome') ?? ''),
    localEndereco: String(dados.get('localEndereco') ?? ''),
    prazoLocal: String(dados.get('prazoLocal') ?? ''),
    mensagemWhatsapp: String(
      dados.get('mensagemWhatsapp') ?? MENSAGEM_PADRAO_WHATSAPP,
    ),
    ativo: dados.get('ativo') !== 'nao',
    /** Marcado pelo formulário quando o Admin mexeu no campo do prazo. */
    prazoTocado: dados.get('prazoTocado') === 'sim',
  };
}

export async function salvarPalestra(
  _anterior: EstadoDoFormulario = VAZIO,
  dados: FormData,
): Promise<EstadoDoFormulario> {
  const { ator } = await atorAutorizado('cadastrarPalestras');

  const id = String(dados.get('id') ?? '') || null;
  const bruto = lerFormulario(dados);

  const analise = esquemaDePalestra.safeParse(bruto);
  if (!analise.success) {
    return { ok: false, erros: errosPorCampo(analise.error) };
  }
  const v = analise.data;

  const dataHora = deHoraLocal(v.dataHoraLocal);
  const anterior = id ? await buscarPalestra(id) : null;

  if (id && !anterior) {
    return { ok: false, mensagem: 'Palestra não encontrada.' };
  }

  /*
   * Prazo: preenchido automaticamente como a véspera às 23h59 e ajustável.
   *
   * Uma vez ajustado à mão, o valor é do Admin e o sistema para de mexer —
   * mudar a data depois não pode apagar a decisão dele. Enquanto nunca foi
   * ajustado, mudar a data recalcula.
   */
  const prazoInformado = v.prazoLocal ?? '';
  const ajustouAgora =
    bruto.prazoTocado &&
    prazoInformado !== '' &&
    (!anterior ||
      deHoraLocal(prazoInformado).getTime() !==
        anterior.prazoConfirmacao.getTime());

  const jaEraManual = anterior?.prazoAjustadoManualmente ?? false;
  const manual = jaEraManual || ajustouAgora;

  const prazo =
    manual && prazoInformado
      ? deHoraLocal(prazoInformado)
      : prazoPadrao(dataHora);

  if (prazo.getTime() >= dataHora.getTime()) {
    return {
      ok: false,
      erros: {
        prazoLocal:
          'O prazo de confirmação precisa ser anterior à data e hora da palestra.',
      },
    };
  }

  const valores = {
    cidade: v.cidade,
    dataHora,
    localNome: v.localNome,
    localEndereco: v.localEndereco,
    prazoConfirmacao: prazo,
    prazoAjustadoManualmente: manual,
    mensagemWhatsapp: v.mensagemWhatsapp,
    ativo: v.ativo,
    atualizadoEm: new Date(),
  };

  if (anterior) {
    await db().update(evento).set(valores).where(eq(evento.id, anterior.id));
    await registrarAuditoria({
      ator,
      acao: ACOES.palestraEditada,
      entidade: 'palestra_evento',
      entidadeId: anterior.id,
      dados: {
        cidade: v.cidade,
        dataHora: dataHora.toISOString(),
        prazo: prazo.toISOString(),
        prazoAjustadoManualmente: manual,
        ativo: v.ativo,
      },
    });
  } else {
    const slug = slugDisponivel(
      slugDePalestra(v.cidade, formatarData(dataHora)),
      await slugsDePalestra(),
    );
    const [criada] = await db()
      .insert(evento)
      .values({ ...valores, slug })
      .returning();
    await registrarAuditoria({
      ator,
      acao: ACOES.palestraCriada,
      entidade: 'palestra_evento',
      entidadeId: criada?.id ?? null,
      dados: {
        slug,
        cidade: v.cidade,
        dataHora: dataHora.toISOString(),
        prazo: prazo.toISOString(),
      },
    });
  }

  revalidatePath('/palestras');
  revalidatePath('/palestras/admin/palestras');
  return {
    ok: true,
    mensagem: anterior ? 'Palestra atualizada.' : 'Palestra criada.',
  };
}

export async function alternarAtivacao(
  idDaPalestra: string,
): Promise<EstadoDoFormulario> {
  const { ator } = await atorAutorizado('cadastrarPalestras');

  const atual = await buscarPalestra(idDaPalestra);
  if (!atual) return { ok: false, mensagem: 'Palestra não encontrada.' };

  const novo = !atual.ativo;
  await db()
    .update(evento)
    .set({ ativo: novo, atualizadoEm: new Date() })
    .where(eq(evento.id, idDaPalestra));

  await registrarAuditoria({
    ator,
    acao: novo ? ACOES.palestraReativada : ACOES.palestraDesativada,
    entidade: 'palestra_evento',
    entidadeId: idDaPalestra,
    dados: { cidade: atual.cidade, ativo: novo },
  });

  revalidatePath('/palestras');
  revalidatePath('/palestras/admin/palestras');
  return {
    ok: true,
    mensagem: novo ? 'Palestra reativada.' : 'Palestra desativada.',
  };
}

/**
 * Exclusão de palestra.
 *
 * Recusada quando já existe convite gerado: apagar a palestra levaria junto
 * o histórico de quem recebeu, confirmou e compareceu. A saída é desativar,
 * que tira da página pública e preserva tudo.
 */
export async function excluirPalestra(
  idDaPalestra: string,
): Promise<EstadoDoFormulario> {
  const { ator, atual: sessao } = await atorAutorizado('cadastrarPalestras');

  const atual = await buscarPalestra(idDaPalestra);
  if (!atual) return { ok: false, mensagem: 'Palestra não encontrada.' };

  const convites = await totalDeConvitesDaPalestra(sessao.escopo, idDaPalestra);
  if (convites > 0) {
    await registrarAuditoria({
      ator,
      acao: ACOES.palestraExclusaoRecusada,
      entidade: 'palestra_evento',
      entidadeId: idDaPalestra,
      dados: { convites },
    });
    return {
      ok: false,
      mensagem:
        `Esta palestra já tem ${convites} convite(s) gerado(s) e não pode ser excluída. ` +
        'Desative-a: ela sai da página pública e o histórico fica preservado.',
    };
  }

  await db().delete(evento).where(eq(evento.id, idDaPalestra));
  await registrarAuditoria({
    ator,
    acao: ACOES.palestraExcluida,
    entidade: 'palestra_evento',
    entidadeId: idDaPalestra,
    dados: { cidade: atual.cidade, slug: atual.slug },
  });

  revalidatePath('/palestras');
  revalidatePath('/palestras/admin/palestras');
  return { ok: true, mensagem: 'Palestra excluída.' };
}
