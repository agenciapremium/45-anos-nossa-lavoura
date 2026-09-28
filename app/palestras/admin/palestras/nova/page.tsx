import type { Metadata } from 'next';

import { Sobrancelha, Titulo } from '@/components/ui';
import { MENSAGEM_PADRAO_WHATSAPP } from '@/lib/palestras/mensagem';
import { FormularioDePalestra } from '../formulario';

export const metadata: Metadata = { title: 'Nova palestra' };

export default function NovaPalestra() {
  return (
    <>
      <Sobrancelha>Palestras</Sobrancelha>
      <Titulo>Nova palestra</Titulo>
      <p className="mt-2 mb-8 max-w-prosa font-corpo text-corpo-lg text-texto">
        O prazo de confirmação é preenchido sozinho com a véspera às 23h59, no
        fuso de Porto Velho. A mensagem já vem com a copy aprovada do circuito.
      </p>

      <FormularioDePalestra
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
