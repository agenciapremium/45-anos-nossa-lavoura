import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Selo, Sobrancelha, Titulo } from '@/components/ui';
import { buscarPalestra, resumoDeConvites } from '@/lib/palestras/consultas';
import { exigirPapel } from '@/lib/palestras/sessao';
import { paraCampoDataHora } from '@/lib/tempo';
import { FormularioDePalestra } from '../formulario';

export const metadata: Metadata = { title: 'Editar palestra' };

export default async function EditarPalestra({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { escopo } = await exigirPapel(['admin']);
  const { id } = await params;
  const palestra = await buscarPalestra(id);
  if (!palestra) notFound();

  const resumo = await resumoDeConvites(escopo, id);
  const total = Object.values(resumo).reduce((a, b) => a + b, 0);

  return (
    <>
      <Sobrancelha>Palestras</Sobrancelha>
      <div className="flex flex-wrap items-center gap-3">
        <Titulo>{palestra.cidade}</Titulo>
        <Selo tom={palestra.ativo ? 'positivo' : 'neutro'}>
          {palestra.ativo ? 'ativa' : 'desativada'}
        </Selo>
        {palestra.prazoAjustadoManualmente ? (
          <Selo tom="atencao">prazo ajustado à mão</Selo>
        ) : null}
      </div>
      <p className="mt-2 mb-8 font-corpo text-corpo text-texto-suave">
        <code className="font-mono">/palestras/{palestra.slug}</code> ·{' '}
        {total === 0
          ? 'nenhum convite gerado'
          : `${total} convite(s) gerado(s)`}
      </p>

      <FormularioDePalestra
        valores={{
          id: palestra.id,
          cidade: palestra.cidade,
          dataHoraLocal: paraCampoDataHora(palestra.dataHora),
          localNome: palestra.localNome,
          localEndereco: palestra.localEndereco,
          prazoLocal: paraCampoDataHora(palestra.prazoConfirmacao),
          prazoAjustadoManualmente: palestra.prazoAjustadoManualmente,
          mensagemWhatsapp: palestra.mensagemWhatsapp,
          ativo: palestra.ativo,
        }}
      />
    </>
  );
}
