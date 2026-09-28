import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Cartao, LinkBotao, Selo, Sobrancelha, Titulo } from '@/components/ui';
import { confirmacoesNoEscopo, conviteNoEscopo } from '@/lib/palestras/dados';
import { normalizarCodigo, pareceCodigo } from '@/lib/palestras/codigo';
import { exigirEscopo } from '@/lib/palestras/sessao';
import { formatarCarimbo, formatarDataHora } from '@/lib/tempo';

export const metadata: Metadata = { title: 'Convite confirmado' };
export const dynamic = 'force-dynamic';

/**
 * Detalhe de um convite confirmado: titular, acompanhante e CPF mascarado
 * (spec `painel-convites`, requisito "Visão dos convites confirmados").
 *
 * D2 do design: a busca já é `conviteNoEscopo` — nunca "por id e depois
 * confere se é seu". Fora do escopo, o mesmo 404 de um código inexistente:
 * a resposta não distingue "não existe" de "é de outra pessoa".
 */
export default async function DetalheDoConvite({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { escopo } = await exigirEscopo();
  const { codigo: bruto } = await params;
  const codigo = normalizarCodigo(bruto);
  if (!pareceCodigo(codigo)) notFound();

  const convite = await conviteNoEscopo(escopo, { codigo });
  if (!convite) notFound();

  const [confirmacao] = await confirmacoesNoEscopo(escopo, { conviteId: convite.id });

  return (
    <>
      <Sobrancelha>{convite.eventoCidade}</Sobrancelha>
      <Titulo>Convite {convite.codigo}</Titulo>
      <p className="mt-2 mb-6 font-corpo text-corpo-lg text-texto">
        {formatarDataHora(convite.eventoDataHora)}
      </p>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Selo tom={convite.estado === 'presente' ? 'acento' : 'positivo'}>
          {convite.estado === 'presente' ? 'Presente' : 'Confirmado'}
        </Selo>
        {convite.checkinEm ? (
          <span className="font-corpo text-corpo-sm text-texto-suave">
            Compareceu em {formatarCarimbo(convite.checkinEm)}
          </span>
        ) : null}
      </div>

      {!confirmacao ? (
        <Cartao>
          <p className="m-0 font-corpo text-corpo text-texto">
            Este convite está {convite.estado}, mas os dados do convidado não
            foram encontrados. Se isso persistir, avise a administração.
          </p>
        </Cartao>
      ) : (
        <Cartao className="max-w-md">
          <p className="m-0 font-corpo text-rotulo font-bold uppercase tracking-sobrancelha text-lima-700">
            Titular
          </p>
          <p className="mt-1 mb-4 font-titulo text-t3 font-bold text-texto-forte">
            {confirmacao.titular}
          </p>

          <p className="m-0 font-corpo text-rotulo font-bold uppercase tracking-sobrancelha text-lima-700">
            Acompanhante
          </p>
          <p className="mt-1 mb-4 font-corpo text-corpo-lg text-texto">
            {confirmacao.acompanhante ?? 'Sem acompanhante.'}
          </p>

          <p className="m-0 font-corpo text-rotulo font-bold uppercase tracking-sobrancelha text-lima-700">
            CPF
          </p>
          <p className="mt-1 mb-0 font-mono text-corpo-lg text-texto-forte">
            {confirmacao.cpf}
          </p>
        </Cartao>
      )}

      <div className="mt-6">
        <LinkBotao href="/palestras/painel/convites" variante="texto">
          Voltar para a lista
        </LinkBotao>
      </div>
    </>
  );
}
