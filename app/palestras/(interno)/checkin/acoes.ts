'use server';

import {
  buscarConfirmadoPorCpf,
  buscarConfirmadosPorNome,
  type ConfirmadoParaRecepcao,
} from '@/lib/palestras/dados';
import { checkinManual, checkinPorToken, type ResultadoDoCheckin } from '@/lib/palestras/servicos/checkin';
import { somenteDigitos } from '@/lib/palestras/cpf';
import { atorAutorizado } from '@/lib/palestras/sessao';

/* =========================================================
   Server Actions da tela de check-in (`/palestras/checkin`)

   Quatro ações, todas atrás de `atorAutorizado('fazerCheckin')`: a mesma
   checagem de papel/alcance que protege a leitura de dados em
   `lib/palestras/dados.ts` e a escrita em `servicos/checkin.ts`. É reforço
   em camadas, não decoração — uma tela nova que esqueça de proteger a
   chamada ainda cai em `SemAcesso` aqui.

   D2 do design: nenhuma decisão de validade acontece no cliente. A câmera
   só manda o `token`; quem resolve verde/amarelo/vermelho é sempre o
   servidor, nestas funções.
   ========================================================= */

/** Leitura de QR: o `token` é o conteúdo inteiro do código lido pela câmera. */
export async function verificarQr(
  eventoId: string,
  token: string,
): Promise<ResultadoDoCheckin> {
  const { ator } = await atorAutorizado('fazerCheckin');
  const limpo = token.trim();
  if (!limpo) {
    return {
      ok: false,
      cor: 'vermelho',
      motivo: 'token-desconhecido',
      mensagem: 'Código vazio. Tente ler de novo.',
    };
  }
  return checkinPorToken(limpo, eventoId, ator);
}

/** Check-in a partir de um resultado já localizado pela busca manual. */
export async function confirmarCheckinManual(
  eventoId: string,
  conviteId: string,
): Promise<ResultadoDoCheckin> {
  const { ator } = await atorAutorizado('fazerCheckin');
  return checkinManual(conviteId, eventoId, ator);
}

/** Busca manual por CPF (D1 do design): contingência de mesmo nível que o QR. */
export async function buscarPorCpf(
  eventoId: string,
  cpf: string,
): Promise<ConfirmadoParaRecepcao | null> {
  const { atual } = await atorAutorizado('fazerCheckin');
  const digitos = somenteDigitos(cpf);
  if (digitos.length !== 11) return null;
  return buscarConfirmadoPorCpf(atual.escopo, eventoId, digitos);
}

/** Busca manual por nome parcial. */
export async function buscarPorNome(
  eventoId: string,
  nome: string,
): Promise<ConfirmadoParaRecepcao[]> {
  const { atual } = await atorAutorizado('fazerCheckin');
  if (nome.trim().length < 2) return [];
  return buscarConfirmadosPorNome(atual.escopo, eventoId, nome);
}
