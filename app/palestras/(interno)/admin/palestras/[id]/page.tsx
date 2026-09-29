import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CabecalhoDeTela } from '@/components/palestras/cabecalho-de-tela';
import { Selo } from '@/components/ui';
import { env } from '@/lib/env';
import { buscarPalestra, resumoDeConvites } from '@/lib/palestras/consultas';
import { exigirPapel } from '@/lib/palestras/sessao';
import { paraCampoDataHora } from '@/lib/tempo';
import { FormularioDePalestra } from '../formulario';

export const metadata: Metadata = { title: 'Editar palestra' };
export const dynamic = 'force-dynamic';

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
      <CabecalhoDeTela
        sobrancelha="Administração · Palestras"
        titulo={palestra.cidade}
        voltar={{ href: '/palestras/admin/palestras', rotulo: 'Voltar para a lista de palestras' }}
        extra={
          <>
            <Selo tom={palestra.ativo ? 'positivo' : 'neutro'}>
              {palestra.ativo ? 'ativa' : 'desativada'}
            </Selo>
            {palestra.prazoAjustadoManualmente ? (
              <Selo tom="atencao">prazo ajustado à mão</Selo>
            ) : null}
          </>
        }
      />

      <p className="mt-0 mb-8 font-corpo text-corpo text-texto-suave">
        <code className="font-mono">/palestras/{palestra.slug}</code>
        {' · '}
        {total === 0
          ? 'nenhum convite gerado'
          : `${total} convite(s) gerado(s)`}
      </p>

      <FormularioDePalestra
        origemPublica={env().APP_BASE_URL}
        valores={{
          id: palestra.id,
          slug: palestra.slug,
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
