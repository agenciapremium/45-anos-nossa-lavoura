'use server';

import { redirect } from 'next/navigation';

import { normalizarCodigo, pareceCodigo } from '@/lib/palestras/codigo';
import { MENSAGENS } from '@/lib/palestras/confirmacao';
import { cpfValido, somenteDigitos } from '@/lib/palestras/cpf';
import {
  limparTentativas,
  registrarTentativa,
  verificarLimite,
} from '@/lib/palestras/limite';
import { LIMITE_DE_RECUPERACAO } from '@/lib/palestras/limites-do-convidado';
import {
  aguardarPisoDeTempo,
  chaveDeLimite,
  enderecoDeOrigem,
} from '@/lib/palestras/requisicao';
import { recuperarIngresso } from '@/lib/palestras/servicos/confirmacao';
import { marcarDispositivoDoTitular } from '../c/[codigo]/titular';

/* =========================================================
   Recuperação de ingresso em outro dispositivo (D4 do design)

   Dois fatores: **CPF e código**. Só CPF permitiria enumerar confirmações
   a partir de um CPF conhecido — e CPF não é segredo. Exigir o código faz
   da recuperação uma prova de que a pessoa recebeu aquele convite.
   ========================================================= */

export type EstadoDaRecuperacao = { ok: boolean; mensagem?: string };

export const ESTADO_INICIAL: EstadoDaRecuperacao = { ok: false };

export async function recuperar(
  _anterior: EstadoDaRecuperacao,
  dados: FormData,
): Promise<EstadoDaRecuperacao> {
  const inicio = Date.now();

  const ip = await enderecoDeOrigem();
  const chave = chaveDeLimite('ingresso', ip);

  const limite = await verificarLimite(chave, LIMITE_DE_RECUPERACAO);
  if (!limite.permitido) {
    await aguardarPisoDeTempo(inicio);
    return { ok: false, mensagem: MENSAGENS.limiteExcedido };
  }
  await registrarTentativa(chave);

  const codigo = normalizarCodigo(String(dados.get('codigo') ?? ''));
  const cpf = somenteDigitos(String(dados.get('cpf') ?? ''));

  /**
   * Resposta neutra para **qualquer** falha: código mal formado, código
   * inexistente, convite nunca confirmado e CPF que não confere são
   * indistinguíveis entre si, no texto e no tempo. Dizer "esse código
   * existe, mas o CPF não confere" entregaria metade do problema.
   */
  const neutra = async (): Promise<EstadoDaRecuperacao> => {
    await aguardarPisoDeTempo(inicio);
    return { ok: false, mensagem: MENSAGENS.recuperacaoSemResultado };
  };

  if (!pareceCodigo(codigo) || !cpfValido(cpf)) return neutra();

  const resultado = await recuperarIngresso({ codigo, cpf });

  if (!resultado.ok) {
    // Cancelado é o único desfecho com mensagem própria: os dois fatores
    // já bateram, então quem está ali é o titular, e deixá-lo tentando de
    // novo não protege ninguém.
    if (resultado.motivo === 'cancelado') {
      await aguardarPisoDeTempo(inicio);
      return { ok: false, mensagem: resultado.mensagem };
    }
    return neutra();
  }

  await limparTentativas(chave);
  await marcarDispositivoDoTitular(
    resultado.codigo,
    resultado.confirmacaoId,
    resultado.ingressoToken,
  );

  redirect(`/palestras/c/${resultado.codigo}`);
}
