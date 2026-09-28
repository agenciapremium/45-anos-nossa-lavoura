'use server';

import { forbidden } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { normalizarCodigo, pareceCodigo } from '@/lib/palestras/codigo';
import { conviteNoEscopo, definirEnviadoPara } from '@/lib/palestras/dados';
import { cancelarPeloPainel } from '@/lib/palestras/servicos/confirmacao';
import { atorDe, exigirAcao, exigirEscopo } from '@/lib/palestras/sessao';

/* =========================================================
   Ações do painel do colaborador sobre um convite

   D2 do design: o escopo é aplicado na CONSULTA, nunca "buscado por id e
   depois checado". Por isso toda ação aqui segue os mesmos dois passos:

   1. `conviteNoEscopo(escopo, { codigo })` — devolve o convite só se ele
      está dentro do que este usuário pode LER. Fora do escopo, `null`,
      igual a "não existe": não há como diferenciar os dois casos de fora.
   2. `exigirAcao(acao, { colaboradorId })` — confere se o papel tem a ação
      de ESCRITA sobre aquele recurso. Um gerente de loja lê o convite da
      própria loja (passo 1 funciona) mas não cancela nem envia (o passo 2
      barra com 403) — leitura e escrita têm alcances diferentes na matriz.
   ========================================================= */

export type EstadoDoCancelamentoPainel = {
  ok: boolean;
  concluido?: boolean;
  mensagem?: string;
};

export async function cancelarConvitePeloPainel(
  _anterior: EstadoDoCancelamentoPainel,
  dados: FormData,
): Promise<EstadoDoCancelamentoPainel> {
  const codigo = normalizarCodigo(String(dados.get('codigo') ?? ''));
  const motivo = String(dados.get('motivo') ?? '').trim() || null;

  if (!pareceCodigo(codigo)) {
    return { ok: false, mensagem: 'Convite não encontrado.' };
  }

  const atual = await exigirEscopo();

  // Passo 1 — dentro do escopo de LEITURA? Fora dele, nem o 403 específico:
  // a resposta é a mesma de "não existe".
  const convite = await conviteNoEscopo(atual.escopo, { codigo });
  if (!convite) forbidden();

  // Passo 2 — o papel tem a ação de ESCRITA sobre este colaborador?
  // Gerente de loja/regional: alcance `nenhum` em `cancelarConvite`, 403
  // aqui mesmo tendo passado no passo 1.
  await exigirAcao('cancelarConvite', { colaboradorId: convite.colaboradorId });

  const resultado = await cancelarPeloPainel({
    codigo,
    autor: {
      tipo: atual.papel === 'admin' ? 'admin' : 'colaborador',
      usuarioId: atual.usuarioId,
      nome: atual.nome,
    },
    motivo,
  });

  if (!resultado.ok) {
    return { ok: false, mensagem: resultado.mensagem };
  }

  revalidatePath('/palestras/painel');
  revalidatePath('/palestras/painel/convites');
  revalidatePath(`/palestras/painel/convites/${codigo}`);
  revalidatePath('/palestras/painel/equipe');

  return { ok: true, concluido: true };
}

/* ---------------------------------------------------------
   Marcação opcional de envio (D4 do design)
   --------------------------------------------------------- */

export type EstadoDaAnotacao = { ok: boolean; mensagem?: string };

export async function definirAnotacaoDeEnvio(
  _anterior: EstadoDaAnotacao,
  dados: FormData,
): Promise<EstadoDaAnotacao> {
  const conviteId = String(dados.get('conviteId') ?? '').trim();
  const valorBruto = String(dados.get('enviadoPara') ?? '');
  const valor = valorBruto.trim() ? valorBruto : null;

  if (!conviteId) return { ok: false, mensagem: 'Convite não encontrado.' };

  const atual = await exigirEscopo();

  // A anotação é lembrete PESSOAL do colaborador — só ele escreve
  // (`definirEnviadoPara` também confere isso, esta é a defesa em duas
  // camadas de sempre: a rota barra cedo, a função de dados barra de novo).
  if (atual.papel !== 'colaborador') forbidden();

  const alterado = await definirEnviadoPara(
    atual.escopo,
    conviteId,
    valor,
    atorDe(atual),
  );
  if (!alterado) forbidden();

  revalidatePath('/palestras/painel/convites');
  return { ok: true };
}
