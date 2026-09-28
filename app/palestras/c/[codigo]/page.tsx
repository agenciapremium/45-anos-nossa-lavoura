import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import {
  TelaDeEstado,
  type VarianteDeEstado,
} from '@/components/palestras/estados';
import {
  ColunaPublica,
  DadosDaPalestra,
  RodapePublico,
  TopoPublico,
} from '@/components/palestras/publico';
import { Sobrancelha } from '@/components/ui';
import { normalizarCodigo, pareceCodigo } from '@/lib/palestras/codigo';
import { textosDeConsentimento } from '@/lib/palestras/configuracao';
import { partirTexto } from '@/lib/palestras/consentimento';
import { qrComoDataUri } from '@/lib/palestras/ingresso';
import { registrarTentativa, verificarLimite } from '@/lib/palestras/limite';
import { LIMITE_DE_VARREDURA } from '@/lib/palestras/limites-do-convidado';
import {
  aguardarPisoDeTempo,
  chaveDeLimite,
  enderecoDeOrigem,
} from '@/lib/palestras/requisicao';
import {
  confirmacaoDoConvite,
  montarIngresso,
  resolverConvite,
} from '@/lib/palestras/servicos/confirmacao';
import {
  formatarData,
  formatarDataPorExtenso,
  formatarHorario,
} from '@/lib/tempo';
import { FormularioDeConfirmacao } from './formulario';
import { Ingresso } from './ingresso';
import { ehODispositivoDoTitular } from './titular';

/* =========================================================
   Página do convite

   A única tela do sistema com usuário externo: sem login, sem treinamento
   e sem suporte. O que ela mostra depende do estado do convite, e o que
   ela **não** mostra é tão importante quanto.
   ========================================================= */

/**
 * Metadados fixos, sem nada do convite.
 *
 * `generateMetadata` poderia pôr a cidade no `<title>` — e aí a aba, o
 * histórico do navegador e a pré-visualização de qualquer compartilhamento
 * contariam que aquele código existe. O título é o mesmo para código
 * válido, expirado, cancelado e inexistente.
 */
export const metadata: Metadata = {
  title: 'Confirmação de presença',
  description: 'Confirme sua presença no Circuito Acelera no Campo 3.0.',
  // Fora dos buscadores, e fora do `sitemap.xml` (spec `estados-do-link`).
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = 'force-dynamic';

function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopoPublico titulo="Circuito de Palestras Acelera no Campo 3.0" />
      <ColunaPublica>{children}</ColunaPublica>
      <RodapePublico />
    </>
  );
}

/**
 * Tela de estado, com piso de tempo.
 *
 * Todas as saídas sem ingresso passam por aqui, com a mesma moldura e o
 * mesmo título — a diferença fica só no corpo do aviso.
 */
async function estado(variante: VarianteDeEstado, inicio: number) {
  await aguardarPisoDeTempo(inicio);
  return (
    <Moldura>
      <TelaDeEstado variante={variante} />
    </Moldura>
  );
}

export default async function PaginaDoConvite({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const inicio = Date.now();
  const { codigo: bruto } = await params;
  const codigo = normalizarCodigo(decodeURIComponent(bruto));

  // Um link colado com letra minúscula ainda é o link certo. A URL
  // canônica é a maiúscula, porque é ela que casa com o `path` do cookie
  // do titular.
  if (pareceCodigo(codigo) && codigo !== bruto) {
    redirect(`/palestras/c/${codigo}`);
  }

  const ip = await enderecoDeOrigem();
  const chaveDaVarredura = chaveDeLimite('codigo-inexistente', ip);
  const limite = await verificarLimite(chaveDaVarredura, LIMITE_DE_VARREDURA);
  if (!limite.permitido) {
    return estado('muitas-tentativas', inicio);
  }

  const convite = pareceCodigo(codigo) ? await resolverConvite(codigo) : null;

  // Código inexistente e convite cancelado respondem a MESMA tela, com a
  // mesma marcação e o mesmo tempo (D10 do design).
  if (!convite) {
    await registrarTentativa(chaveDaVarredura);
    return estado('indisponivel', inicio);
  }

  if (convite.estado === 'cancelado') {
    return estado('indisponivel', inicio);
  }

  if (convite.estado === 'expirado') {
    return estado('expirado', inicio);
  }

  /* ---------- convite disponível: o formulário ---------- */
  if (convite.estado === 'disponivel') {
    const textos = await textosDeConsentimento();
    return (
      <>
        <TopoPublico titulo="Confirme sua presença">
          <p className="m-0 max-w-prosa font-corpo text-corpo-lg font-light text-texto-inverso-suave">
            Convite pessoal e intransferível, válido para você e um
            acompanhante.
          </p>
        </TopoPublico>

        <ColunaPublica>
          <DadosDaPalestra palestra={convite.palestra} comPrazo />

          <div className="mt-8">
            <Sobrancelha>Seus dados</Sobrancelha>
            <FormularioDeConfirmacao
              codigo={convite.codigo}
              trechosDoAceite={partirTexto(textos.aceite, textos)}
              textoDoOptIn={textos.optIn}
              trechosDoApoio={partirTexto(textos.apoio, textos)}
            />
          </div>
        </ColunaPublica>

        <RodapePublico />
      </>
    );
  }

  /* ---------- confirmado ou presente ---------- */
  const confirmacao = await confirmacaoDoConvite(convite.conviteId);
  if (!confirmacao || !confirmacao.ativa) {
    return estado('indisponivel', inicio);
  }

  const titular = await ehODispositivoDoTitular(
    convite.codigo,
    confirmacao.id,
    confirmacao.ingressoToken,
  );

  // Não é o titular: nenhum dado dele sai daqui. `TelaDeEstado` sequer
  // aceita props com dado pessoal, então não há o que vazar nem no HTML
  // nem na carga de hidratação.
  if (!titular) {
    return estado('ja-utilizado', inicio);
  }

  const ingresso = await montarIngresso(convite);
  if (!ingresso) {
    return estado('indisponivel', inicio);
  }

  const qr = await qrComoDataUri(ingresso.ingressoToken);

  return (
    <>
      <TopoPublico titulo="Presença confirmada" />

      <ColunaPublica>
        <Ingresso
          dados={{
            codigo: ingresso.codigo,
            qr,
            titular: ingresso.nomeDoTitular,
            acompanhante: ingresso.nomeDoAcompanhante,
            cidade: ingresso.palestra.cidade,
            data: formatarData(ingresso.palestra.dataHora),
            dataPorExtenso: formatarDataPorExtenso(ingresso.palestra.dataHora),
            horario: formatarHorario(ingresso.palestra.dataHora),
            localNome: ingresso.palestra.localNome,
            localEndereco: ingresso.palestra.localEndereco,
            utilizado: ingresso.estado === 'presente',
            podeCancelar: ingresso.podeCancelar,
            prazoDeCancelamento: `${formatarData(
              ingresso.palestra.prazoConfirmacao,
            )} às ${formatarHorario(ingresso.palestra.prazoConfirmacao)}`,
          }}
        />
      </ColunaPublica>

      <RodapePublico />
    </>
  );
}
