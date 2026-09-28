import 'server-only';

import { createHmac } from 'node:crypto';
import { sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { limite as tabela } from '@/lib/db/schema';
import { env } from '@/lib/env';
import { chaveDeLimite } from '@/lib/palestras/requisicao';

/* =========================================================
   Limite de requisições · implementação definitiva

   D7 do design escolheu, entre Upstash Redis e uma tabela no Neon, **a
   tabela no Neon**: o Upstash acrescenta um serviço, uma credencial e um
   ponto de falha a mais para 390 usuários com pico em quatro noites. Esta
   change cumpre essa decisão — troca as entranhas herdadas de
   `confirmacao-convidado` sem mexer em uma linha das rotas públicas.

   > **Contrato congelado.** As três funções exportadas — `verificarLimite`,
   > `registrarTentativa`, `limparTentativas` — têm assinatura fixa e são
   > consumidas por outra change. O que mudou aqui foi só o que acontece do
   > lado de dentro.

   O que mudou, e por quê:

   1. **A âncora do bloqueio passou a ser a última tentativa**, não a
      primeira. Com a primeira, quem errasse uma vez no minuto 0 e mais
      quatro no minuto 14 sairia do bloqueio 60 segundos depois. A spec pede
      15 minutos *após* as 5 tentativas.
   2. **Varredura de limpeza** (`limparLimitesAntigos`), chamada pela rotina
      diária. A implementação inicial dizia, com razão, que não tinha uma.
   3. **Identificador opaco**: a chave de CPF não guarda o CPF. Ver
      `identificadorOpaco` abaixo.

   O que **não** mudou: `verificarLimite` continua não consumindo tentativa,
   e continua sendo ela quem abre a janela nova quando a anterior vence.
   Quem consome é `registrarTentativa`.
   ========================================================= */

export type ResultadoLimite = {
  /** Falso quando o teto da janela já foi atingido. */
  permitido: boolean;
  /** Quantas tentativas ainda cabem nesta janela. Zero quando bloqueado. */
  tentativasRestantes: number;
  /** Quando o bloqueio cai. Nulo enquanto houver folga. */
  liberadoEm: Date | null;
};

/**
 * Estado da chave na janela corrente.
 *
 * Também **abre** a janela: se a última tentativa já saiu do alcance da
 * janela, a contagem é zerada aqui. É por isso que a função escreve — a
 * alternativa seria guardar o tamanho da janela na linha, acoplando a
 * contagem à política de quem chama.
 *
 * Chamar `verificarLimite` não consome tentativa.
 */
export async function verificarLimite(
  chave: string,
  opcoes: { maximo: number; janelaSegundos: number },
): Promise<ResultadoLimite> {
  const { maximo, janelaSegundos } = opcoes;

  const resultado = await db().execute<{
    tentativas: number;
    ultima_tentativa_em: string | Date | null;
  }>(sql`
    insert into ${tabela} (chave, tentativas, janela_inicio, atualizado_em)
    values (${chave}, 0, now(), now())
    on conflict (chave) do update
       set tentativas = case
             when ${tabela}.ultima_tentativa_em is null
               or ${tabela}.ultima_tentativa_em
                  <= now() - make_interval(secs => ${janelaSegundos})
             then 0
             else ${tabela}.tentativas
           end,
           janela_inicio = case
             when ${tabela}.ultima_tentativa_em is null
               or ${tabela}.ultima_tentativa_em
                  <= now() - make_interval(secs => ${janelaSegundos})
             then now()
             else ${tabela}.janela_inicio
           end,
           ultima_tentativa_em = case
             when ${tabela}.ultima_tentativa_em
                  <= now() - make_interval(secs => ${janelaSegundos})
             then null
             else ${tabela}.ultima_tentativa_em
           end,
           atualizado_em = now()
    returning tentativas, ultima_tentativa_em
  `);

  const linha = resultado.rows[0];
  const tentativas = Number(linha?.tentativas ?? 0);
  const ultima = linha?.ultima_tentativa_em
    ? new Date(linha.ultima_tentativa_em)
    : null;

  if (!ultima) {
    return { permitido: true, tentativasRestantes: maximo, liberadoEm: null };
  }

  const liberadoEm = new Date(ultima.getTime() + janelaSegundos * 1000);

  if (tentativas >= maximo) {
    return { permitido: false, tentativasRestantes: 0, liberadoEm };
  }

  return {
    permitido: true,
    tentativasRestantes: Math.max(0, maximo - tentativas),
    liberadoEm: null,
  };
}

/**
 * Consome uma tentativa da janela corrente.
 *
 * Registrada **antes** de o trabalho ser feito, não depois: uma requisição
 * que derruba o servidor no meio não pode sair de graça da contagem.
 */
export async function registrarTentativa(chave: string): Promise<void> {
  await db().execute(sql`
    insert into ${tabela} (chave, tentativas, janela_inicio, ultima_tentativa_em, atualizado_em)
    values (${chave}, 1, now(), now(), now())
    on conflict (chave) do update
       set tentativas = ${tabela}.tentativas + 1,
           ultima_tentativa_em = now(),
           atualizado_em = now()
  `);
}

/** Zera a contagem da chave. Chamado quando a tentativa dá certo. */
export async function limparTentativas(chave: string): Promise<void> {
  await db().execute(sql`delete from ${tabela} where chave = ${chave}`);
}

/**
 * Apaga linhas que já não influenciam decisão nenhuma.
 *
 * Chamada pela rotina diária de expiração. Vinte e quatro horas é folgado
 * de propósito: a maior janela do sistema tem 15 minutos, e uma linha
 * antiga não muda resultado — só ocupa espaço.
 */
export async function limparLimitesAntigos(
  maxIdadeSegundos = 24 * 60 * 60,
): Promise<number> {
  const resultado = await db().execute<{ chave: string }>(sql`
    delete from ${tabela}
     where atualizado_em < now() - make_interval(secs => ${maxIdadeSegundos})
    returning chave
  `);
  return resultado.rows.length;
}

/* ---------------------------------------------------------
   Chaves
   --------------------------------------------------------- */

/**
 * Transforma um identificador pessoal em rótulo não reversível.
 *
 * Um CPF tem 11 dígitos: um hash simples seria quebrado por força bruta em
 * segundos, e guardá-lo em claro poria uma lista de CPFs numa tabela
 * operacional. O HMAC com o segredo da aplicação resolve os dois: quem
 * obtiver a tabela sem o segredo não recupera CPF nenhum, e a chave
 * continua estável o bastante para contar tentativas.
 */
function identificadorOpaco(valor: string): string {
  return createHmac('sha256', env().BETTER_AUTH_SECRET)
    .update(valor)
    .digest('base64url')
    .slice(0, 22);
}

/**
 * Tentativas de login para um identificador — CPF ou e-mail, conforme o
 * método. O prefixo é o mesmo para os dois: o que conta é a pessoa, não
 * por qual campo ela se apresentou.
 */
export function chaveDeLoginPorIdentificador(valor: string): string {
  return `login:id:${identificadorOpaco(valor.trim().toLowerCase())}`;
}

/**
 * Tentativas de login a partir de um IP.
 *
 * Usa o mesmo `chaveDeLimite` das rotas públicas do convidado: uma só
 * forma de montar chave por IP em todo o projeto, e um só lugar onde
 * decidir o que fazer quando o IP não é identificável.
 */
export function chaveDeLoginPorIp(ip: string | null): string {
  return chaveDeLimite('login', ip);
}

/** Envios de código, link mágico ou redefinição para um identificador. */
export function chaveDeEnvio(identificador: string): string {
  return `envio:id:${identificadorOpaco(identificador)}`;
}

/** Envios a partir de um IP. */
export function chaveDeEnvioPorIp(ip: string | null): string {
  return chaveDeLimite('envio', ip);
}

/**
 * Último envio para um identificador.
 *
 * Chave separada da contagem por janela porque resolve outro problema: o
 * clique duplo no botão "reenviar", que invalidaria o código que acabou de
 * sair. Ver `INTERVALO_MINIMO_DE_ENVIO_SEGUNDOS`.
 */
export function chaveDeIntervaloDeEnvio(identificador: string): string {
  return `envio:intervalo:${identificadorOpaco(identificador)}`;
}

/**
 * Tentativas de abrir códigos de convite inexistentes, por IP.
 *
 * A rota pública do convite (change `confirmacao-convidado`) monta a
 * mesma chave por `chaveDeLimite('codigo-inexistente', ip)`. As duas
 * precisam coincidir, e coincidem porque as duas passam por ali.
 */
export function chaveDeCodigoInexistente(ip: string | null): string {
  return chaveDeLimite('codigo-inexistente', ip);
}
