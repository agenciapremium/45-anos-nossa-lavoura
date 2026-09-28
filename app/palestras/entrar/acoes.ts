'use server';

import { redirect } from 'next/navigation';

import { destinoSeguro } from '@/lib/palestras/destino';
import {
  guardarPendencia,
  limparPendencia,
  lerPendencia,
} from '@/lib/palestras/pendencia-de-codigo';
import { MENSAGENS } from '@/lib/palestras/mensagens-de-acesso';
import {
  definirSenhaComToken,
  entrarComCpfENascimento,
  entrarComSenha,
  pedirCodigoPorCpf,
  pedirLinkMagico,
  pedirRedefinicaoDeSenha,
  verificarCodigoPorCpf,
} from '@/lib/palestras/servicos/autenticacao';

/* =========================================================
   Server Actions das telas de acesso

   Uma casca fina: toda decisão — trava, resposta neutra, registro — está
   em `lib/palestras/servicos/autenticacao.ts`. Aqui só se lê o formulário
   e se traduz o resultado em mensagem de tela.

   Nenhuma delas devolve mensagem diferente conforme o cadastro exista. O
   que muda é o **tom**: erro para credencial recusada, aviso para
   bloqueio, informação para envio.
   ========================================================= */

export type EstadoDoAcesso = {
  mensagem?: string;
  tom?: 'erro' | 'aviso' | 'informacao';
};

function texto(dados: FormData, campo: string): string {
  const valor = dados.get(campo);
  return typeof valor === 'string' ? valor.trim() : '';
}

/* --------------------------------------------------------- 1 · senha */

export async function acaoDeSenha(
  _anterior: EstadoDoAcesso,
  dados: FormData,
): Promise<EstadoDoAcesso> {
  const identificador = texto(dados, 'identificador');
  const senha = texto(dados, 'senha');

  if (!identificador || !senha) {
    return { mensagem: MENSAGENS.credencial, tom: 'erro' };
  }

  const resultado = await entrarComSenha({ identificador, senha });
  if (resultado.situacao === 'entrou') {
    redirect(destinoSeguro(texto(dados, 'destino'), resultado.destino));
  }
  return {
    mensagem: resultado.mensagem,
    tom: resultado.situacao === 'bloqueado' ? 'aviso' : 'erro',
  };
}

/* --------------------------------------------------- 2 · link mágico */

export async function acaoDeLinkMagico(
  _anterior: EstadoDoAcesso,
  dados: FormData,
): Promise<EstadoDoAcesso> {
  const email = texto(dados, 'email');
  if (!email) return { mensagem: MENSAGENS.envio, tom: 'informacao' };

  const resultado = await pedirLinkMagico({ email });
  return {
    mensagem: resultado.mensagem,
    tom: resultado.situacao === 'bloqueado' ? 'aviso' : 'informacao',
  };
}

/* -------------------------------------------------- 3 · código (CPF) */

export async function acaoDePedirCodigo(
  _anterior: EstadoDoAcesso,
  dados: FormData,
): Promise<EstadoDoAcesso> {
  const cpf = texto(dados, 'cpf');
  const resultado = await pedirCodigoPorCpf({ cpf });

  if (resultado.situacao === 'enviado') {
    await guardarPendencia({ cpf, emailMascarado: resultado.emailMascarado });
    redirect('/palestras/entrar/codigo');
  }

  return {
    mensagem: resultado.mensagem,
    tom: resultado.situacao === 'bloqueado' ? 'aviso' : 'erro',
  };
}

export async function acaoDeVerificarCodigo(
  _anterior: EstadoDoAcesso,
  dados: FormData,
): Promise<EstadoDoAcesso> {
  const pendencia = await lerPendencia();
  if (!pendencia) {
    return { mensagem: MENSAGENS.codigo, tom: 'erro' };
  }

  const resultado = await verificarCodigoPorCpf({
    cpf: pendencia.cpf,
    codigo: texto(dados, 'codigo'),
  });

  if (resultado.situacao === 'entrou') {
    await limparPendencia();
    redirect(destinoSeguro(texto(dados, 'destino'), resultado.destino));
  }

  return {
    mensagem: resultado.mensagem,
    tom: resultado.situacao === 'bloqueado' ? 'aviso' : 'erro',
  };
}

export async function acaoDeReenviarCodigo(
  _anterior: EstadoDoAcesso,
  _dados: FormData,
): Promise<EstadoDoAcesso> {
  const pendencia = await lerPendencia();
  if (!pendencia) redirect('/palestras/entrar?metodo=codigo');

  const resultado = await pedirCodigoPorCpf({ cpf: pendencia.cpf });
  if (resultado.situacao === 'enviado') {
    await guardarPendencia({
      cpf: pendencia.cpf,
      emailMascarado: resultado.emailMascarado,
    });
    return { mensagem: 'Enviamos um novo código.', tom: 'informacao' };
  }
  return {
    mensagem: resultado.mensagem,
    tom: resultado.situacao === 'bloqueado' ? 'aviso' : 'erro',
  };
}

/* ------------------------------------------ 4 · CPF e data de nascimento */

export async function acaoDeCpfENascimento(
  _anterior: EstadoDoAcesso,
  dados: FormData,
): Promise<EstadoDoAcesso> {
  const cpf = texto(dados, 'cpf');
  const dataNascimento = texto(dados, 'dataNascimento');

  if (!cpf || !dataNascimento) {
    return { mensagem: MENSAGENS.credencial, tom: 'erro' };
  }

  const resultado = await entrarComCpfENascimento({ cpf, dataNascimento });
  if (resultado.situacao === 'entrou') {
    redirect(destinoSeguro(texto(dados, 'destino'), resultado.destino));
  }
  return {
    mensagem: resultado.mensagem,
    tom: resultado.situacao === 'bloqueado' ? 'aviso' : 'erro',
  };
}

/* ------------------------------------------------------- 5 · senha */

export async function acaoDePedirRedefinicao(
  _anterior: EstadoDoAcesso,
  dados: FormData,
): Promise<EstadoDoAcesso> {
  const email = texto(dados, 'email');
  if (!email) return { mensagem: MENSAGENS.envio, tom: 'informacao' };

  const resultado = await pedirRedefinicaoDeSenha({ email });
  return {
    mensagem: resultado.mensagem,
    tom: resultado.situacao === 'bloqueado' ? 'aviso' : 'informacao',
  };
}

export async function acaoDeDefinirSenha(
  _anterior: EstadoDoAcesso,
  dados: FormData,
): Promise<EstadoDoAcesso> {
  const token = texto(dados, 'token');
  const senha = texto(dados, 'senha');
  const repetida = texto(dados, 'repetida');

  if (senha.length < 10) {
    return {
      mensagem: 'A senha precisa ter ao menos 10 caracteres.',
      tom: 'erro',
    };
  }
  if (senha !== repetida) {
    return { mensagem: 'As duas senhas não são iguais.', tom: 'erro' };
  }

  const resultado = await definirSenhaComToken({ token, senha });
  if (!resultado.ok) return { mensagem: resultado.mensagem, tom: 'erro' };

  redirect('/palestras/entrar?aviso=senha-definida');
}
