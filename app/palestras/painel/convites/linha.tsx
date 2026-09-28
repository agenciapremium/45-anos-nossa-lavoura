'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { Aviso, Botao, LinkBotao, Selo } from '@/components/ui';
import type { EstadoDeConvite } from '@/lib/db/schema';
import {
  ANOTACAO_INICIAL,
  CANCELAMENTO_PAINEL_INICIAL,
  cancelarConvitePeloPainel,
  definirAnotacaoDeEnvio,
} from './acoes';

/* =========================================================
   Uma linha da lista de convites

   D6 do design: no celular esta é a tela mais usada do sistema. As ações
   principais (copiar, WhatsApp) são botões grandes na própria linha, e
   nenhuma ação destrutiva fica a um toque — cancelar sempre passa por uma
   confirmação explícita, com o mesmo padrão de duas etapas já usado no
   ingresso do convidado.
   ========================================================= */

export type ConvitePainel = {
  id: string;
  codigo: string;
  estado: EstadoDeConvite;
  eventoCidade: string;
  eventoDataHora: string;
  criadoEm: string;
  /** Só preenchido quando `estado === 'disponivel'`. */
  url: string | null;
  linkWhatsapp: string | null;
  enviadoPara: string | null;
  /** Só preenchido quando o estado efetivo é `presente`. */
  checkinEm: string | null;
  /** Nome do colaborador de origem — só relevante para gerente/Admin. */
  colaboradorNome: string;
  lojaNome: string | null;
  /** Nome do titular — só preenchido quando `estado === 'confirmado'` (D7). */
  titular: string | null;
  /** Copiar e WhatsApp: alcance de `enviarConvitePorWhatsapp` sobre este convite. */
  podeEnviar: boolean;
  /** Alcance de `cancelarConvite` sobre este convite. */
  podeCancelar: boolean;
  /** Só o dono do convite anota — gerentes só leem (D4). */
  podeAnotar: boolean;
  /** O leitor é o próprio colaborador dono da linha (esconde o nome dele). */
  eDono: boolean;
};

const TOM_DO_ESTADO: Record<
  EstadoDeConvite,
  'neutro' | 'positivo' | 'negativo' | 'atencao' | 'acento'
> = {
  disponivel: 'neutro',
  confirmado: 'positivo',
  presente: 'acento',
  expirado: 'atencao',
  cancelado: 'negativo',
};

const ROTULO_DO_ESTADO: Record<EstadoDeConvite, string> = {
  disponivel: 'Disponível',
  confirmado: 'Confirmado',
  presente: 'Presente',
  expirado: 'Expirado',
  cancelado: 'Cancelado',
};

function BotaoCopiar({ url }: { url: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Navegador sem permissão de área de transferência: a URL continua
      // visível na tela para copiar à mão.
      setCopiado(false);
    }
  }

  return (
    <Botao
      variante={copiado ? 'claro' : 'contorno'}
      tamanho="sm"
      onClick={copiar}
      aria-live="polite"
    >
      {copiado ? 'Link copiado ✓' : 'Copiar link'}
    </Botao>
  );
}

function BotaoConfirmarCancelamento() {
  const { pending } = useFormStatus();
  return (
    <Botao
      type="submit"
      variante="perigo"
      tamanho="sm"
      className="w-full"
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? 'Cancelando…' : 'Sim, cancelar este convite'}
    </Botao>
  );
}

function PainelDeCancelamento({
  codigo,
  estado,
  titular,
  onFechar,
}: {
  codigo: string;
  estado: EstadoDeConvite;
  titular: string | null;
  onFechar: () => void;
}) {
  const [estadoDaAcao, acao] = useActionState(
    cancelarConvitePeloPainel,
    CANCELAMENTO_PAINEL_INICIAL,
  );

  if (estadoDaAcao.concluido) {
    return (
      <Aviso tom="sucesso" className="mt-3">
        <p>Convite cancelado.</p>
      </Aviso>
    );
  }

  return (
    <div className="mt-3 rounded-cartao border-2 border-perigo bg-perigo-suave p-4">
      <p className="m-0 font-corpo text-corpo font-bold text-texto-forte">
        Cancelar este convite?
      </p>
      <p className="mt-2 mb-0 font-corpo text-corpo-sm text-texto">
        Esta ação <strong>não pode ser desfeita</strong>. O convite não volta
        a ficar disponível — para repor, é preciso gerar um novo lote.
        {estado === 'confirmado' ? (
          <>
            {' '}
            Este convite já está <strong>confirmado</strong>
            {titular ? (
              <>
                {' '}
                por <strong>{titular}</strong>
              </>
            ) : null}
            , que já se programou para ir e vai <strong>perder o ingresso</strong>.
            O sistema não avisa o convidado — se cancelar, é responsabilidade
            sua avisar {titular ? titular.split(/\s+/)[0] : 'a pessoa'} pelo
            WhatsApp.
          </>
        ) : null}
      </p>

      {estadoDaAcao.mensagem ? (
        <p role="alert" className="mt-3 mb-0 font-corpo text-corpo-sm font-bold text-perigo">
          {estadoDaAcao.mensagem}
        </p>
      ) : null}

      <form action={acao} className="mt-3 flex flex-col gap-2">
        <input type="hidden" name="codigo" value={codigo} />
        <label className="block">
          <span className="mb-1 block font-corpo text-corpo-sm font-bold text-texto-forte">
            Motivo (opcional)
          </span>
          <input
            type="text"
            name="motivo"
            maxLength={300}
            className="w-full rounded-controle border-2 border-linha bg-campo px-3 py-2 font-corpo text-corpo-sm"
            placeholder="Ex.: enviado para a pessoa errada"
          />
        </label>
        <BotaoConfirmarCancelamento />
        <Botao variante="contorno" tamanho="sm" onClick={onFechar} type="button">
          Não, manter este convite
        </Botao>
      </form>
    </div>
  );
}

