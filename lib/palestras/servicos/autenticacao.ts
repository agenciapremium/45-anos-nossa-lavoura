import 'server-only';

import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';

import { db } from '@/lib/db';
import { user as tabelaDeUsuario, type Papel } from '@/lib/db/schema';
import {
  ACOES,
  TENTATIVA_DE_ACESSO,
  registrarAuditoria,
  type Ator,
} from '@/lib/palestras/auditoria';
import { auth } from '@/lib/palestras/auth';
import { cpfValido, somenteDigitos } from '@/lib/palestras/cpf';
import {
  ENVIO_POR_IDENTIFICADOR,
  ENVIO_POR_IP,
  INTERVALO_MINIMO_DE_ENVIO_SEGUNDOS,
  LOGIN_POR_CPF,
  LOGIN_POR_IP,
  minutosAte,
  type Politica,
} from '@/lib/palestras/limite-politicas';
import {
  chaveDeEnvio,
  chaveDeEnvioPorIp,
  chaveDeIntervaloDeEnvio,
  chaveDeLoginPorIdentificador,
  chaveDeLoginPorIp,
  limparTentativas,
  registrarTentativa,
  verificarLimite,
} from '@/lib/palestras/limite';
import { mascararEmail } from '@/lib/palestras/mascaras';
import {
  MENSAGENS,
  mensagemDeBloqueio,
} from '@/lib/palestras/mensagens-de-acesso';
import { painelInicial, type Metodo } from '@/lib/palestras/papeis';
import { enderecoDeOrigem } from '@/lib/palestras/requisicao';

/* =========================================================
   Serviço de autenticação

   Toda porta de entrada do sistema passa por aqui. É a camada onde moram
   as três regras que o Better Auth sozinho não teria como cumprir:

   1. **Resposta neutra** (D3 do design). CPF inexistente, CPF sem e-mail,
      senha errada, e-mail não cadastrado, usuário desativado: a mesma
      resposta, com a mesma forma. A base é a lista nominal de funcionários
      de uma empresa — confirmar a existência de um cadastro é vazamento,
      não conveniência.

      A única exceção é deliberada e está na spec: o e-mail **mascarado**
      no fluxo de código por CPF, que só aparece depois de o CPF ser aceito.

   2. **Bloqueio por tentativas**, por identificador e por IP, com limiares
      diferentes (ver `limite-politicas.ts`).

   3. **Registro das tentativas**, sem a credencial informada. O que a
      trilha guarda é identificador mascarado, método, IP, motivo e hora.

   Por isso o manipulador HTTP do Better Auth não é montado: publicá-lo
   abriria uma porta paralela que não passa por nada disso. Ver o cabeçalho
   de `lib/palestras/auth.ts`.
   ========================================================= */

/* ---------------------------------------------------------
   Mensagens · todas neutras
   --------------------------------------------------------- */

export { MENSAGENS, mensagemDeBloqueio };

/* ---------------------------------------------------------
   Resultados
   --------------------------------------------------------- */

export type ResultadoDeAcesso =
  | { situacao: 'entrou'; destino: string }
  | { situacao: 'recusado'; mensagem: string }
  | { situacao: 'bloqueado'; mensagem: string };

export type ResultadoDeEnvio =
  | { situacao: 'enviado'; mensagem: string }
  | { situacao: 'bloqueado'; mensagem: string };

export type ResultadoDeCodigo =
  | { situacao: 'enviado'; emailMascarado: string; mensagem: string }
  | { situacao: 'sem-email'; mensagem: string }
  | { situacao: 'bloqueado'; mensagem: string };

/* ---------------------------------------------------------
   IP de quem pede
   --------------------------------------------------------- */

/**
 * O IP de origem vem de `lib/palestras/requisicao.ts`, o mesmo módulo que
 * as rotas públicas do convidado usam. Ler `x-forwarded-for` errado é
 * fácil e silencioso, e duas leituras diferentes no mesmo projeto seriam
 * duas chances de errar.
 *
 * O bloqueio por IP é trava **secundária**: fora da Vercel o cabeçalho é
 * forjável. A primária é o bloqueio por identificador, que não depende de
 * cabeçalho nenhum.
 */
async function ipDoPedido(): Promise<string | null> {
  return enderecoDeOrigem();
}

/* ---------------------------------------------------------
   Travas
   --------------------------------------------------------- */

type Trava = { chave: string; politica: Politica };

