'use server';

import { redirect } from 'next/navigation';

import {
  sair,
  sairDeTodosOsDispositivos,
} from '@/lib/palestras/servicos/autenticacao';

/* =========================================================
   Encerramento de sessão

   Duas ações, porque a spec pede as duas:

   - **Sair**: encerra a sessão deste navegador.
   - **Sair de todos os dispositivos**: encerra todas as sessões do
     usuário. É o que alguém faz depois de usar o computador da loja, ou
     depois de perder o celular.

   São Server Actions (POST com verificação de origem do próprio Next), e
   não links: sair por `GET` é operável por um `<img>` numa página
   qualquer, e um logout forçado por terceiro é irritação gratuita.
   ========================================================= */

export async function encerrarSessao(): Promise<void> {
  await sair();
  redirect('/palestras/entrar?aviso=saiu');
}

export async function encerrarTodasAsSessoes(): Promise<void> {
  await sairDeTodosOsDispositivos();
  redirect('/palestras/entrar?aviso=saiu-de-todos');
}
