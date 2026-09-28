'use client';

import { useActionState, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { Aviso, Botao, LinkBotao, Selo } from '@/components/ui';
import {
  cancelar,
} from './acoes';
import { CANCELAMENTO_INICIAL } from './estado';

/* =========================================================
   Ingresso digital

   Componente de cliente inteiro, por dois motivos: o ingresso precisa ser
   desenhado num `canvas` para ser salvo como imagem, e o cancelamento
   troca a tela sem recarregar. Nada aqui é segredo — só o titular chega a
   esta árvore, e é a informação que ele já está lendo.
   ========================================================= */

export type DadosDoIngresso = {
  codigo: string;
  /** QR como `data:` URI: funciona sem rede e entra na imagem salva. */
  qr: string;
  titular: string;
  acompanhante: string | null;
  cidade: string;
  data: string;
  dataPorExtenso: string;
  horario: string;
  localNome: string;
  localEndereco: string;
  /** Já passou pela recepção: some o cancelamento. */
  utilizado: boolean;
  podeCancelar: boolean;
  prazoDeCancelamento: string;
};

/* ---------------------------------------------------------
   Componente
   --------------------------------------------------------- */

function BotaoConfirmarCancelamento() {
  const { pending } = useFormStatus();
  return (
    <Botao
      type="submit"
      variante="perigo"
      tamanho="lg"
      className="w-full"
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? 'Cancelando…' : 'Sim, cancelar minha presença'}
    </Botao>
  );
}

