import { cookies } from 'next/headers';

import type { Evento } from '@/lib/db/schema';
import { listarPalestrasAtivas } from '@/lib/palestras/consultas';
import { agora, mesmoDiaCivil } from '@/lib/tempo';

/* =========================================================
   Palestra como contexto de navegação (D2 do design)

   A palestra escolhida na barra de topo atravessa convites, equipe,
   relatórios, métricas e check-in, em vez de um filtro por tela. A ordem
   de resolução é sempre a mesma:

     1. `?palestra=` da URL          — autoridade: um link compartilhado
        tem de abrir na palestra que ele diz, mesmo contra a memória.
     2. cookie de sessão             — memória entre telas.
     3. a palestra que acontece hoje — o caso mais comum no dia do evento.
     4. a primeira palestra ativa    — quando nada mais decide.

   O identificador que vem da URL ou do cookie **nunca** alimenta uma
   consulta sem primeiro ser validado contra a lista de palestras ativas:
   é a garantia de que um id inventado, expirado ou de outro escopo não
   entra em nenhuma consulta (D2, "consequência").

   `resolverPalestraAtual` é pura de propósito, no mesmo espírito de
   `lib/palestras/escopo.ts`: a decisão é testável sem banco, sem cookie,
   sem Next.
   ========================================================= */

export const NOME_DO_COOKIE_DE_PALESTRA = 'palestra_atual';

/** Sinaliza de onde veio a palestra resolvida. Serve só a depuração e teste. */
export type OrigemDaPalestra = 'url' | 'memoria' | 'dia' | 'primeira' | 'nenhuma';

export type ResolucaoDePalestra = {
  atual: Evento | null;
  origem: OrigemDaPalestra;
};

/**
 * A decisão em si, sem nenhuma dependência de infraestrutura.
 *
 * `eventosAtivos` deve já vir ordenado por data (como `listarPalestrasAtivas`
 * devolve): é dele que sai "a primeira ativa".
 */
export function resolverPalestraAtual(
  eventosAtivos: readonly Evento[],
  opcoes: {
    idDaUrl?: string | null;
    idDaMemoria?: string | null;
    agora?: Date;
  } = {},
): ResolucaoDePalestra {
  const porId = new Map(eventosAtivos.map((e) => [e.id, e]));

  if (opcoes.idDaUrl) {
    const daUrl = porId.get(opcoes.idDaUrl);
    if (daUrl) return { atual: daUrl, origem: 'url' };
  }

  if (opcoes.idDaMemoria) {
    const daMemoria = porId.get(opcoes.idDaMemoria);
    if (daMemoria) return { atual: daMemoria, origem: 'memoria' };
  }

  const referencia = opcoes.agora ?? agora();
  const doDia = eventosAtivos.find((e) => mesmoDiaCivil(e.dataHora, referencia));
  if (doDia) return { atual: doDia, origem: 'dia' };

  const primeira = eventosAtivos[0];
  if (primeira) return { atual: primeira, origem: 'primeira' };

  return { atual: null, origem: 'nenhuma' };
}

/**
 * Wrapper de servidor: busca as palestras ativas, lê o cookie de memória e
 * aplica `resolverPalestraAtual`.
 *
 * `idDaUrl` vem de `searchParams.palestra` de quem chama — só `page.tsx`
 * recebe `searchParams` no App Router, por isso cada tela passa o seu.
 */
export async function contextoDePalestra(
  idDaUrl?: string | string[] | null,
): Promise<{ eventos: Evento[] } & ResolucaoDePalestra> {
  const eventos = await listarPalestrasAtivas();
  const idDaMemoria = (await cookies()).get(NOME_DO_COOKIE_DE_PALESTRA)?.value ?? null;

  const resolucao = resolverPalestraAtual(eventos, {
    idDaUrl: Array.isArray(idDaUrl) ? idDaUrl[0] : idDaUrl,
    idDaMemoria,
  });

  return { eventos, ...resolucao };
}
