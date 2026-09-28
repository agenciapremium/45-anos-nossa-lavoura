/**
 * Teste de integração dos quatro métodos de acesso, contra o banco real.
 *
 * Separado de `scripts/integracao.ts` porque exercita o Better Auth, e não
 * a operação de convites. Cobre o que teste puro não alcança: o adaptador
 * do Drizzle, os dois plugins próprios, o gatilho de criação de sessão
 * (duração por papel e recusa de usuário desativado) e a restrição de
 * método por papel verificada **depois** de resolver o usuário.
 *
 * Tudo que ele cria leva o prefixo `[TESTE]` e é removido no fim.
 *
 *   npm run test:acesso
 *
 * ATENÇÃO: escreve no banco de `DATABASE_URL`. Não aponte para produção.
 */
import { config } from 'dotenv';
import { eq, inArray, like } from 'drizzle-orm';

config({ path: '.env', quiet: true });

/*
   O envio de e-mail é neutralizado antes de qualquer import: o valor de
   exemplo é tratado como ausente por `lib/env.ts`, então o Resend nem é
   instanciado. Sem isso, o teste dispararia e-mails para endereços
   `@exemplo.test`, que voltam como rejeição e sujam a reputação do
   domínio.
*/
process.env.RESEND_API_KEY = 're_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

const MARCA = '[TESTE]';

/** CPFs válidos pelo dígito verificador, exclusivos deste teste. */
const CPF_COLABORADOR = '40364147880';
const CPF_GERENTE = '18124938031';
const NASCIMENTO_COLABORADOR = '1985-03-15';
const NASCIMENTO_GERENTE = '1979-08-02';

let falhas = 0;
function checar(condicao: boolean, texto: string, detalhe = '') {
  if (!condicao) falhas++;
  console.log(
    `${condicao ? 'OK   ' : 'FALHA'} ${texto}${detalhe ? ` — ${detalhe}` : ''}`,
  );
}

/**
 * Executa um endpoint do Better Auth fora de um pedido do Next.
 *
 * O gancho `nextCookies` grava o cookie pelo `cookies()` do Next, que só
 * existe dentro de um pedido. Aqui ele estoura **depois** de o endpoint
 * ter feito o trabalho — inclusive de criar a sessão. Então o erro do
 * cookie é absorvido e a verificação passa a ser sobre o estado do banco,
 * que é onde a sessão de fato vive.
 */
async function semCookie<T>(
  executar: () => Promise<T>,
): Promise<T | 'cookie-fora-de-pedido'> {
  try {
    return await executar();
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    if (/request scope|cookies|headers/i.test(mensagem)) {
      return 'cookie-fora-de-pedido';
    }
    throw erro;
  }
}

