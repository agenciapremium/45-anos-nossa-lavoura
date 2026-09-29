import type { Metadata } from 'next';

import { CabecalhoDeTela } from '@/components/palestras/cabecalho-de-tela';
import { env } from '@/lib/env';
import { MENSAGEM_PADRAO_WHATSAPP } from '@/lib/palestras/mensagem';
import { exigirPapel } from '@/lib/palestras/sessao';
import { FormularioDePalestra } from '../formulario';

export const metadata: Metadata = { title: 'Nova palestra' };
export const dynamic = 'force-dynamic';

export default async function NovaPalestra() {
  await exigirPapel(['admin']);

  return (
    <>
      <CabecalhoDeTela
        sobrancelha="Administração · Palestras"
        titulo="Nova palestra"
        voltar={{ href: '/palestras/admin/palestras', rotulo: 'Voltar para a lista de palestras' }}
      />

      <p className="mt-0 mb-8 max-w-prosa font-corpo text-corpo-lg text-texto">
        O prazo de confirmação é preenchido sozinho com a véspera às 23h59, no
        fuso de Porto Velho. A mensagem já vem com a copy aprovada do
        circuito.
      </p>

      <FormularioDePalestra
        origemPublica={env().APP_BASE_URL}
        valores={{
          cidade: '',
          dataHoraLocal: '',
          localNome: '',
          localEndereco: '',
          prazoLocal: '',
          prazoAjustadoManualmente: false,
          mensagemWhatsapp: MENSAGEM_PADRAO_WHATSAPP,
          ativo: true,
        }}
      />
    </>
  );
}