export function Ingresso({ dados }: { dados: DadosDoIngresso }) {
  const referencia = useRef<HTMLDivElement>(null);
  const [imagem, setImagem] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);
  const [falhaNaImagem, setFalhaNaImagem] = useState(false);
  const [pedindoCancelamento, setPedindoCancelamento] = useState(false);
  const [estadoDoCancelamento, acaoDeCancelar] = useActionState(
    cancelar,
    CANCELAMENTO_INICIAL,
  );

  async function salvar() {
    setGerando(true);
    setFalhaNaImagem(false);
    try {
      // As fontes são carregadas por `next/font`, que gera um nome de
      // família próprio. O canvas precisa do nome real, então ele é lido
      // do elemento já estilizado em vez de ser escrito à mão.
      const estilo = referencia.current
        ? getComputedStyle(referencia.current)
        : null;
      const familias = {
        titulo: estilo?.getPropertyValue('--font-display') || 'sans-serif',
        corpo: estilo?.getPropertyValue('--font-body') || 'sans-serif',
      };

      if (document.fonts?.ready) await document.fonts.ready;

      // Carregado só no toque: o desenho do canvas é o pedaço mais pesado
      // desta rota, e quem abre o link para *confirmar* nunca precisa dele.
      const { desenharIngresso } = await import('./desenho');
      const canvas = await desenharIngresso(dados, familias);
      const url = canvas.toDataURL('image/png');
      setImagem(url);

      const ancora = document.createElement('a');
      ancora.href = url;
      ancora.download = `ingresso-acelera-no-campo-${dados.codigo}.png`;
      document.body.appendChild(ancora);
      ancora.click();
      ancora.remove();
    } catch {
      setFalhaNaImagem(true);
    } finally {
      setGerando(false);
    }
  }

  if (estadoDoCancelamento.concluido) {
    return (
      <div className="rounded-cartao border-2 border-terra-700 bg-cartao p-6">
        <h2 className="m-0 font-titulo text-t2 font-bold leading-justo tracking-destaque text-texto-forte">
          Presença cancelada.
        </h2>
        <p className="mt-3 mb-0 font-corpo text-corpo text-texto">
          Sua presença na palestra de {dados.cidade} foi cancelada e o
          ingresso não vale mais. Este convite não volta a ficar disponível.
        </p>
        <p className="mt-3 mb-0 font-corpo text-corpo text-texto">
          Se mudar de ideia, fale com o colaborador da Nossa Lavoura que
          enviou o convite.
        </p>
        <div className="mt-6">
          <LinkBotao
            href="/palestras"
            variante="secundario"
            tamanho="lg"
            className="w-full"
          >
            Ver as palestras do circuito
          </LinkBotao>
        </div>
      </div>
    );
  }

  return (
    <div ref={referencia}>
      {/* ---------- o ingresso ---------- */}
      <div className="overflow-hidden rounded-cartao border-2 border-terra-700 bg-cartao shadow-laje-sm">
        <div className="bg-inverso-fundo px-5 py-4 text-center">
          <p className="m-0 font-corpo text-rotulo font-bold uppercase tracking-sobrancelha text-lima-500">
            {dados.utilizado ? 'Ingresso utilizado' : 'Ingresso confirmado'}
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 p-5">
          {dados.utilizado ? (
            <Selo tom="atencao">Entrada já registrada no evento</Selo>
          ) : null}

          <div className="rounded-cartao border-2 border-terra-700 bg-branco p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={dados.qr}
              alt={`QR Code do ingresso do convite ${dados.codigo}`}
              width={280}
              height={280}
              className="block size-[280px] max-w-full"
            />
          </div>

          <p className="m-0 rounded-pilula bg-acento px-4 py-2 font-corpo text-corpo-sm font-bold uppercase tracking-rotulo text-terra-900">
            Vale para 2 pessoas
          </p>

          <div className="w-full text-center">
            <p className="m-0 font-corpo text-rotulo font-bold uppercase tracking-sobrancelha text-lima-700">
              Titular
            </p>
            <p className="mt-1 mb-0 font-titulo text-t2 font-bold leading-justo tracking-destaque text-texto-forte">
              {dados.titular}
            </p>

            <p className="mt-4 mb-0 font-corpo text-rotulo font-bold uppercase tracking-sobrancelha text-lima-700">
              Acompanhante
            </p>
            <p className="mt-1 mb-0 font-corpo text-corpo-lg text-texto">
              {dados.acompanhante ?? 'Você pode levar um acompanhante.'}
            </p>
          </div>

          <div className="w-full border-t-2 border-linha pt-4 text-center">
            <p className="m-0 font-titulo text-t3 font-bold text-texto-forte">
              {dados.cidade} · {dados.data} às {dados.horario}
            </p>
            <p className="m-0 mt-1 font-corpo text-corpo-sm text-texto-suave">
              {dados.dataPorExtenso}
            </p>
            <p className="mt-3 mb-0 font-corpo text-corpo font-bold text-texto-forte">
              {dados.localNome}
            </p>
            <p className="m-0 font-corpo text-corpo text-texto">
              {dados.localEndereco}
            </p>
          </div>

          <p className="m-0 font-corpo text-corpo-sm text-texto-suave">
            Convite {dados.codigo}
          </p>
        </div>
      </div>

      {/* ---------- ações ---------- */}
      <div className="mt-6 flex flex-col gap-3">
        <Botao
          variante="primario"
          tamanho="lg"
          onClick={salvar}
          disabled={gerando}
          aria-busy={gerando}
        >
          {gerando ? 'Gerando imagem…' : 'Salvar ingresso'}
        </Botao>

        <LinkBotao
          href={`/palestras/c/${dados.codigo}/agenda.ics`}
          variante="contorno"
          tamanho="lg"
        >
          Adicionar à agenda
        </LinkBotao>
      </div>

      {falhaNaImagem ? (
        <Aviso tom="atencao" className="mt-4">
          <p>
            Não foi possível gerar a imagem neste navegador. Você pode tirar
            um print desta tela — ou mostrar o QR aqui mesmo na entrada.
          </p>
        </Aviso>
      ) : null}

      {imagem ? (
        <div className="mt-4 rounded-cartao border-2 border-linha bg-superficie-alt p-4 text-center">
          <p className="m-0 mb-3 font-corpo text-corpo-sm text-texto">
            Se o download não começou, toque e segure na imagem abaixo e
            escolha salvar nas fotos.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imagem}
            alt="Ingresso para salvar"
            className="mx-auto block h-auto w-full max-w-[320px] rounded-cartao border-2 border-terra-700"
          />
        </div>
      ) : null}

      <p className="mt-4 mb-0 font-corpo text-corpo-sm text-texto-suave">
        Leve o ingresso salvo no celular: na entrada pode não haver sinal de
        internet. Se precisar, a recepção também localiza você pelo nome ou
        pelo CPF.
      </p>

      {/* ---------- cancelamento ---------- */}
      {dados.podeCancelar ? (
        <div className="mt-8 border-t-2 border-linha pt-6">
          {!pedindoCancelamento ? (
            <>
              <Botao
                variante="texto"
                onClick={() => setPedindoCancelamento(true)}
              >
                Não vou poder ir
              </Botao>
              <p className="mt-2 mb-0 font-corpo text-corpo-sm text-texto-suave">
                Você pode cancelar até {dados.prazoDeCancelamento}.
              </p>
            </>
          ) : (
            <div className="rounded-cartao border-2 border-perigo bg-perigo-suave p-4">
              <p className="m-0 font-corpo text-corpo font-bold text-texto-forte">
                Cancelar sua presença?
              </p>
              <p className="mt-2 mb-0 font-corpo text-corpo text-texto">
                Esta ação <strong>não pode ser desfeita</strong>. O convite
                não volta a ficar disponível e o ingresso deixa de valer. Seu
                CPF fica livre para confirmar em outra palestra do circuito,
                se ainda houver convite.
              </p>

              {estadoDoCancelamento.mensagem ? (
                <p
                  role="alert"
                  className="mt-3 mb-0 font-corpo text-corpo-sm font-bold text-perigo"
                >
                  {estadoDoCancelamento.mensagem}
                </p>
              ) : null}

              <form action={acaoDeCancelar} className="mt-4 flex flex-col gap-3">
                <input type="hidden" name="codigo" value={dados.codigo} />
                <BotaoConfirmarCancelamento />
                <Botao
                  variante="contorno"
                  tamanho="lg"
                  onClick={() => setPedindoCancelamento(false)}
                >
                  Não, manter minha presença
                </Botao>
              </form>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
