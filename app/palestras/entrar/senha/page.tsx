import Link from 'next/link';

import { Subtitulo } from '@/components/ui';

import { FormularioDeRedefinicao } from '../formularios';

export const dynamic = 'force-dynamic';

/**
 * Pedido de definição ou redefinição de senha.
 *
 * A mesma tela serve aos dois casos, e de propósito: se separasse
 * "primeiro acesso" de "esqueci a senha", a escolha entre uma e outra já
 * informaria se aquele e-mail tem senha definida.
 */
export default function PedirSenha() {
  return (
    <>
      <Subtitulo className="mb-1">Criar ou trocar a senha</Subtitulo>
      <p className="mt-0 mb-6 font-corpo text-corpo-sm text-texto-suave">
        Informe o e-mail cadastrado. Enviamos um link para você definir a
        senha — serve tanto para o primeiro acesso quanto para trocar a atual.
      </p>

      <FormularioDeRedefinicao />

      <p className="mt-6 text-center font-corpo text-corpo-sm text-texto-suave">
        <Link
          href="/palestras/entrar"
          className="font-bold text-terra-700 underline underline-offset-4"
        >
          Voltar para as formas de entrar
        </Link>
      </p>
    </>
  );
}