async function main() {
  const { db, fecharConexoes } = await import('@/lib/db');
  const { loja, regional, session, user, verification } = await import(
    '@/lib/db/schema'
  );
  const { auth } = await import('@/lib/palestras/auth');
  const { impressaoDoCodigo, lerValor, montarValor } = await import(
    '@/lib/palestras/auth-plugins/comum'
  );
  const {
    DOZE_HORAS_EM_SEGUNDOS,
    SETE_DIAS_EM_SEGUNDOS,
  } = await import('@/lib/palestras/papeis');

  const cpfs = [CPF_COLABORADOR, CPF_GERENTE];

  const limpar = async () => {
    const usuarios = await db()
      .select({ id: user.id })
      .from(user)
      .where(inArray(user.cpf, cpfs));
    const ids = usuarios.map((u) => u.id);
    for (const id of ids) {
      await db()
        .delete(verification)
        .where(eq(verification.identifier, `otp-cpf:${id}`));
    }
    if (ids.length) {
      await db().delete(session).where(inArray(session.userId, ids));
      await db().delete(user).where(inArray(user.id, ids));
    }
    await db().delete(loja).where(like(loja.nome, `${MARCA} Acesso%`));
    await db().delete(regional).where(like(regional.nome, `${MARCA} Acesso%`));
  };

  const sessoesDe = async (usuarioId: string) =>
    db()
      .select({ id: session.id, expiresAt: session.expiresAt })
      .from(session)
      .where(eq(session.userId, usuarioId));

  try {
    console.log('== preparação ==');
    await limpar();

    const [reg] = await db()
      .insert(regional)
      .values({ nome: `${MARCA} Acesso Regional` })
      .returning({ id: regional.id });
    const [lj] = await db()
      .insert(loja)
      .values({
        regionalId: reg!.id,
        codigo: `${MARCA}-ACS`,
        nome: `${MARCA} Acesso Loja`,
        cidade: 'Ji-Paraná',
      })
      .returning({ id: loja.id });

    const [colaborador] = await db()
      .insert(user)
      .values({
        name: `${MARCA} Colaborador Acesso`,
        email: 'teste-acesso-colaborador@exemplo.test',
        cpf: CPF_COLABORADOR,
        dataNascimento: NASCIMENTO_COLABORADOR,
        papel: 'colaborador',
        lojaId: lj!.id,
      })
      .returning({ id: user.id });

    const [gerente] = await db()
      .insert(user)
      .values({
        name: `${MARCA} Gerente Acesso`,
        email: 'teste-acesso-gerente@exemplo.test',
        cpf: CPF_GERENTE,
        dataNascimento: NASCIMENTO_GERENTE,
        papel: 'gerente_loja',
        lojaId: lj!.id,
      })
      .returning({ id: user.id });

    checar(Boolean(colaborador?.id && gerente?.id), 'usuários de teste criados');

    /* =========================================================
       Método 5 · definição de senha, e depois o método 1 · senha
       ========================================================= */
    console.log('\n== senha ==');

    const semSenhaAinda = await auth.api
      .signInEmail({
        body: {
          email: 'teste-acesso-colaborador@exemplo.test',
          password: 'senha-que-nunca-foi-definida',
        },
        headers: new Headers(),
      })
      .then(() => 'entrou')
      .catch(() => 'recusado');
    checar(
      semSenhaAinda === 'recusado',
      'quem nunca definiu senha não entra por senha',
    );

    await auth.api.requestPasswordReset({
      body: { email: 'teste-acesso-colaborador@exemplo.test' },
      headers: new Headers(),
    });
    const pendentes = await db()
      .select({ identifier: verification.identifier, value: verification.value })
      .from(verification);
    const linhaDaSenha = pendentes.find((v) =>
      v.identifier.startsWith('reset-password:') && v.value === colaborador!.id,
    );
    checar(Boolean(linhaDaSenha), 'o pedido de redefinição gerou um token');

    const tokenDeSenha = linhaDaSenha!.identifier.replace('reset-password:', '');
    const NOVA_SENHA = 'frase-de-teste-do-circuito-2026';
    await auth.api.resetPassword({
      body: { token: tokenDeSenha, newPassword: NOVA_SENHA },
      headers: new Headers(),
    });

    const reuso = await auth.api
      .resetPassword({
        body: { token: tokenDeSenha, newPassword: `${NOVA_SENHA}-outra` },
        headers: new Headers(),
      })
      .then(() => 'aceitou')
      .catch(() => 'recusou');
    checar(reuso === 'recusou', 'o link de redefinição é de uso único');

    await db().delete(session).where(eq(session.userId, colaborador!.id));

    const senhaErrada = await auth.api
      .signInEmail({
        body: {
          email: 'teste-acesso-colaborador@exemplo.test',
          password: 'senha-errada-de-proposito',
        },
        headers: new Headers(),
      })
      .then(() => 'entrou')
      .catch(() => 'recusado');
    checar(senhaErrada === 'recusado', 'senha errada é recusada');
    checar(
      (await sessoesDe(colaborador!.id)).length === 0,
      'e nenhuma sessão nasce de senha errada',
    );

    const comSenha = await semCookie(() =>
      auth.api.signInEmail({
        body: {
          email: 'teste-acesso-colaborador@exemplo.test',
          password: NOVA_SENHA,
        },
        headers: new Headers(),
      }),
    );
    checar(Boolean(comSenha), 'senha correta conclui o login');
    checar(
      (await sessoesDe(colaborador!.id)).length === 1,
      'e cria exatamente uma sessão',
    );

    /* =========================================================
       Método 2 · link mágico
       ========================================================= */
    console.log('\n== link mágico ==');

    await db().delete(session).where(eq(session.userId, colaborador!.id));

    await auth.api.signInMagicLink({
      body: { email: 'teste-acesso-colaborador@exemplo.test' },
      headers: new Headers(),
    });
    const todosOsTokens = await db()
      .select({ identifier: verification.identifier, value: verification.value })
      .from(verification);
    const linhaDoLink = todosOsTokens.find((v) =>
      v.value.includes('teste-acesso-colaborador@exemplo.test'),
    );
    checar(Boolean(linhaDoLink), 'o pedido de link mágico gerou um token');

    const tokenDoLink = linhaDoLink!.identifier;
    const usoDoLink = await semCookie(() =>
      auth.api.magicLinkVerify({
        query: { token: tokenDoLink },
        headers: new Headers(),
      }),
    );
    checar(Boolean(usoDoLink), 'o link mágico abre a sessão');
    checar(
      (await sessoesDe(colaborador!.id)).length === 1,
      'com exatamente uma sessão',
    );

    const segundoUso = await auth.api
      .magicLinkVerify({
        query: { token: tokenDoLink },
        headers: new Headers(),
      })
      .then(() => 'aceitou')
      .catch(() => 'recusou');
    checar(segundoUso === 'recusou', 'e o mesmo link não serve duas vezes');

    /* --- e-mail desconhecido não vira usuário --- */
    const antesDoDesconhecido = await db()
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, 'ninguem-com-esse-endereco@exemplo.test'));
    await auth.api
      .signInMagicLink({
        body: { email: 'ninguem-com-esse-endereco@exemplo.test' },
        headers: new Headers(),
      })
      .catch(() => undefined);
    const depoisDoDesconhecido = await db()
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, 'ninguem-com-esse-endereco@exemplo.test'));
    checar(
      antesDoDesconhecido.length === 0 && depoisDoDesconhecido.length === 0,
      'e-mail desconhecido NÃO cria usuário (cadastro automático desligado)',
    );

    await db().delete(session).where(eq(session.userId, colaborador!.id));

    /* =========================================================
       Método 3 · código de 6 dígitos a partir do CPF
       ========================================================= */
    console.log('\n== código por CPF ==');

    const envio = await auth.api.enviarCodigoPorCpf({
      body: { cpf: CPF_COLABORADOR },
      headers: new Headers(),
    });
    checar(envio.enviado === true, 'CPF com e-mail aceita o pedido de código');
    checar(
      envio.emailMascarado === 't*****@exemplo.test',
      'e devolve o e-mail mascarado no formato do PRD',
      String(envio.emailMascarado),
    );

    const inexistente = await auth.api.enviarCodigoPorCpf({
      body: { cpf: '12345678909' },
      headers: new Headers(),
    });
    checar(
      inexistente.enviado === false && inexistente.emailMascarado === null,
      'CPF inexistente devolve a resposta neutra, sem e-mail mascarado',
    );

    const [linhaDoCodigo] = await db()
      .select({ id: verification.id, value: verification.value })
      .from(verification)
      .where(eq(verification.identifier, `otp-cpf:${colaborador!.id}`));
    checar(Boolean(linhaDoCodigo), 'o código foi guardado na tabela de verificação');
    checar(
      !/^\d{6}$/.test(lerValor(linhaDoCodigo!.value).impressao),
      'e o que está guardado NÃO é o código em claro',
    );

    // Um código conhecido, para poder conferir a verificação. A impressão
    // é montada pelo mesmo caminho que o plugin usa.
    const CODIGO = '482193';
    await db()
      .update(verification)
      .set({ value: montarValor(impressaoDoCodigo(CODIGO), 0) })
      .where(eq(verification.id, linhaDoCodigo!.id));

    const errado = await auth.api.verificarCodigoPorCpf({
      body: { cpf: CPF_COLABORADOR, codigo: '000000' },
      headers: new Headers(),
    });
    checar(errado.entrou === false, 'código errado é recusado');

    const [aposErro] = await db()
      .select({ value: verification.value })
      .from(verification)
      .where(eq(verification.id, linhaDoCodigo!.id));
    checar(
      lerValor(aposErro!.value).tentativas === 1,
      'e a tentativa é contada no próprio registro do código',
      String(lerValor(aposErro!.value).tentativas),
    );

    const certo = await semCookie(() =>
      auth.api.verificarCodigoPorCpf({
        body: { cpf: CPF_COLABORADOR, codigo: CODIGO },
        headers: new Headers(),
      }),
    );
    checar(
      certo === 'cookie-fora-de-pedido' ||
        (typeof certo === 'object' && certo.entrou === true),
      'código correto conclui a verificação',
    );

    const sessoesDoColaborador = await sessoesDe(colaborador!.id);
    checar(sessoesDoColaborador.length === 1, 'uma sessão foi criada');

    const duracao =
      (new Date(sessoesDoColaborador[0]!.expiresAt).getTime() - Date.now()) /
      1000;
    checar(
      Math.abs(duracao - DOZE_HORAS_EM_SEGUNDOS) < 120,
      'com duração de 12 horas, como manda o papel colaborador',
      `${Math.round(duracao / 3600)} h`,
    );

    const [aposUso] = await db()
      .select({ id: verification.id })
      .from(verification)
      .where(eq(verification.identifier, `otp-cpf:${colaborador!.id}`));
    checar(!aposUso, 'o código sai da tabela depois de usado (uso único)');

    /* --- código esgotado por excesso de tentativas --- */
    await auth.api.enviarCodigoPorCpf({
      body: { cpf: CPF_COLABORADOR },
      headers: new Headers(),
    });
    for (let i = 0; i < 4; i++) {
      await auth.api.verificarCodigoPorCpf({
        body: { cpf: CPF_COLABORADOR, codigo: '111111' },
        headers: new Headers(),
      });
    }
    const quinta = await auth.api.verificarCodigoPorCpf({
      body: { cpf: CPF_COLABORADOR, codigo: '111111' },
      headers: new Headers(),
    });
    checar(
      quinta.entrou === false && quinta.motivo === 'esgotado',
      'cinco erros invalidam o código',
      String(quinta.entrou === false ? quinta.motivo : ''),
    );
    const [sobrou] = await db()
      .select({ id: verification.id })
      .from(verification)
      .where(eq(verification.identifier, `otp-cpf:${colaborador!.id}`));
    checar(!sobrou, 'e o registro do código é removido');

    /* --- novo código invalida o anterior --- */
    await auth.api.enviarCodigoPorCpf({
      body: { cpf: CPF_COLABORADOR },
      headers: new Headers(),
    });
    const [primeiro] = await db()
      .select({ id: verification.id })
      .from(verification)
      .where(eq(verification.identifier, `otp-cpf:${colaborador!.id}`));
    await auth.api.enviarCodigoPorCpf({
      body: { cpf: CPF_COLABORADOR },
      headers: new Headers(),
    });
    const guardados = await db()
      .select({ id: verification.id })
      .from(verification)
      .where(eq(verification.identifier, `otp-cpf:${colaborador!.id}`));
    checar(
      guardados.length === 1 && guardados[0]!.id !== primeiro!.id,
      'um novo código apaga o anterior',
      `${guardados.length} registro(s)`,
    );
    await db()
      .delete(verification)
      .where(eq(verification.identifier, `otp-cpf:${colaborador!.id}`));

    /* --- código expirado --- */
    await auth.api.enviarCodigoPorCpf({
      body: { cpf: CPF_COLABORADOR },
      headers: new Headers(),
    });
    const [paraVencer] = await db()
      .select({ id: verification.id })
      .from(verification)
      .where(eq(verification.identifier, `otp-cpf:${colaborador!.id}`));
    await db()
      .update(verification)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(verification.id, paraVencer!.id));
    const vencido = await auth.api.verificarCodigoPorCpf({
      body: { cpf: CPF_COLABORADOR, codigo: '000000' },
      headers: new Headers(),
    });
    checar(
      vencido.entrou === false && vencido.motivo === 'expirado',
      'código expirado é recusado como expirado',
    );

    /* =========================================================
       Método 4 · CPF e data de nascimento
       ========================================================= */
    console.log('\n== CPF e data de nascimento ==');

    await db().delete(session).where(eq(session.userId, colaborador!.id));

    const dataErrada = await auth.api.entrarPorCpfENascimento({
      body: { cpf: CPF_COLABORADOR, dataNascimento: '01/01/1900' },
      headers: new Headers(),
    });
    checar(dataErrada.entrou === false, 'data de nascimento errada é recusada');
    checar(
      (await sessoesDe(colaborador!.id)).length === 0,
      'e nenhuma sessão nasce disso',
    );

    const comBarras = await semCookie(() =>
      auth.api.entrarPorCpfENascimento({
        body: { cpf: CPF_COLABORADOR, dataNascimento: '15/03/1985' },
        headers: new Headers(),
      }),
    );
    checar(
      comBarras === 'cookie-fora-de-pedido' ||
        (typeof comBarras === 'object' && comBarras.entrou === true),
      'colaborador entra com CPF e data de nascimento corretos',
    );
    const sessoesPorNascimento = await sessoesDe(colaborador!.id);
    checar(sessoesPorNascimento.length === 1, 'sessão criada pelo método fraco');
    const duracaoFraca =
      (new Date(sessoesPorNascimento[0]!.expiresAt).getTime() - Date.now()) /
      1000;
    checar(
      Math.abs(duracaoFraca - DOZE_HORAS_EM_SEGUNDOS) < 120,
      'com as mesmas 12 horas dos demais métodos daquele papel',
      `${Math.round(duracaoFraca / 3600)} h`,
    );

    /* --- papel de gestão é recusado MESMO com os dados corretos --- */
    const gerenteTentando = await auth.api.entrarPorCpfENascimento({
      body: { cpf: CPF_GERENTE, dataNascimento: '02/08/1979' },
      headers: new Headers(),
    });
    checar(
      gerenteTentando.entrou === false,
      'gerente de loja é recusado com CPF e data de nascimento CORRETOS',
    );
    checar(
      (await sessoesDe(gerente!.id)).length === 0,
      'e nenhuma sessão de gerente nasce do método fraco',
    );

    /* --- a recusa do gerente é indistinguível da de dados errados --- */
    checar(
      JSON.stringify(gerenteTentando) === JSON.stringify(dataErrada),
      'a recusa por papel é IDÊNTICA à recusa por dados errados',
      `${JSON.stringify(gerenteTentando)} vs ${JSON.stringify(dataErrada)}`,
    );

    /* =========================================================
       Desativação com efeito imediato
       ========================================================= */
    console.log('\n== desativação ==');

    await db().delete(session).where(eq(session.userId, colaborador!.id));
    await db()
      .update(user)
      .set({ ativo: false })
      .where(eq(user.id, colaborador!.id));

    const desativado = await auth.api.entrarPorCpfENascimento({
      body: { cpf: CPF_COLABORADOR, dataNascimento: '15/03/1985' },
      headers: new Headers(),
    });
    checar(
      desativado.entrou === false,
      'usuário desativado não entra, mesmo com a credencial certa',
    );
    checar(
      (await sessoesDe(colaborador!.id)).length === 0,
      'e o gatilho de criação de sessão impede a sessão de nascer',
    );

    const envioDesativado = await auth.api.enviarCodigoPorCpf({
      body: { cpf: CPF_COLABORADOR },
      headers: new Headers(),
    });
    checar(
      envioDesativado.enviado === false &&
        envioDesativado.emailMascarado === null,
      'e o pedido de código responde como CPF inexistente',
    );

    await db()
      .update(user)
      .set({ ativo: true })
      .where(eq(user.id, colaborador!.id));

    /* =========================================================
       Duração de 7 dias para papel de gestão
       ========================================================= */
    console.log('\n== duração por papel ==');

    await auth.api.enviarCodigoPorCpf({
      body: { cpf: CPF_GERENTE },
      headers: new Headers(),
    });
    const [codigoDoGerente] = await db()
      .select({ id: verification.id })
      .from(verification)
      .where(eq(verification.identifier, `otp-cpf:${gerente!.id}`));
    await db()
      .update(verification)
      .set({ value: montarValor(impressaoDoCodigo(CODIGO), 0) })
      .where(eq(verification.id, codigoDoGerente!.id));

    await semCookie(() =>
      auth.api.verificarCodigoPorCpf({
        body: { cpf: CPF_GERENTE, codigo: CODIGO },
        headers: new Headers(),
      }),
    );
    const sessoesDoGerente = await sessoesDe(gerente!.id);
    checar(sessoesDoGerente.length === 1, 'gerente entra pelo código por CPF');
    const duracaoGerente =
      (new Date(sessoesDoGerente[0]!.expiresAt).getTime() - Date.now()) / 1000;
    checar(
      Math.abs(duracaoGerente - SETE_DIAS_EM_SEGUNDOS) < 120,
      'com sessão de 7 dias',
      `${Math.round(duracaoGerente / 86400)} dia(s)`,
    );

    console.log('\n== limpeza ==');
    await limpar();
    const restou = await db()
      .select({ id: user.id })
      .from(user)
      .where(inArray(user.cpf, cpfs));
    checar(restou.length === 0, 'dados de teste removidos');
  } catch (erro) {
    falhas++;
    console.error('\nERRO:', erro);
  } finally {
    await fecharConexoes();
  }

  console.log(
    falhas === 0
      ? '\nTODOS OS CHECKS DE ACESSO PASSARAM'
      : `\n${falhas} CHECK(S) FALHARAM`,
  );
  process.exit(falhas === 0 ? 0 : 1);
}

void main();
