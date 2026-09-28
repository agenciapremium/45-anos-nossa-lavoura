import 'server-only';

import { inArray } from 'drizzle-orm';

import { db } from '@/lib/db';
import { configuracao as tabela } from '@/lib/db/schema';
import {
  TEXTOS_PADRAO,
  type TextosDeConsentimento,
} from '@/lib/palestras/consentimento';

/* =========================================================
   Configuração editável sem deploy (D9 do design)

   Uma tabela chave/valor, e não variáveis de ambiente: mudar variável na
   Vercel exige nova publicação, que é exatamente o que a spec pede para
   evitar. Aqui, uma revisão do DPO é um `update` de uma linha.

   O código continua trazendo o valor aprovado como padrão. Banco vazio é o
   estado normal: linha em `palestra_configuracao` só existe quando alguém
   decidiu divergir do padrão.
   ========================================================= */

export const CHAVES = {
  politicaVersao: 'politica.versao',
  politicaUrl: 'politica.url',
  encarregadoEmail: 'encarregado.email',
  consentimentoAceite: 'consentimento.aceite',
  consentimentoOptIn: 'consentimento.opt_in',
  consentimentoApoio: 'consentimento.apoio',
} as const;

/**
 * Lê várias chaves numa viagem só.
 *
 * Falha do banco **não** derruba a página: sem configuração, o padrão
 * aprovado vale. O formulário de confirmação não pode deixar de existir
 * porque uma tabela auxiliar não respondeu.
 */
export async function lerConfiguracoes(
  chaves: readonly string[],
): Promise<Map<string, string>> {
  if (chaves.length === 0) return new Map();
  try {
    const linhas = await db()
      .select({ chave: tabela.chave, valor: tabela.valor })
      .from(tabela)
      .where(inArray(tabela.chave, [...chaves]));
    return new Map(
      linhas
        .filter((l) => l.valor.trim().length > 0)
        .map((l) => [l.chave, l.valor]),
    );
  } catch {
    return new Map();
  }
}

/**
 * Textos de consentimento vigentes.
 *
 * Cada campo cai no padrão de `consentimento.ts` quando não há linha na
 * tabela — inclusive a versão da política, que é o valor gravado na
 * confirmação e, por isso, nunca pode chegar vazio.
 */
export async function textosDeConsentimento(): Promise<TextosDeConsentimento> {
  const valores = await lerConfiguracoes(Object.values(CHAVES));

  return {
    versaoDaPolitica:
      valores.get(CHAVES.politicaVersao) ?? TEXTOS_PADRAO.versaoDaPolitica,
    urlDaPolitica:
      valores.get(CHAVES.politicaUrl) ?? TEXTOS_PADRAO.urlDaPolitica,
    emailDoEncarregado:
      valores.get(CHAVES.encarregadoEmail) ?? TEXTOS_PADRAO.emailDoEncarregado,
    aceite: valores.get(CHAVES.consentimentoAceite) ?? TEXTOS_PADRAO.aceite,
    optIn: valores.get(CHAVES.consentimentoOptIn) ?? TEXTOS_PADRAO.optIn,
    apoio: valores.get(CHAVES.consentimentoApoio) ?? TEXTOS_PADRAO.apoio,
  };
}

/** Grava (ou remove, com `null`) uma chave de configuração. */
export async function definirConfiguracao(
  chave: string,
  valor: string | null,
): Promise<void> {
  if (valor === null) {
    await db().delete(tabela).where(inArray(tabela.chave, [chave]));
    return;
  }
  await db()
    .insert(tabela)
    .values({ chave, valor })
    .onConflictDoUpdate({
      target: tabela.chave,
      set: { valor, atualizadoEm: new Date() },
    });
}
