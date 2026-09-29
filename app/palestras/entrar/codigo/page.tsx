import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Subtitulo } from '@/components/ui';
import { lerPendencia } from '@/lib/palestras/pendencia-de-codigo';

import { FormularioDoCodigo } from '../formularios';

export const dynamic = 'force-dynamic';

/**
 * Segundo passo do acesso por CPF (tarefa 6.5).
 *
 * Mesma casca de `/palestras/entrar`: só troca o título e o formulário
 * dentro do cartão único de `layout.tsx`.
 *
 * Só existe depois de o CPF ser aceito: sem a pendência assinada no
 * cookie, a tela volta para o começo. É isso que impede que alguém abra
 * esta URL direto, troque o CPF e use a exibição do e-mail mascarado como
 * verificador de cadastro.
 */
export default async function TelaDoCodigo({
  searchParams,
}: {
  searchParams: Promise<{ destino?: string }>;
}) {
  const pendencia = await lerPendencia();
  if (!pendencia) redirect('/palestras/entrar?metodo=codigo');

  const { destino } = await searchParams;

  return (
    <>
      <Subtitulo className="mb-1">Digite o código</Subtitulo>
      <p className="mt-0 mb-6 font-corpo text-corpo-sm text-texto-suave">
        Sem acesso a esse e-mail?{' '}
        <Link
          href="/palestras/entrar?metodo=nascimento"
          className="font-bold text-terra-700 underline underline-offset-4"
        >
          Entre com CPF e data de nascimento
        </Link>
        .
      </p>

      <FormularioDoCodigo
        emailMascarado={pendencia.emailMascarado}
        destino={destino}
      />
    </>
  );
}