/**
 * Confere as travas antes de qualquer trabalho.
 *
 * Devolve os minutos que faltam quando alguma barra, ou `null` quando
 * todas liberam. A mensagem nunca diz **qual** trava fechou: dizer "o seu
 * IP está bloqueado" informaria que o identificador digitado é válido.
 */
async function conferirTravas(travas: Trava[]): Promise<number | null> {
  const agora = new Date();
  let maiorEspera = 0;
  for (const { chave, politica } of travas) {
    const resultado = await verificarLimite(chave, politica);
    if (!resultado.permitido) {
      maiorEspera = Math.max(maiorEspera, minutosAte(resultado.liberadoEm, agora));
    }
  }
  return maiorEspera > 0 ? maiorEspera : null;
}

async function consumir(travas: Trava[]): Promise<void> {
  for (const { chave } of travas) await registrarTentativa(chave);
}

/**
 * Travas de um pedido de envio: janela por identificador, janela por IP e
 * o **intervalo mínimo** entre dois envios seguidos.
 *
 * O intervalo é uma trava à parte, com teto 1: resolve o clique duplo no
 * botão "reenviar", que sem ele invalidaria o código recém-enviado antes
 * de a pessoa abrir o e-mail.
 */
function travasDeEnvio(identificador: string, ip: string | null): Trava[] {
  return [
    {
      chave: chaveDeIntervaloDeEnvio(identificador),
      politica: {
        maximo: 1,
        janelaSegundos: INTERVALO_MINIMO_DE_ENVIO_SEGUNDOS,
      },
    },
    { chave: chaveDeEnvio(identificador), politica: ENVIO_POR_IDENTIFICADOR },
    { chave: chaveDeEnvioPorIp(ip), politica: ENVIO_POR_IP },
  ];
}

/* ---------------------------------------------------------
   Registro
   --------------------------------------------------------- */

function mascararIdentificador(valor: string): string {
  const limpo = valor.trim();
  if (limpo.includes('@')) return mascararEmail(limpo);
  const digitos = somenteDigitos(limpo);
  if (digitos.length === 11) {
    return `${digitos.slice(0, 3)}.***.***-${digitos.slice(9)}`;
  }
  return '***';
}

/**
 * Registra a tentativa na trilha.
 *
 * O payload leva identificador **mascarado**, método, IP e motivo. Nunca a
 * senha, o código ou a data de nascimento informados — e `limparPayload`,
 * em `auditoria.ts`, remove esses campos mesmo que alguém os passe por
 * engano daqui a seis meses.
 */
async function registrar(
  acao: string,
  dados: {
    metodo: Metodo | 'redefinicao';
    identificador?: string;
    ip: string | null;
    motivo?: string;
  },
  ator: Ator = TENTATIVA_DE_ACESSO,
): Promise<void> {
  try {
    await registrarAuditoria({
      ator,
      acao,
      entidade: 'acesso',
      entidadeId: null,
      dados: {
        metodo: dados.metodo,
        identificadorMascarado: dados.identificador
          ? mascararIdentificador(dados.identificador)
          : null,
        ip: dados.ip ?? 'desconhecido',
        motivo: dados.motivo ?? null,
      },
    });
  } catch (erro) {
    // A trilha não pode derrubar o fluxo de acesso. Se a gravação falhar,
    // o erro vai para o log do servidor e a autenticação segue.
    console.error('[acesso] falha ao registrar na auditoria', erro);
  }
}

/* ---------------------------------------------------------
   Resolução de identificador
   --------------------------------------------------------- */

type Alvo = {
  id: string;
  nome: string;
  email: string | null;
  papel: Papel;
  ativo: boolean;
};

async function porEmail(email: string): Promise<Alvo | null> {
  const [linha] = await db()
    .select({
      id: tabelaDeUsuario.id,
      nome: tabelaDeUsuario.name,
      email: tabelaDeUsuario.email,
      papel: tabelaDeUsuario.papel,
      ativo: tabelaDeUsuario.ativo,
    })
    .from(tabelaDeUsuario)
    .where(eq(tabelaDeUsuario.email, email.trim().toLowerCase()))
    .limit(1);
  return linha ? { ...linha, papel: linha.papel as Papel } : null;
}

async function porCpf(cpf: string): Promise<Alvo | null> {
  const digitos = somenteDigitos(cpf);
  if (digitos.length !== 11) return null;
  const [linha] = await db()
    .select({
      id: tabelaDeUsuario.id,
      nome: tabelaDeUsuario.name,
      email: tabelaDeUsuario.email,
      papel: tabelaDeUsuario.papel,
      ativo: tabelaDeUsuario.ativo,
    })
    .from(tabelaDeUsuario)
    .where(eq(tabelaDeUsuario.cpf, digitos))
    .limit(1);
  return linha ? { ...linha, papel: linha.papel as Papel } : null;
}

