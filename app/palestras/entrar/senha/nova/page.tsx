import Link from 'next/link';

import { Aviso, Subtitulo } from '@/components/ui';
import { MENSAGENS } from '@/lib/palestras/servicos/autenticacao';

import { FormularioDeNovaSenha } from '../../formularios';

export const dynamic = 'force-dynamic';

/**
 * Definição da senha a partir do link recebido por e-mail (tarefa 6.5).
 *
 * Mesma casca de `/palestras/entrar`: título, formulário e ação dentro do
 * cartão único de `layout.tsx`.
 *
 * O token vem na query. Não é conferido aqui: quem confere é o Better Auth
 * no momento de salvar. Conferir antes e mostrar "link inválido" de cara
 * daria a um raspador uma forma barata de testar tokens sem gastar o
 * limite do formulário.
 */
export default async function NovaSenha({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; error?: string }>;
}) {
  const { t, error } = await searchParams;

  if (!t || error) {
    return (
      <>
        <Subtitulo className="mb-4">Link inválido</Subtitulo>
        <Aviso tom="atencao" className="mb-6">
          <p className="m-0">{MENSAGENS.link}</p>
        </Aviso>
        <p className="text-center font-corpo text-corpo-sm">
          <Link
            href="/palestras/entrar/senha"
            className="font-bold text-terra-700 underline underline-offset-4"
          >
            Pedir um novo link
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <Subtitulo className="mb-1">Defina a sua senha</Subtitulo>
      <p className="mt-0 mb-6 font-corpo text-corpo-sm text-texto-suave">
        Escolha uma senha de pelo menos 10 caracteres.
      </p>
      <FormularioDeNovaSenha token={t} />
    </>
  );
}
