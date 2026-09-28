import 'server-only';

import { eq, inArray } from 'drizzle-orm';

import { db, dbTx } from '@/lib/db';
import { importacao, loja, regional, user } from '@/lib/db/schema';
import {
  ACOES,
  registrarAuditoria,
  type Ator,
} from '@/lib/palestras/auditoria';
import {
  analisarCsv,
  type ErroDeLinha,
  type LinhaValida,
} from '@/lib/palestras/importacao';

/* =========================================================
   Serviço de importação

   Separado da Server Action de propósito: a action cuida do guard e do
   formulário, o serviço cuida do banco. Assim a carga inteira — upsert,
   idempotência, transação — pode ser exercitada contra um Postgres real
   sem simular um pedido HTTP.
   ========================================================= */

export type Contagens = {
  total: number;
  novos: number;
  atualizados: number;
  erros: number;
  regionaisNovas: number;
  lojasNovas: number;
  lojasAtualizadas: number;
};

export type Previa =
  | { ok: false; mensagem: string; erros?: ErroDeLinha[] }
  | {
      ok: true;
      contagens: Contagens;
      erros: ErroDeLinha[];
      amostra: {
        linha: number;
        nome: string;
        cpf: string;
        papel: string;
        loja: string;
        regional: string;
        situacao: 'novo' | 'atualizado';
      }[];
    };

type Existentes = {
  regionaisPorNome: Map<string, string>;
  lojasPorCodigo: Map<
    string,
    { id: string; nome: string; cidade: string | null; regionalId: string }
  >;
  usuariosPorCpf: Map<string, string>;
};

async function carregarExistentes(analise: {
  regionais: string[];
  lojas: { codigo: string }[];
  validas: LinhaValida[];
}): Promise<Existentes> {
  const nomesDeRegional = analise.regionais;
  const codigosDeLoja = analise.lojas.map((l) => l.codigo);
  const cpfs = analise.validas.map((l) => l.cpf);

  const [regionais, lojas, usuarios] = await Promise.all([
    nomesDeRegional.length
      ? db()
          .select({ id: regional.id, nome: regional.nome })
          .from(regional)
          .where(inArray(regional.nome, nomesDeRegional))
      : Promise.resolve([]),
    codigosDeLoja.length
      ? db()
          .select({
            id: loja.id,
            codigo: loja.codigo,
            nome: loja.nome,
            cidade: loja.cidade,
            regionalId: loja.regionalId,
          })
          .from(loja)
          .where(inArray(loja.codigo, codigosDeLoja))
      : Promise.resolve([]),
    cpfs.length
      ? db()
          .select({ id: user.id, cpf: user.cpf })
          .from(user)
          .where(inArray(user.cpf, cpfs))
      : Promise.resolve([]),
  ]);

  return {
    regionaisPorNome: new Map(regionais.map((r) => [r.nome, r.id])),
    lojasPorCodigo: new Map(
      lojas.map((l) => [
        l.codigo,
        { id: l.id, nome: l.nome, cidade: l.cidade, regionalId: l.regionalId },
      ]),
    ),
    usuariosPorCpf: new Map(usuarios.map((u) => [u.cpf, u.id])),
  };
}

/** Etapa 1: analisa e conta. **Não grava nada.** */
export async function previsualizarImportacao(
  conteudo: string,
): Promise<Previa> {
  const analise = analisarCsv(conteudo);
  if (!analise.ok) return { ok: false, mensagem: analise.mensagem };

  const existentes = await carregarExistentes(analise);

  const regionaisNovas = analise.regionais.filter(
    (n) => !existentes.regionaisPorNome.has(n),
  ).length;

  let lojasNovas = 0;
  let lojasAtualizadas = 0;
  for (const l of analise.lojas) {
    const atual = existentes.lojasPorCodigo.get(l.codigo);
    if (!atual) lojasNovas++;
    else if (atual.nome !== l.nome || (atual.cidade ?? null) !== l.cidade) {
      lojasAtualizadas++;
    }
  }

  let novos = 0;
  let atualizados = 0;
  for (const linha of analise.validas) {
    if (existentes.usuariosPorCpf.has(linha.cpf)) atualizados++;
    else novos++;
  }

  return {
    ok: true,
    contagens: {
      total: analise.validas.length + analise.erros.length,
      novos,
      atualizados,
      erros: analise.erros.length,
      regionaisNovas,
      lojasNovas,
      lojasAtualizadas,
    },
    erros: analise.erros,
    amostra: analise.validas.slice(0, 25).map((l) => ({
      linha: l.linha,
      nome: l.nome,
      cpf: l.cpf,
      papel: l.papel,
      loja: l.lojaCodigo ? `${l.lojaCodigo} · ${l.lojaNome ?? ''}` : '—',
      regional: l.regional,
      situacao: existentes.usuariosPorCpf.has(l.cpf)
        ? ('atualizado' as const)
        : ('novo' as const),
    })),
  };
}

export type ResultadoDaImportacao =
  | { ok: false; mensagem: string; erros?: ErroDeLinha[] }
  | { ok: true; contagens: Contagens; erros: ErroDeLinha[]; mensagem: string };

