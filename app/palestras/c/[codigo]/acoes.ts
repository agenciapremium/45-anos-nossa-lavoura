'use server';

import { redirect } from 'next/navigation';

import { MENSAGENS } from '@/lib/palestras/confirmacao';
import { lerFormularioDeConfirmacao } from '@/lib/palestras/confirmacao-esquema';
import { normalizarCodigo, pareceCodigo } from '@/lib/palestras/codigo';
import { registrarTentativa, verificarLimite } from '@/lib/palestras/limite';
import { LIMITE_DE_CONFIRMACAO } from '@/lib/palestras/limites-do-convidado';
import {
  agenteDeUsuario,
  chaveDeLimite,
  enderecoDeOrigem,
} from '@/lib/palestras/requisicao';
import {
  cancelarPeloConvidado,
  confirmacaoDoConvite,
  confirmarPresenca,
  resolverConvite,
} from '@/lib/palestras/servicos/confirmacao';
import type { ErrosPorCampo } from '@/lib/palestras/validacao';
import { ehODispositivoDoTitular, marcarDispositivoDoTitular } from './titular';

/* =========================================================
   Ações do convidado

   Fininhas de propósito: leem o pedido, aplicam o limite por IP e
   entregam o trabalho ao serviço de domínio, que é onde a transação e a
   regra vivem.
   ========================================================= */

export type EstadoDaConfirmacao = {
  ok: boolean;
  mensagem?: string;
  erros?: ErrosPorCampo;
};

export async function confirmar(
  _anterior: EstadoDaConfirmacao,
  dados: FormData,
): Promise<EstadoDaConfirmacao> {
  const codigo = normalizarCodigo(String(dados.get('codigo') ?? ''));
  if (!pareceCodigo(codigo)) {
    return { ok: false, mensagem: MENSAGENS.conviteCancelado };
  }

  const ip = await enderecoDeOrigem();
  const chave = chaveDeLimite('confirmacao', ip);

  const limite = await verificarLimite(chave, LIMITE_DE_CONFIRMACAO);
  if (!limite.permitido) {
    return { ok: false, mensagem: MENSAGENS.limiteExcedido };
  }
  // Consumida antes do trabalho: um envio que falhe no meio não sai de graça.
  await registrarTentativa(chave);

  const resultado = await confirmarPresenca({
    codigo,
    entrada: lerFormularioDeConfirmacao(dados),
    ip,
    userAgent: await agenteDeUsuario(),
  });

  if (!resultado.ok) {
    return {
      ok: false,
      mensagem: resultado.mensagem,
      erros: resultado.erros,
    };
  }

  await marcarDispositivoDoTitular(
    codigo,
    resultado.confirmacaoId,
    resultado.ingressoToken,
  );

  // Fora do try: `redirect` funciona lançando, e um `catch` por perto
  // engoliria a navegação.
  redirect(`/palestras/c/${codigo}`);
}

/* ---------------------------------------------------------
   Cancelamento pelo convidado
   --------------------------------------------------------- */

export type EstadoDoCancelamento = {
  ok: boolean;
  concluido?: boolean;
  mensagem?: string;
};

/**
 * Cancela a confirmação — só a partir do dispositivo do titular.
 *
 * Sem `revalidatePath` de propósito: revalidar trocaria a tela por baixo
 * do aviso de "cancelamento concluído", e quem acabou de cancelar
 * merece ver que deu certo antes de o link virar um aviso genérico.
 */
export async function cancelar(
  _anterior: EstadoDoCancelamento,
  dados: FormData,
): Promise<EstadoDoCancelamento> {
  const codigo = normalizarCodigo(String(dados.get('codigo') ?? ''));
  if (!pareceCodigo(codigo)) {
    return { ok: false, mensagem: MENSAGENS.falhaGenerica };
  }

  const convite = await resolverConvite(codigo);
  if (!convite) {
    return { ok: false, mensagem: MENSAGENS.falhaGenerica };
  }

  const confirmacao = await confirmacaoDoConvite(convite.conviteId);
  if (!confirmacao) {
    return { ok: false, mensagem: MENSAGENS.falhaGenerica };
  }

  // Cancelar é ação do titular. Sem o cookie daquele convite, nada feito —
  // e a resposta não diz se existe confirmação nem de quem ela é.
  const titular = await ehODispositivoDoTitular(
    codigo,
    confirmacao.id,
    confirmacao.ingressoToken,
  );
  if (!titular) {
    return { ok: false, mensagem: MENSAGENS.falhaGenerica };
  }

  const resultado = await cancelarPeloConvidado({ codigo });
  if (!resultado.ok) {
    return { ok: false, mensagem: resultado.mensagem };
  }

  return { ok: true, concluido: true };
}
