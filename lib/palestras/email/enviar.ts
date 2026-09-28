import 'server-only';

import { render } from '@react-email/components';
import type * as React from 'react';
import { Resend } from 'resend';

import { env } from '@/lib/env';
import { mascararEmail } from '@/lib/palestras/mascaras';

import { conteudoProibido } from './conteudo-proibido';

/* =========================================================
   Envio de e-mail transacional pelo Resend

   Três garantias, nesta ordem de importância:

   1. **O envio nunca derruba a aplicação.** Sem `RESEND_API_KEY`, com a
      chave errada ou com o provedor fora do ar, a função devolve um
      resultado negativo e registra o erro. Quem chama mostra a mesma
      mensagem neutra que mostraria em qualquer outro caso — e quem tem
      senha ou CPF + nascimento continua entrando.
   2. **A resposta não denuncia o destinatário.** O motivo da falha fica no
      log do servidor; o usuário recebe sempre a mesma frase.
   3. **O corpo é conferido antes de sair** (`conteudoProibido`): CPF
      completo ou senha no template reprovam o envio.

   O registro usa o e-mail **mascarado**. Um log de servidor é lido por
   mais gente do que se imagina, e um índice de endereços de 390
   funcionários não precisa existir ali.
   ========================================================= */

export type ResultadoDeEnvio =
  | { enviado: true }
  | { enviado: false; motivo: 'sem-configuracao' | 'conteudo-proibido' | 'falha' };

let cliente: Resend | null = null;

function obterCliente(): Resend | null {
  const chave = env().RESEND_API_KEY;
  if (!chave) return null;
  cliente ??= new Resend(chave);
  return cliente;
}

/** Só para testes: descarta o cliente memoizado. */
export function limparClienteDeEmail(): void {
  cliente = null;
}

export async function enviarEmail(pedido: {
  para: string;
  assunto: string;
  conteudo: React.ReactElement;
}): Promise<ResultadoDeEnvio> {
  const destino = mascararEmail(pedido.para);

  let html: string;
  let texto: string;
  try {
    html = await render(pedido.conteudo);
    texto = await render(pedido.conteudo, { plainText: true });
  } catch (erro) {
    console.error('[email] falha ao montar o conteúdo', {
      destino,
      assunto: pedido.assunto,
      erro: mensagemDoErro(erro),
    });
    return { enviado: false, motivo: 'falha' };
  }

  const proibido = conteudoProibido(html);
  if (proibido) {
    console.error(
      '[email] envio recusado: o corpo traz conteúdo proibido pela spec',
      { destino, assunto: pedido.assunto, tipo: proibido.tipo },
    );
    return { enviado: false, motivo: 'conteudo-proibido' };
  }

  const resend = obterCliente();
  if (!resend) {
    console.error(
      '[email] RESEND_API_KEY ausente ou com valor de exemplo: nada foi enviado',
      { destino, assunto: pedido.assunto },
    );
    return { enviado: false, motivo: 'sem-configuracao' };
  }

  try {
    const resposta = await resend.emails.send({
      from: env().EMAIL_FROM,
      to: pedido.para,
      subject: pedido.assunto,
      html,
      text: texto,
    });

    if (resposta.error) {
      console.error('[email] o provedor recusou o envio', {
        destino,
        assunto: pedido.assunto,
        erro: resposta.error.message,
      });
      return { enviado: false, motivo: 'falha' };
    }

    return { enviado: true };
  } catch (erro) {
    console.error('[email] falha de rede no envio', {
      destino,
      assunto: pedido.assunto,
      erro: mensagemDoErro(erro),
    });
    return { enviado: false, motivo: 'falha' };
  }
}

function mensagemDoErro(erro: unknown): string {
  return erro instanceof Error ? erro.message : String(erro);
}
