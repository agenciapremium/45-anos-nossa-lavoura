import type { Metadata } from 'next';

import {
  ColunaPublica,
  RodapePublico,
  TopoPublico,
} from '@/components/palestras/publico';
import { Aviso, LinkBotao } from '@/components/ui';
import { FormularioDeRecuperacao } from './formulario';

export const metadata: Metadata = {
  title: 'Recuperar ingresso',
  description:
    'Recupere o ingresso do Circuito Acelera no Campo 3.0 informando o CPF confirmado e o código do convite.',
  // Fora dos buscadores e fora do `sitemap.xml` (spec `estados-do-link`).
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = 'force-dynamic';

export default function PaginaDeRecuperacao() {
  return (
    <>
      <TopoPublico titulo="Recuperar meu ingresso">
        <p className="m-0 max-w-prosa font-corpo text-corpo-lg font-light text-texto-inverso-suave">
          Trocou de celular, limpou o navegador ou abriu em uma aba anônima?
          Informe os dois dados abaixo e o ingresso volta.
        </p>
      </TopoPublico>

      <ColunaPublica>
        <FormularioDeRecuperacao />

        <Aviso tom="informacao" className="mt-8">
          <p>
            Pedimos <strong>CPF e código</strong> juntos porque CPF não é
            segredo: o código prova que o convite é seu.
          </p>
          <p>
            Não encontra o código? Ele está no fim do link que você recebeu
            pelo WhatsApp. Se o link se perdeu, o colaborador da Nossa Lavoura
            que enviou o convite consegue localizá-lo.
          </p>
        </Aviso>

        <div className="mt-6">
          <LinkBotao
            href="/palestras"
            variante="contorno"
            tamanho="lg"
            className="w-full"
          >
            Ver as palestras do circuito
          </LinkBotao>
        </div>
      </ColunaPublica>

      <RodapePublico />
    </>
  );
}
