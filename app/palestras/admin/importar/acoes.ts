'use server';

import { revalidatePath } from 'next/cache';

import type { ErroDeLinha } from '@/lib/palestras/importacao';
import {
  aplicarImportacao,
  previsualizarImportacao,
  type Contagens,
} from '@/lib/palestras/servicos/importacao';
import { atorAutorizado, exigirAcao } from '@/lib/palestras/sessao';

/* =========================================================
   Importação em duas etapas

   1. `previsualizar` — analisa e conta. **Não grava nada.**
   2. `confirmarImportacao` — grava tudo numa transação só.

   O conteúdo do arquivo trafega entre as duas etapas dentro do formulário,
   em campo escondido. A alternativa seria guardar o arquivo no servidor
   entre os dois passos, o que exigiria armazenamento temporário e uma
   política de expurgo para um CSV cheio de CPF. Não vale o custo.

   A lógica de banco fica em `lib/palestras/servicos/importacao.ts`: aqui só
   o guard e a tradução do formulário.
   ========================================================= */

const LIMITE_DE_BYTES = 2 * 1024 * 1024;

export type { Contagens };

export type EstadoDaImportacao = {
  etapa: 'inicial' | 'previa' | 'confirmada' | 'falha';
  mensagem?: string;
  arquivoNome?: string;
  conteudo?: string;
  contagens?: Contagens;
  erros?: ErroDeLinha[];
  /** Amostra do que vai ser gravado, para conferência visual. */
  amostra?: {
    linha: number;
    nome: string;
    cpf: string;
    papel: string;
    loja: string;
    regional: string;
    situacao: 'novo' | 'atualizado';
  }[];
};

export const ESTADO_INICIAL: EstadoDaImportacao = { etapa: 'inicial' };

export async function previsualizar(
  _anterior: EstadoDaImportacao,
  dados: FormData,
): Promise<EstadoDaImportacao> {
  await exigirAcao('cadastrarEImportarEstrutura');

  const arquivo = dados.get('arquivo');
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { etapa: 'falha', mensagem: 'Escolha um arquivo CSV.' };
  }
  if (arquivo.size > LIMITE_DE_BYTES) {
    return {
      etapa: 'falha',
      mensagem: `O arquivo tem ${(arquivo.size / 1024 / 1024).toFixed(1)} MB. O limite é 2 MB.`,
    };
  }

  const conteudo = await arquivo.text();
  const previa = await previsualizarImportacao(conteudo);

  if (!previa.ok) {
    return { etapa: 'falha', mensagem: previa.mensagem, erros: previa.erros };
  }

  return {
    etapa: 'previa',
    arquivoNome: arquivo.name,
    conteudo,
    contagens: previa.contagens,
    erros: previa.erros,
    amostra: previa.amostra,
  };
}

export async function confirmarImportacao(
  _anterior: EstadoDaImportacao,
  dados: FormData,
): Promise<EstadoDaImportacao> {
  const { ator } = await atorAutorizado('cadastrarEImportarEstrutura');

  const conteudo = String(dados.get('conteudo') ?? '');
  const arquivoNome = String(dados.get('arquivoNome') ?? 'colaboradores.csv');
  const somenteValidas = dados.get('somenteValidas') === 'sim';

  if (!conteudo) {
    return {
      etapa: 'falha',
      mensagem: 'Nada para importar. Envie o arquivo de novo.',
    };
  }

  const resultado = await aplicarImportacao({
    conteudo,
    arquivoNome,
    somenteValidas,
    ator,
  });

  if (!resultado.ok) {
    return {
      etapa: 'falha',
      arquivoNome,
      conteudo,
      erros: resultado.erros,
      mensagem: resultado.mensagem,
    };
  }

  revalidatePath('/palestras/admin/organizacao');
  revalidatePath('/palestras/admin/importar');
  revalidatePath('/palestras/admin/gerar');
  revalidatePath('/palestras/admin/distribuir');

  return {
    etapa: 'confirmada',
    arquivoNome,
    contagens: resultado.contagens,
    erros: resultado.erros,
    mensagem: resultado.mensagem,
  };
}
