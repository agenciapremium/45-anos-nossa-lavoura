import { neon } from '@neondatabase/serverless';
import { NextResponse, type NextRequest } from 'next/server';

/* =========================================================
   Middleware de sessão e papel · primeira camada (D4 do design)

   Roda antes de qualquer tela protegida e responde três perguntas: há
   sessão válida? o usuário continua ativo? o papel alcança este endereço?

   O que ele **não** faz, e é importante que não faça: decidir se o convite
   `K7Q2MX` é de quem pediu. Isso é escopo por recurso, e quem sabe é a
   consulta — `lib/palestras/dados.ts`. O middleware barra cedo e barato; a
   proteção de verdade está lá.

   ── Por que consulta o banco direto, sem o Better Auth

   Aqui é o Edge Runtime. A leitura é um `select` com dois `join` pelo
   transporte HTTP do Neon, que é feito para esse ambiente. Trazer a
   instância do Better Auth para cá arrastaria o adaptador do Drizzle e o
   pool por WebSocket para dentro do bundle do middleware.

   A leitura é por `token`, que é um valor aleatório de 32 caracteres
   gravado pelo Better Auth — o banco é a autoridade sobre a sessão. A
   verificação da assinatura do cookie acontece do lado do servidor, em
   `sessaoAtual()`, que é quem entrega identidade para o código de domínio.

   ── Por que `/palestras/admin` responde 404, e não 401 nem redirecionamento

   Herdado de `fundacao`, e mantido de propósito: um 401 ou um
   redirecionamento para o login confirmam que existe uma área
   administrativa naquele caminho. A base tem dados pessoais de ~390
   colaboradores; a rota não deve nem se anunciar a quem não tem sessão.

   Quem **tem** sessão e não é Admin recebe 403, não 404: a essa altura a
   existência da rota já não é segredo, e um 404 para quem está logado só
   geraria chamado de suporte.
   ========================================================= */

/** Prefixo → papéis que podem entrar. */
const PORTAS: { prefixo: string; papeis: readonly string[]; oculta?: boolean }[] =
  [
    // Mais específico primeiro: `/painel/equipe` antes de `/painel`.
    {
      prefixo: '/palestras/painel/equipe',
      papeis: ['admin', 'gerente_regional', 'gerente_loja'],
    },
    {
      prefixo: '/palestras/painel/convites',
      papeis: ['admin', 'gerente_regional', 'gerente_loja', 'colaborador'],
    },
    {
      prefixo: '/palestras/painel',
      papeis: [
        'admin',
        'gerente_regional',
        'gerente_loja',
        'colaborador',
        'recepcao',
      ],
    },
    { prefixo: '/palestras/admin', papeis: ['admin'], oculta: true },
    { prefixo: '/palestras/checkin', papeis: ['admin', 'recepcao'] },
    {
      prefixo: '/palestras/relatorios',
      papeis: ['admin', 'gerente_regional', 'gerente_loja', 'recepcao'],
    },
  ];

const COOKIES_DE_SESSAO = [
  'palestras.session_token',
  '__Secure-palestras.session_token',
];

const SEM_ACESSO = '/palestras/sem-acesso';
const ENTRAR = '/palestras/entrar';

function porta(caminho: string) {
  return PORTAS.find(
    (p) => caminho === p.prefixo || caminho.startsWith(`${p.prefixo}/`),
  );
}

/**
 * O token cru dentro do cookie assinado.
 *
 * O Better Auth grava `<token>.<assinatura>`. O token é alfanumérico e
 * nunca contém ponto, então o primeiro ponto é sempre o separador.
 */
function tokenDoCookie(pedido: NextRequest): string | null {
  for (const nome of COOKIES_DE_SESSAO) {
    const valor = pedido.cookies.get(nome)?.value;
    if (!valor) continue;
    const bruto = decodeURIComponent(valor);
    const ponto = bruto.indexOf('.');
    const token = ponto > 0 ? bruto.slice(0, ponto) : bruto;
    if (token) return token;
  }
  return null;
}

/** 404 idêntica à de qualquer endereço inexistente. */
function naoEncontrado(pedido: NextRequest) {
  return NextResponse.rewrite(
    new URL('/palestras/nao-existe-esta-rota', pedido.nextUrl.origin),
    { status: 404 },
  );
}

function paraOLogin(pedido: NextRequest, motivo?: 'expirada' | 'desativado') {
  const destino = new URL(ENTRAR, pedido.nextUrl.origin);
  const pedida = pedido.nextUrl.pathname + pedido.nextUrl.search;
  if (pedida && pedida !== ENTRAR) destino.searchParams.set('destino', pedida);
  if (motivo) destino.searchParams.set('aviso', motivo);

  const resposta = NextResponse.redirect(destino);
  // O cookie que sobrou não vale nada; apagá-lo evita o vaivém de quem
  // continua sendo mandado ao login a cada clique.
  for (const nome of COOKIES_DE_SESSAO) {
    resposta.cookies.delete(nome);
  }
  return resposta;
}

type LinhaDeSessao = {
  expires_at: string;
  papel: string;
  ativo: boolean;
};

export async function middleware(pedido: NextRequest) {
  const caminho = pedido.nextUrl.pathname;
  const protegida = porta(caminho);
  if (!protegida) return NextResponse.next();

  const token = tokenDoCookie(pedido);
  if (!token) {
    return protegida.oculta ? naoEncontrado(pedido) : paraOLogin(pedido);
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    // Falha fechada. Sem banco não há como afirmar que alguém tem acesso.
    return protegida.oculta ? naoEncontrado(pedido) : paraOLogin(pedido);
  }

  let linha: LinhaDeSessao | undefined;
  try {
    const sql = neon(url);
    const linhas = (await sql`
      select s.expires_at, u.papel, u.ativo
        from session s
        join "user" u on u.id = s.user_id
       where s.token = ${token}
       limit 1
    `) as unknown as LinhaDeSessao[];
    linha = linhas[0];
  } catch {
    // Banco fora do ar: ninguém entra. Deixar passar "porque não deu para
    // conferir" é como deixar a porta aberta porque a fechadura emperrou.
    return protegida.oculta ? naoEncontrado(pedido) : paraOLogin(pedido);
  }

  if (!linha) {
    return protegida.oculta ? naoEncontrado(pedido) : paraOLogin(pedido);
  }

  if (new Date(linha.expires_at).getTime() <= Date.now()) {
    return protegida.oculta
      ? naoEncontrado(pedido)
      : paraOLogin(pedido, 'expirada');
  }

  /*
     Desativação com efeito imediato (D5 do design). A sessão existe e está
     dentro do prazo; o que mudou foi o estado do usuário, e a requisição
     seguinte à desativação já é recusada.
  */
  if (!linha.ativo) {
    return protegida.oculta
      ? naoEncontrado(pedido)
      : paraOLogin(pedido, 'desativado');
  }

  if (!protegida.papeis.includes(linha.papel)) {
    // 403 de verdade: a rewrite cai numa página que chama `forbidden()`.
    return NextResponse.rewrite(new URL(SEM_ACESSO, pedido.nextUrl.origin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/palestras/painel/:path*',
    '/palestras/admin/:path*',
    '/palestras/checkin/:path*',
    '/palestras/relatorios/:path*',
  ],
};