/** O identificador digitado parece um CPF? */
function pareceCpf(valor: string): boolean {
  return !valor.includes('@') && somenteDigitos(valor).length === 11;
}

/* =========================================================
   1 · Senha (e-mail ou CPF)
   ========================================================= */

export async function entrarComSenha(entrada: {
  identificador: string;
  senha: string;
}): Promise<ResultadoDeAcesso> {
  const ip = await ipDoPedido();
  const identificador = entrada.identificador.trim();
  const chaveDoIdentificador = chaveDeLoginPorIdentificador(identificador);
  const travas: Trava[] = [
    { chave: chaveDoIdentificador, politica: LOGIN_POR_CPF },
    { chave: chaveDeLoginPorIp(ip), politica: LOGIN_POR_IP },
  ];

  const espera = await conferirTravas(travas);
  if (espera) {
    await registrar(ACOES.acessoBloqueado, {
      metodo: 'senha',
      identificador,
      ip,
      motivo: 'limite de tentativas',
    });
    return { situacao: 'bloqueado', mensagem: mensagemDeBloqueio(espera) };
  }

  await consumir(travas);

  // O CPF é convertido em e-mail aqui: quem guarda senha é a conta do
  // Better Auth, e a conta é identificada pelo e-mail.
  const alvo = pareceCpf(identificador)
    ? await porCpf(identificador)
    : await porEmail(identificador);

  /*
     Tudo o que dá errado daqui para baixo produz a MESMA resposta:
     identificador desconhecido, usuário sem e-mail, usuário desativado,
     usuário que nunca definiu senha, senha errada.
  */
  if (!alvo?.email || !alvo.ativo) {
    await registrar(ACOES.acessoRecusado, {
      metodo: 'senha',
      identificador,
      ip,
      motivo: 'identificador sem credencial utilizável',
    });
    return { situacao: 'recusado', mensagem: MENSAGENS.credencial };
  }

  try {
    await auth.api.signInEmail({
      body: { email: alvo.email, password: entrada.senha },
      headers: await headers(),
    });
  } catch {
    await registrar(ACOES.acessoRecusado, {
      metodo: 'senha',
      identificador,
      ip,
      motivo: 'credencial recusada',
    });
    return { situacao: 'recusado', mensagem: MENSAGENS.credencial };
  }

  return concluir(alvo, 'senha', identificador, ip, chaveDoIdentificador);
}

/* =========================================================
   2 · Link mágico
   ========================================================= */

export async function pedirLinkMagico(entrada: {
  email: string;
}): Promise<ResultadoDeEnvio> {
  const ip = await ipDoPedido();
  const email = entrada.email.trim().toLowerCase();
  const travas = travasDeEnvio(email, ip);

  const espera = await conferirTravas(travas);
  if (espera) {
    await registrar(ACOES.acessoBloqueado, {
      metodo: 'link-magico',
      identificador: email,
      ip,
      motivo: 'limite de envios',
    });
    return { situacao: 'bloqueado', mensagem: mensagemDeBloqueio(espera) };
  }

  await consumir(travas);

  const alvo = await porEmail(email);
  // Cadastro inexistente ou desativado: não envia nada e responde igual.
  if (alvo?.ativo) {
    try {
      await auth.api.signInMagicLink({
        body: { email },
        headers: await headers(),
      });
    } catch (erro) {
      console.error('[acesso] falha ao gerar o link mágico', erro);
    }
  }

  await registrar(ACOES.acessoEnvio, {
    metodo: 'link-magico',
    identificador: email,
    ip,
  });
  return { situacao: 'enviado', mensagem: MENSAGENS.envio };
}

/* =========================================================
   3 · Código de 6 dígitos a partir do CPF
   ========================================================= */

