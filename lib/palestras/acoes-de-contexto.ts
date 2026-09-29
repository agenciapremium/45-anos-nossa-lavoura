'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { listarPalestrasAtivas } from '@/lib/palestras/consultas';
import { NOME_DO_COOKIE_DE_PALESTRA } from '@/lib/palestras/contexto-de-palestra';

const UM_ANO_EM_SEGUNDOS = 365 * 24 * 60 * 60;

/**
 * Troca a palestra em contexto (D2 do design).
 *
 * É o único lugar que escreve o cookie de memória: ele é `httpOnly`, e só
 * um Server Action ou Route Handler grava cookie `httpOnly`. O
 * identificador é validado contra as palestras ativas antes de ir para o
 * cookie, o mesmo cuidado que a leitura já tem em `contexto-de-palestra.ts`.
 */
export async function definirPalestraAtual(dados: FormData): Promise<void> {
  const id = String(dados.get('palestra') ?? '').trim();
  const voltarPara = String(dados.get('voltarPara') ?? '/palestras/painel');

  const ativas = await listarPalestrasAtivas();
  const valido = ativas.some((e) => e.id === id);

  const jar = await cookies();
  if (valido) {
    jar.set(NOME_DO_COOKIE_DE_PALESTRA, id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/palestras',
      maxAge: UM_ANO_EM_SEGUNDOS,
    });
  } else {
    jar.delete(NOME_DO_COOKIE_DE_PALESTRA);
  }

  redirect(destinoDeVolta(voltarPara, valido ? id : null));
}

/**
 * Volta para a página que enviou a troca, com `?palestra=` já atualizado.
 *
 * `voltarPara` vem de um campo oculto preenchido no cliente com
 * `usePathname()` + `useSearchParams()` (só ali existe JS): é mais
 * confiável que o cabeçalho `referer`, que alguns navegadores omitem.
 */
function destinoDeVolta(voltarPara: string, id: string | null): string {
  const caminho = voltarPara.startsWith('/palestras')
    ? voltarPara
    : '/palestras/painel';

  const [semConsulta, consulta] = caminho.split('?');
  const parametros = new URLSearchParams(consulta ?? '');
  if (id) {
    parametros.set('palestra', id);
  } else {
    parametros.delete('palestra');
  }

  const texto = parametros.toString();
  return texto ? `${semConsulta}?${texto}` : (semConsulta as string);
}