function AnotacaoDeEnvio({
  conviteId,
  enviadoPara,
}: {
  conviteId: string;
  enviadoPara: string | null;
}) {
  const [editando, setEditando] = useState(false);
  const [, acao] = useActionState(definirAnotacaoDeEnvio, ANOTACAO_INICIAL);

  if (!editando) {
    return (
      <button
        type="button"
        onClick={() => setEditando(true)}
        className="cursor-pointer border-none bg-transparent p-0 text-left font-corpo text-corpo-sm text-terra-700 underline underline-offset-4"
      >
        {enviadoPara ? `Enviado para: ${enviadoPara}` : 'Marcar para quem enviou (opcional)'}
      </button>
    );
  }

  return (
    <form
      action={(dados) => {
        acao(dados);
        setEditando(false);
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="conviteId" value={conviteId} />
      <input
        type="text"
        name="enviadoPara"
        defaultValue={enviadoPara ?? ''}
        maxLength={200}
        placeholder="Nome ou telefone (lembrete pessoal)"
        className="min-w-0 flex-1 rounded-controle border-2 border-linha bg-campo px-3 py-1.5 font-corpo text-corpo-sm"
        autoFocus
      />
      <Botao type="submit" tamanho="sm" variante="secundario">
        Salvar
      </Botao>
      <Botao type="button" tamanho="sm" variante="texto" onClick={() => setEditando(false)}>
        Cancelar
      </Botao>
    </form>
  );
}

export function LinhaDeConvite({ convite: c }: { convite: ConvitePainel }) {
  const [cancelando, setCancelando] = useState(false);

  return (
    <li className="list-none rounded-cartao border-2 border-terra-700 bg-cartao p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="m-0 font-corpo text-rotulo font-bold uppercase tracking-sobrancelha text-lima-700">
            {c.eventoCidade} · {c.eventoDataHora}
          </p>
          <p className="m-0 mt-0.5 font-mono text-corpo-sm text-texto-suave">
            {c.codigo}
          </p>
          {!c.eDono ? (
            <p className="m-0 mt-0.5 font-corpo text-corpo-sm text-texto-suave">
              {c.colaboradorNome}
              {c.lojaNome ? ` · ${c.lojaNome}` : ''}
            </p>
          ) : null}
        </div>
        <Selo tom={TOM_DO_ESTADO[c.estado]}>{ROTULO_DO_ESTADO[c.estado]}</Selo>
      </div>

      {c.estado === 'presente' && c.checkinEm ? (
        <p className="mt-2 mb-0 font-corpo text-corpo-sm text-texto">
          Compareceu em {c.checkinEm}.
        </p>
      ) : null}

      {c.estado === 'confirmado' ? (
        <div className="mt-3">
          <LinkBotao
            href={`/palestras/painel/convites/${c.codigo}`}
            variante="contorno"
            tamanho="sm"
          >
            Ver dados do confirmado
          </LinkBotao>
        </div>
      ) : null}

      {c.estado === 'disponivel' ? (
        <>
          {/* O link só existe no payload da página quando `podeEnviar` é
              verdadeiro (ver `paraLinha` em page.tsx) — um gerente nunca
              recebe o endereço do convite, mesmo sem clicar em nada. */}
          {c.podeEnviar && c.url ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <BotaoCopiar url={c.url} />
              <LinkBotao
                href={c.linkWhatsapp ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                variante="primario"
                tamanho="sm"
              >
                Enviar via WhatsApp
              </LinkBotao>
            </div>
          ) : null}

          {c.podeAnotar ? (
            <div className="mt-3">
              <AnotacaoDeEnvio conviteId={c.id} enviadoPara={c.enviadoPara} />
            </div>
          ) : c.enviadoPara ? (
            <p className="mt-3 mb-0 font-corpo text-corpo-sm text-texto-suave">
              Anotação do colaborador: {c.enviadoPara}
            </p>
          ) : null}
        </>
      ) : null}

      {(c.estado === 'disponivel' || c.estado === 'confirmado') && c.podeCancelar ? (
        cancelando ? (
          <PainelDeCancelamento
            codigo={c.codigo}
            estado={c.estado}
            titular={c.titular}
            onFechar={() => setCancelando(false)}
          />
        ) : (
          <div className="mt-3">
            <Botao variante="texto" tamanho="sm" onClick={() => setCancelando(true)}>
              Cancelar convite
            </Botao>
          </div>
        )
      ) : null}
    </li>
  );
}