export async function pedirCodigoPorCpf(entrada: {
  cpf: string;
}): Promise<ResultadoDeCodigo> {
  const ip = await ipDoPedido();
  const cpf = somenteDigitos(entrada.cpf);
  const travas = travasDeEnvio(cpf, ip);

  const espera = await conferirTravas(travas);
  if (espera) {
    await registrar(ACOES.acessoBloqueado, {
      metodo: 'otp-por-cpf',
      identificador: cpf,
      ip,
      motivo: 'limite de envios',
    });
    return { situacao: 'bloqueado', mensagem: mensagemDeBloqueio(espera) };
  }

  await consumir(travas);

  // CPF malformado nem chega ao banco, mas responde como qualquer outro
  // CPF sem e-mail: a tela não vira um validador de dígito verificador.
  if (!cpfValido(cpf)) {
    await registrar(ACOES.acessoEnvio, {
      metodo: 'otp-por-cpf',
      identificador: cpf,
      ip,
      motivo: 'sem envio',
    });
    return { situacao: 'sem-email', mensagem: MENSAGENS.semEmail };
  }

  const resposta = await auth.api.enviarCodigoPorCpf({
    body: { cpf },
    headers: await headers(),
  });

  await registrar(ACOES.acessoEnvio, {
    metodo: 'otp-por-cpf',
    identificador: cpf,
    ip,
    motivo: resposta.enviado ? 'código enviado' : 'sem envio',
  });

  if (!resposta.enviado || !resposta.emailMascarado) {
    return { situacao: 'sem-email', mensagem: MENSAGENS.semEmail };
  }

  return {
    situacao: 'enviado',
    emailMascarado: resposta.emailMascarado,
    mensagem: `Enviamos um código para ${resposta.emailMascarado}.`,
  };
}

export async function verificarCodigoPorCpf(entrada: {
  cpf: string;
  codigo: string;
}): Promise<ResultadoDeAcesso> {
  const ip = await ipDoPedido();
  const cpf = somenteDigitos(entrada.cpf);
  const chaveDoIdentificador = chaveDeLoginPorIdentificador(cpf);
  const travas: Trava[] = [
    { chave: chaveDoIdentificador, politica: LOGIN_POR_CPF },
    { chave: chaveDeLoginPorIp(ip), politica: LOGIN_POR_IP },
  ];

  const espera = await conferirTravas(travas);
  if (espera) {
    await registrar(ACOES.acessoBloqueado, {
      metodo: 'otp-por-cpf',
      identificador: cpf,
      ip,
      motivo: 'limite de tentativas',
    });
    return { situacao: 'bloqueado', mensagem: mensagemDeBloqueio(espera) };
  }

  await consumir(travas);

  const resposta = await auth.api.verificarCodigoPorCpf({
    body: { cpf, codigo: entrada.codigo },
    headers: await headers(),
  });

  if (!resposta.entrou) {
    await registrar(ACOES.acessoRecusado, {
      metodo: 'otp-por-cpf',
      identificador: cpf,
      ip,
      motivo: resposta.motivo,
    });
    return {
      situacao: 'recusado',
      mensagem:
        resposta.motivo === 'esgotado'
          ? MENSAGENS.codigoEsgotado
          : MENSAGENS.codigo,
    };
  }

  await limparTentativas(chaveDoIdentificador);
  await registrar(
    ACOES.acessoEfetuado,
    { metodo: 'otp-por-cpf', identificador: cpf, ip },
    { id: resposta.usuarioId, nome: 'acesso por código' },
  );
  return { situacao: 'entrou', destino: painelInicial(resposta.papel) };
}

/* =========================================================
   4 · CPF e data de nascimento
   ========================================================= */

export async function entrarComCpfENascimento(entrada: {
  cpf: string;
  dataNascimento: string;
}): Promise<ResultadoDeAcesso> {
  const ip = await ipDoPedido();
  const cpf = somenteDigitos(entrada.cpf);
  const chaveDoIdentificador = chaveDeLoginPorIdentificador(cpf);
  const travas: Trava[] = [
    { chave: chaveDoIdentificador, politica: LOGIN_POR_CPF },
    { chave: chaveDeLoginPorIp(ip), politica: LOGIN_POR_IP },
  ];

  const espera = await conferirTravas(travas);
  if (espera) {
    await registrar(ACOES.acessoBloqueado, {
      metodo: 'cpf-e-nascimento',
      identificador: cpf,
      ip,
      motivo: 'limite de tentativas',
    });
    return { situacao: 'bloqueado', mensagem: mensagemDeBloqueio(espera) };
  }

  await consumir(travas);

  const resposta = await auth.api.entrarPorCpfENascimento({
    body: { cpf, dataNascimento: entrada.dataNascimento },
    headers: await headers(),
  });

  if (!resposta.entrou) {
    /*
       O motivo não é devolvido pelo plugin de propósito: papel de gestão,
       data errada, CPF inexistente e conta desativada são a mesma recusa.
       Se a trilha distinguisse, a distinção existiria — e bastaria alguém
       com acesso à auditoria para transformá-la num verificador.
    */
    await registrar(ACOES.acessoRecusado, {
      metodo: 'cpf-e-nascimento',
      identificador: cpf,
      ip,
      motivo: 'credencial recusada',
    });
    return { situacao: 'recusado', mensagem: MENSAGENS.credencial };
  }

  await limparTentativas(chaveDoIdentificador);
  await registrar(
    ACOES.acessoEfetuado,
    { metodo: 'cpf-e-nascimento', identificador: cpf, ip },
    { id: resposta.usuarioId, nome: 'acesso por CPF e nascimento' },
  );
  return { situacao: 'entrou', destino: painelInicial(resposta.papel) };
}

