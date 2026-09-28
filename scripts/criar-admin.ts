/**
 * Cria (ou atualiza) um usuário com papel `admin` e devolve um link de
 * primeiro acesso para ele definir a própria senha.
 *
 * Existe porque o sistema tem um problema de ovo e galinha: as telas de
 * cadastro de usuário exigem sessão de Admin, e o banco começa sem nenhum
 * usuário. Alguém precisa ser o primeiro, e é por aqui.
 *
 * O link sai do próprio fluxo de redefinição do Better Auth — mesmo token,
 * mesma validade, mesmo uso único. A diferença é que ele é impresso no
 * terminal em vez de enviado por e-mail, o que resolve o caso de o Resend
 * ainda não estar configurado. Nenhuma senha é escolhida aqui: quem roda o
 * script não fica sabendo a senha de ninguém.
 *
 * Idempotente pelo CPF: rodar de novo atualiza o cadastro e emite um link
 * novo, sem duplicar usuário.
 *
  *   npm run admin:criar -- --nome "..." --email "..." \
 *     --cpf "000.000.000-00" --nascimento "DD/MM/AAAA"
 *
 * `--url` define a origem do link impresso. Sem ela vale o `APP_BASE_URL`
 * do ambiente, que em geral é localhost — e o link precisa apontar para
 * onde a pessoa vai abrir:
 *
 *   npm run admin:criar -- ... --url "https://preview.exemplo.vercel.app"
 */
import { config } from 'dotenv';
import { desc, eq, gt } from 'drizzle-orm';

config({ path: '.env', quiet: true });

function argumento(nome: string): string | undefined {
  const i = process.argv.indexOf(`--${nome}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function principal() {
  const nome = argumento('nome');
  const email = argumento('email')?.trim().toLowerCase();
  const cpfBruto = argumento('cpf');
  const nascimentoBruto = argumento('nascimento');
  // O link precisa apontar para o ambiente onde a pessoa vai abrir, que
  // raramente é o APP_BASE_URL de quem roda o script (em geral localhost).
  const baseInformada = argumento('url')?.replace(/\/+$/, '');

  const faltando = [
    ['--nome', nome],
    ['--email', email],
    ['--cpf', cpfBruto],
    ['--nascimento', nascimentoBruto],
  ]
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (faltando.length > 0) {
    console.error(`Faltam argumentos: ${faltando.join(', ')}\n`);
    console.error(
      'Uso:\n  npm run admin:criar -- --nome "Fulano de Tal" \\\n' +
        '    --email "fulano@agpremium.com.br" --cpf "000.000.000-00" \\\n' +
        '    --nascimento "01/01/1990"',
    );
    process.exit(1);
  }

  // Importados depois do dotenv: lib/env.ts valida na carga do módulo.
  const { db, fecharConexoes } = await import('@/lib/db');
  const { user, verification } = await import('@/lib/db/schema');
  const { auth } = await import('@/lib/palestras/auth');
  const { cpfValido, somenteDigitos } = await import('@/lib/palestras/cpf');
  const { env } = await import('@/lib/env');
  const { registrarAuditoria, ACOES, ATOR_DE_SCRIPT } = await import(
    '@/lib/palestras/auditoria'
  );

  try {
    const cpf = somenteDigitos(cpfBruto!);
    if (!cpfValido(cpf)) {
      console.error(`CPF inválido (o dígito verificador não confere): ${cpfBruto}`);
      process.exit(1);
    }

    const [d, m, a] = nascimentoBruto!.split('/');
    if (!d || !m || !a || a.length !== 4) {
      console.error(
        `Data de nascimento fora do formato DD/MM/AAAA: ${nascimentoBruto}`,
      );
      process.exit(1);
    }
    const dataNascimento = `${a}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    if (Number.isNaN(Date.parse(dataNascimento))) {
      console.error(
        `Data de nascimento inexistente no calendário: ${nascimentoBruto}`,
      );
      process.exit(1);
    }

    const [existente] = await db()
      .select({ id: user.id })
      .from(user)
      .where(eq(user.cpf, cpf))
      .limit(1);

    let usuarioId: string;

    if (existente) {
      await db()
        .update(user)
        .set({
          name: nome!,
          email: email!,
          dataNascimento,
          papel: 'admin',
          ativo: true,
          regionalId: null,
          lojaId: null,
          updatedAt: new Date(),
        })
        .where(eq(user.id, existente.id));
      usuarioId = existente.id;
      console.log(`Usuário existente promovido a admin: ${nome} <${email}>`);
    } else {
      const [criado] = await db()
        .insert(user)
        .values({
          name: nome!,
          email: email!,
          emailVerified: false,
          cpf,
          dataNascimento,
          papel: 'admin',
          ativo: true,
        })
        .returning({ id: user.id });
      if (!criado) {
        console.error('O banco não devolveu o usuário recém-criado.');
        process.exit(1);
      }
      usuarioId = criado.id;
      console.log(`Admin criado: ${nome} <${email}>`);
    }

    await registrarAuditoria({
      ator: ATOR_DE_SCRIPT,
      acao: existente ? ACOES.usuarioEditado : ACOES.usuarioCriado,
      entidade: 'user',
      entidadeId: usuarioId,
      dados: { papel: 'admin', origem: 'scripts/criar-admin.ts' },
    });

    // Gera o token pelo fluxo oficial. Sem o Resend configurado o envio
    // falha em silêncio — comportamento desenhado —, mas o token fica
    // gravado em `verification` do mesmo jeito.
    const antes = new Date();
    await auth.api.requestPasswordReset({
      body: { email: email! },
      headers: new Headers(),
    });

    const [registro] = await db()
      .select({ value: verification.value, expiresAt: verification.expiresAt })
      .from(verification)
      .where(gt(verification.createdAt, antes))
      .orderBy(desc(verification.createdAt))
      .limit(1);

    if (!registro) {
      console.error(
        '\nO token de senha não apareceu em `verification`.' +
          '\nO usuário está criado. Gere o link pela tela' +
          '\n/palestras/entrar/senha assim que o Resend estiver configurado.',
      );
      process.exit(1);
    }

    const base = baseInformada ?? env().APP_BASE_URL;
    const url = `${base}/palestras/entrar/senha/nova?t=${encodeURIComponent(registro.value)}`;

    console.log('\n--- Link de primeiro acesso, de uso único ---');
    console.log(url);
    console.log(`\nExpira em ${registro.expiresAt.toISOString()}.`);
    console.log('Abra, defina a senha e entre por /palestras/entrar.');
  } finally {
    await fecharConexoes();
  }
}

principal().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
