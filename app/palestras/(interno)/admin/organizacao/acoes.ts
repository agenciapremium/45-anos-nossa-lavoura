'use server';

import { and, eq, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { db } from '@/lib/db';
import { loja, regional, user } from '@/lib/db/schema';
import {
  ACOES,
  registrarAuditoria,
} from '@/lib/palestras/auditoria';
import {
  errosPorCampo,
  esquemaDeLoja,
  esquemaDeRegional,
  esquemaDeUsuario,
  type ErrosPorCampo,
} from '@/lib/palestras/validacao';
import { atorAutorizado } from '@/lib/palestras/sessao';

export type EstadoDoFormulario = {
  ok: boolean;
  mensagem?: string;
  erros?: ErrosPorCampo;
};

const VAZIO: EstadoDoFormulario = { ok: false };

function atualizar() {
  revalidatePath('/palestras/admin/organizacao');
  revalidatePath('/palestras/admin/gerar');
}

const texto = (d: FormData, campo: string) => String(d.get(campo) ?? '');
const marcado = (d: FormData, campo: string) => d.get(campo) !== 'nao';

/* =========================================================
   Regional
   ========================================================= */

export async function salvarRegional(
  _anterior: EstadoDoFormulario = VAZIO,
  dados: FormData,
): Promise<EstadoDoFormulario> {
  const { ator } = await atorAutorizado('cadastrarEImportarEstrutura');

  const id = texto(dados, 'id') || null;
  const analise = esquemaDeRegional.safeParse({
    nome: texto(dados, 'nome'),
    ativo: marcado(dados, 'ativo'),
  });
  if (!analise.success) {
    return { ok: false, erros: errosPorCampo(analise.error) };
  }
  const v = analise.data;

  const [existente] = await db()
    .select({ id: regional.id })
    .from(regional)
    .where(
      id ? and(eq(regional.nome, v.nome), ne(regional.id, id)) : eq(regional.nome, v.nome),
    )
    .limit(1);

  if (existente) {
    return {
      ok: false,
      erros: {
        nome: `Já existe uma regional chamada "${v.nome}". Abra o cadastro existente em vez de criar outro.`,
      },
    };
  }

  if (id) {
    await db()
      .update(regional)
      .set({ nome: v.nome, ativo: v.ativo, atualizadoEm: new Date() })
      .where(eq(regional.id, id));
    await registrarAuditoria({
      ator,
      acao: v.ativo ? ACOES.regionalEditada : ACOES.regionalDesativada,
      entidade: 'palestra_regional',
      entidadeId: id,
      dados: { nome: v.nome, ativo: v.ativo },
    });
  } else {
    const [criada] = await db().insert(regional).values(v).returning();
    await registrarAuditoria({
      ator,
      acao: ACOES.regionalCriada,
      entidade: 'palestra_regional',
      entidadeId: criada?.id ?? null,
      dados: { nome: v.nome },
    });
  }

  atualizar();
  return { ok: true, mensagem: id ? 'Regional atualizada.' : 'Regional criada.' };
}

/* =========================================================
   Loja
   ========================================================= */

export async function salvarLoja(
  _anterior: EstadoDoFormulario = VAZIO,
  dados: FormData,
): Promise<EstadoDoFormulario> {
  const { ator } = await atorAutorizado('cadastrarEImportarEstrutura');

  const id = texto(dados, 'id') || null;
  const analise = esquemaDeLoja.safeParse({
    regionalId: texto(dados, 'regionalId'),
    codigo: texto(dados, 'codigo'),
    nome: texto(dados, 'nome'),
    cidade: texto(dados, 'cidade'),
    ativo: marcado(dados, 'ativo'),
  });
  if (!analise.success) {
    return { ok: false, erros: errosPorCampo(analise.error) };
  }
  const v = analise.data;

  const [existente] = await db()
    .select({ id: loja.id, nome: loja.nome })
    .from(loja)
    .where(
      id ? and(eq(loja.codigo, v.codigo), ne(loja.id, id)) : eq(loja.codigo, v.codigo),
    )
    .limit(1);

  if (existente) {
    return {
      ok: false,
      erros: {
        codigo: `O código ${v.codigo} já é da loja "${existente.nome}".`,
      },
    };
  }

  const valores = {
    regionalId: v.regionalId,
    codigo: v.codigo,
    nome: v.nome,
    cidade: v.cidade || null,
    ativo: v.ativo,
    atualizadoEm: new Date(),
  };

  if (id) {
    await db().update(loja).set(valores).where(eq(loja.id, id));
    await registrarAuditoria({
      ator,
      acao: v.ativo ? ACOES.lojaEditada : ACOES.lojaDesativada,
      entidade: 'palestra_loja',
      entidadeId: id,
      dados: { codigo: v.codigo, nome: v.nome, ativo: v.ativo },
    });
  } else {
    const [criada] = await db().insert(loja).values(valores).returning();
    await registrarAuditoria({
      ator,
      acao: ACOES.lojaCriada,
      entidade: 'palestra_loja',
      entidadeId: criada?.id ?? null,
      dados: { codigo: v.codigo, nome: v.nome },
    });
  }

  atualizar();
  return { ok: true, mensagem: id ? 'Loja atualizada.' : 'Loja criada.' };
}

/* =========================================================
   Usuário
   ========================================================= */

export async function salvarUsuario(
  _anterior: EstadoDoFormulario = VAZIO,
  dados: FormData,
): Promise<EstadoDoFormulario> {
  const { ator } = await atorAutorizado('cadastrarEImportarEstrutura');

  const id = texto(dados, 'id') || null;
  const analise = esquemaDeUsuario.safeParse({
    nome: texto(dados, 'nome'),
    cpf: texto(dados, 'cpf'),
    dataNascimento: texto(dados, 'dataNascimento'),
    email: texto(dados, 'email'),
    whatsapp: texto(dados, 'whatsapp'),
    papel: texto(dados, 'papel'),
    regionalId: texto(dados, 'regionalId'),
    lojaId: texto(dados, 'lojaId'),
    ativo: marcado(dados, 'ativo'),
  });
  if (!analise.success) {
    return { ok: false, erros: errosPorCampo(analise.error) };
  }
  const v = analise.data;

  // CPF único
  const [porCpf] = await db()
    .select({ id: user.id, nome: user.name })
    .from(user)
    .where(id ? and(eq(user.cpf, v.cpf), ne(user.id, id)) : eq(user.cpf, v.cpf))
    .limit(1);
  if (porCpf) {
    return {
      ok: false,
      erros: {
        cpf: `Este CPF já é de "${porCpf.nome}". Abra o cadastro existente em vez de criar outro.`,
      },
    };
  }

  // E-mail é opcional; único quando informado.
  if (v.email) {
    const [porEmail] = await db()
      .select({ id: user.id, nome: user.name })
      .from(user)
      .where(
        id ? and(eq(user.email, v.email), ne(user.id, id)) : eq(user.email, v.email),
      )
      .limit(1);
    if (porEmail) {
      return {
        ok: false,
        erros: { email: `Este e-mail já é de "${porEmail.nome}".` },
      };
    }
  }

  // Loja desativada não recebe usuário novo.
  if (v.lojaId) {
    const [alvo] = await db()
      .select({ ativo: loja.ativo, nome: loja.nome })
      .from(loja)
      .where(eq(loja.id, v.lojaId))
      .limit(1);
    if (!alvo) {
      return { ok: false, erros: { lojaId: 'Loja não encontrada.' } };
    }
    const jaEstavaNessaLoja =
      id !== null &&
      (
        await db()
          .select({ lojaId: user.lojaId })
          .from(user)
          .where(eq(user.id, id))
          .limit(1)
      )[0]?.lojaId === v.lojaId;
    if (!alvo.ativo && !jaEstavaNessaLoja) {
      return {
        ok: false,
        erros: {
          lojaId: `A loja "${alvo.nome}" está inativa e não recebe novos usuários.`,
        },
      };
    }
  }

  const valores = {
    name: v.nome,
    cpf: v.cpf,
    dataNascimento: v.dataNascimento,
    email: v.email,
    whatsapp: v.whatsapp,
    papel: v.papel,
    regionalId: v.regionalId,
    lojaId: v.lojaId,
    ativo: v.ativo,
    updatedAt: new Date(),
  };

  if (id) {
    await db().update(user).set(valores).where(eq(user.id, id));
  } else {
    await db().insert(user).values(valores);
  }

  await registrarAuditoria({
    ator,
    acao: id
      ? v.ativo
        ? ACOES.usuarioEditado
        : ACOES.usuarioDesativado
      : ACOES.usuarioCriado,
    entidade: 'user',
    entidadeId: id,
    // `cpf` vira `cpfMascarado` no serviço de auditoria.
    dados: { nome: v.nome, papel: v.papel, ativo: v.ativo, cpf: v.cpf },
  });

  atualizar();
  return { ok: true, mensagem: id ? 'Usuário atualizado.' : 'Usuário criado.' };
}

/* =========================================================
   Desativação rápida
   ========================================================= */

export async function alternarAtivoDeUsuario(
  idDoUsuario: string,
): Promise<EstadoDoFormulario> {
  const { ator } = await atorAutorizado('cadastrarEImportarEstrutura');
  const [atual] = await db()
    .select({ ativo: user.ativo, nome: user.name })
    .from(user)
    .where(eq(user.id, idDoUsuario))
    .limit(1);
  if (!atual) return { ok: false, mensagem: 'Usuário não encontrado.' };

  const novo = !atual.ativo;
  await db()
    .update(user)
    .set({ ativo: novo, updatedAt: new Date() })
    .where(eq(user.id, idDoUsuario));

  /*
   * Desativar não mexe nos convites do colaborador — eles ficam nos mesmos
   * estados e passam a ser geridos pelo Admin. Reatribuir ou cancelar em
   * massa aqui destruiria confirmações de convidados que não têm nada a ver
   * com o desligamento.
   */
  await registrarAuditoria({
    ator,
    acao: novo ? ACOES.usuarioEditado : ACOES.usuarioDesativado,
    entidade: 'user',
    entidadeId: idDoUsuario,
    dados: { nome: atual.nome, ativo: novo },
  });

  atualizar();
  return {
    ok: true,
    mensagem: novo
      ? 'Usuário reativado.'
      : 'Usuário desativado. Os convites dele continuam válidos e passam a ser geridos pelo Admin.',
  };
}

export async function alternarAtivoDeLoja(
  idDaLoja: string,
): Promise<EstadoDoFormulario> {
  const { ator } = await atorAutorizado('cadastrarEImportarEstrutura');
  const [atual] = await db()
    .select({ ativo: loja.ativo, nome: loja.nome, codigo: loja.codigo })
    .from(loja)
    .where(eq(loja.id, idDaLoja))
    .limit(1);
  if (!atual) return { ok: false, mensagem: 'Loja não encontrada.' };

  const novo = !atual.ativo;
  await db()
    .update(loja)
    .set({ ativo: novo, atualizadoEm: new Date() })
    .where(eq(loja.id, idDaLoja));

  await registrarAuditoria({
    ator,
    acao: novo ? ACOES.lojaEditada : ACOES.lojaDesativada,
    entidade: 'palestra_loja',
    entidadeId: idDaLoja,
    dados: { codigo: atual.codigo, nome: atual.nome, ativo: novo },
  });

  atualizar();
  return { ok: true, mensagem: novo ? 'Loja reativada.' : 'Loja desativada.' };
}

export async function alternarAtivoDeRegional(
  idDaRegional: string,
): Promise<EstadoDoFormulario> {
  const { ator } = await atorAutorizado('cadastrarEImportarEstrutura');
  const [atual] = await db()
    .select({ ativo: regional.ativo, nome: regional.nome })
    .from(regional)
    .where(eq(regional.id, idDaRegional))
    .limit(1);
  if (!atual) return { ok: false, mensagem: 'Regional não encontrada.' };

  const novo = !atual.ativo;
  await db()
    .update(regional)
    .set({ ativo: novo, atualizadoEm: new Date() })
    .where(eq(regional.id, idDaRegional));

  await registrarAuditoria({
    ator,
    acao: novo ? ACOES.regionalEditada : ACOES.regionalDesativada,
    entidade: 'palestra_regional',
    entidadeId: idDaRegional,
    dados: { nome: atual.nome, ativo: novo },
  });

  atualizar();
  return {
    ok: true,
    mensagem: novo ? 'Regional reativada.' : 'Regional desativada.',
  };
}