/** Etapa 2: grava tudo numa transação só. */
export async function aplicarImportacao(opcoes: {
  conteudo: string;
  arquivoNome: string;
  somenteValidas: boolean;
  ator: Ator;
}): Promise<ResultadoDaImportacao> {
  const { conteudo, arquivoNome, somenteValidas, ator } = opcoes;

  const analise = analisarCsv(conteudo);
  if (!analise.ok) return { ok: false, mensagem: analise.mensagem };

  /*
   * Com erros pendentes e sem a opção marcada, nada é gravado. A escolha é
   * do Admin: uma planilha com 12 linhas quebradas pode ser um problema de
   * formatação a corrigir na origem, ou 12 casos a resolver depois.
   */
  if (analise.erros.length > 0 && !somenteValidas) {
    return {
      ok: false,
      erros: analise.erros,
      mensagem:
        `O arquivo tem ${analise.erros.length} linha(s) com erro e nada foi gravado. ` +
        'Corrija a planilha e envie de novo, ou marque "importar apenas as linhas válidas".',
    };
  }

  const existentes = await carregarExistentes(analise);

  let criados = 0;
  let atualizados = 0;
  let regionaisCriadas = 0;
  let lojasCriadas = 0;
  let lojasAtualizadas = 0;
  const lojasComNomeDivergente: { codigo: string; de: string; para: string }[] =
    [];

  // Tudo numa transação: ou a carga inteira entra, ou nada entra. Meia
  // importação de 390 pessoas é pior que nenhuma.
  await dbTx().transaction(async (tx) => {
    const idDeRegional = new Map(existentes.regionaisPorNome);
    const dadosDeLoja = new Map(existentes.lojasPorCodigo);

    /* --- regionais: upsert por nome --- */
    for (const nome of analise.regionais) {
      if (idDeRegional.has(nome)) continue;
      const [nova] = await tx
        .insert(regional)
        .values({ nome })
        .returning({ id: regional.id });
      idDeRegional.set(nome, nova!.id);
      regionaisCriadas++;
    }

    /* --- lojas: upsert por código --- */
    for (const l of analise.lojas) {
      const regionalId = idDeRegional.get(l.regional)!;
      const atual = dadosDeLoja.get(l.codigo);
      if (!atual) {
        const [nova] = await tx
          .insert(loja)
          .values({
            codigo: l.codigo,
            nome: l.nome,
            cidade: l.cidade,
            regionalId,
          })
          .returning({ id: loja.id });
        dadosDeLoja.set(l.codigo, {
          id: nova!.id,
          nome: l.nome,
          cidade: l.cidade,
          regionalId,
        });
        lojasCriadas++;
        continue;
      }

      const mudou =
        atual.nome !== l.nome ||
        (atual.cidade ?? null) !== l.cidade ||
        atual.regionalId !== regionalId;

      if (mudou) {
        if (atual.nome !== l.nome) {
          lojasComNomeDivergente.push({
            codigo: l.codigo,
            de: atual.nome,
            para: l.nome,
          });
        }
        await tx
          .update(loja)
          .set({
            nome: l.nome,
            cidade: l.cidade,
            regionalId,
            atualizadoEm: new Date(),
          })
          .where(eq(loja.id, atual.id));
        dadosDeLoja.set(l.codigo, {
          id: atual.id,
          nome: l.nome,
          cidade: l.cidade,
          regionalId,
        });
        lojasAtualizadas++;
      }
    }

    /* --- usuários: upsert por CPF --- */
    for (const linha of analise.validas) {
      const regionalId = idDeRegional.get(linha.regional) ?? null;
      const lojaId = linha.lojaCodigo
        ? (dadosDeLoja.get(linha.lojaCodigo)?.id ?? null)
        : null;

      const valores = {
        name: linha.nome,
        cpf: linha.cpf,
        dataNascimento: linha.dataNascimento,
        email: linha.email,
        whatsapp: linha.whatsapp,
        papel: linha.papel,
        // O vínculo de regional só é gravado para quem tem escopo regional;
        // colaborador e gerente de loja chegam à regional pela loja.
        regionalId: linha.papel === 'gerente_regional' ? regionalId : null,
        lojaId,
        ativo: true,
        updatedAt: new Date(),
      };

      const idExistente = existentes.usuariosPorCpf.get(linha.cpf);
      if (idExistente) {
        // O identificador é preservado: convites, confirmações e lotes já
        // apontam para ele.
        await tx.update(user).set(valores).where(eq(user.id, idExistente));
        atualizados++;
      } else {
        await tx.insert(user).values(valores);
        criados++;
      }
    }

    await tx.insert(importacao).values({
      arquivoNome,
      total: analise.validas.length + analise.erros.length,
      criados,
      atualizados,
      errosJson: analise.erros as never,
    });
  });

  await registrarAuditoria({
    ator,
    acao: ACOES.importacaoConfirmada,
    entidade: 'palestra_importacao',
    dados: {
      arquivoNome,
      total: analise.validas.length + analise.erros.length,
      criados,
      atualizados,
      erros: analise.erros.length,
      somenteValidas,
      regionaisCriadas,
      lojasCriadas,
      lojasAtualizadas,
      // A spec pede registro explícito da loja que mudou de nome.
      lojasComNomeDivergente,
    },
  });

  return {
    ok: true,
    erros: analise.erros,
    contagens: {
      total: analise.validas.length + analise.erros.length,
      novos: criados,
      atualizados,
      erros: analise.erros.length,
      regionaisNovas: regionaisCriadas,
      lojasNovas: lojasCriadas,
      lojasAtualizadas,
    },
    mensagem: `Importação concluída: ${criados} criado(s), ${atualizados} atualizado(s).`,
  };
}