/* =========================================================
   5 · Senha: definição e redefinição
   ========================================================= */

export async function pedirRedefinicaoDeSenha(entrada: {
  email: string;
}): Promise<ResultadoDeEnvio> {
  const ip = await ipDoPedido();
  const email = entrada.email.trim().toLowerCase();
  const travas = travasDeEnvio(email, ip);

  const espera = await conferirTravas(travas);
  if (espera) {
    await registrar(ACOES.acessoBloqueado, {
      metodo: 'redefinicao',
      identificador: email,
      ip,
      motivo: 'limite de envios',
    });
    return { situacao: 'bloqueado', mensagem: mensagemDeBloqueio(espera) };
  }

  await consumir(travas);

  const alvo = await porEmail(email);
  if (alvo?.ativo) {
    try {
      await auth.api.requestPasswordReset({
        body: { email },
        headers: await headers(),
      });
    } catch (erro) {
      console.error('[acesso] falha ao gerar o link de senha', erro);
    }
  }

  await registrar(ACOES.acessoEnvio, {
    metodo: 'redefinicao',
    identificador: email,
    ip,
  });
  return { situacao: 'enviado', mensagem: MENSAGENS.envio };
}

export async function definirSenhaComToken(entrada: {
  token: string;
  senha: string;
}): Promise<{ ok: true } | { ok: false; mensagem: string }> {
  const ip = await ipDoPedido();
  try {
    await auth.api.resetPassword({
      body: { token: entrada.token, newPassword: entrada.senha },
      headers: await headers(),
    });
  } catch {
    await registrar(ACOES.acessoRecusado, {
      metodo: 'redefinicao',
      ip,
      motivo: 'link de senha inválido ou expirado',
    });
    return { ok: false, mensagem: MENSAGENS.link };
  }

  await registrar(ACOES.senhaDefinida, { metodo: 'redefinicao', ip });
  return { ok: true };
}

/* =========================================================
   6 · Encerramento de sessão
   ========================================================= */

export async function sair(): Promise<void> {
  const cabecalhos = await headers();
  try {
    await auth.api.signOut({ headers: cabecalhos });
  } catch (erro) {
    console.error('[acesso] falha ao encerrar a sessão', erro);
  }
}

/**
 * Encerra **todas** as sessões do usuário, inclusive a atual e as de
 * outros navegadores. É o "sair de todos os dispositivos" da spec.
 */
export async function sairDeTodosOsDispositivos(): Promise<void> {
  const cabecalhos = await headers();
  try {
    await auth.api.revokeSessions({ headers: cabecalhos });
  } catch (erro) {
    console.error('[acesso] falha ao encerrar as sessões', erro);
  }
  try {
    await auth.api.signOut({ headers: cabecalhos });
  } catch {
    // A sessão atual já pode ter sido revogada acima; o cookie é limpo
    // pelo middleware na requisição seguinte.
  }
}

/* ---------------------------------------------------------
   Fecho comum dos logins bem-sucedidos
   --------------------------------------------------------- */

async function concluir(
  alvo: Alvo,
  metodo: Metodo,
  identificador: string,
  ip: string | null,
  chaveDoIdentificador: string,
): Promise<ResultadoDeAcesso> {
  /*
     Contador zerado só o do identificador, como manda a spec. O contador
     do IP fica: um acerto não pode apagar o rastro de uma varredura que
     acertou uma vez em dez.
  */
  await limparTentativas(chaveDoIdentificador);
  await registrar(
    ACOES.acessoEfetuado,
    { metodo, identificador, ip },
    { id: alvo.id, nome: alvo.nome },
  );
  return { situacao: 'entrou', destino: painelInicial(alvo.papel) };
}
