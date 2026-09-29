'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { Aviso, Botao, Celula, LinkBotao, Selo } from '@/components/ui';
import { IconeMaisOpcoes } from '@/components/ui/icones';
import type { EstadoDeConvite } from '@/lib/db/schema';
import { cn } from '@/lib/utils';
import { cancelarConvitePeloPainel, definirAnotacaoDeEnvio } from './acoes';
import { ANOTACAO_INICIAL, CANCELAMENTO_PAINEL_INICIAL } from './estado';

/* =========================================================
   Uma linha da lista de convites: tabela no desktop, cartão no celular
   (D6 do design, tarefa 3.2), com as ações de linha da tarefa 3.3.

   A página monta os dados uma vez (`paraLinha` em `page.tsx`) e os dois
   componentes deste arquivo (`LinhaDeConviteTabela` e `CartaoDeConvite`)
   renderizam o mesmo `ConvitePainel` em blocos diferentes: custa HTML
   duplicado, e é o preço de não introduzir JavaScript de layout numa tela
   que precisa funcionar com internet ruim (D6). As sub-partes que têm
   estado (copiar, cancelar em duas etapas, anotar envio) são compartilhadas
   pelos dois blocos.
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
  /** Nome do colaborador de origem (só relevante para gerente/Admin). */
  colaboradorNome: string;
  lojaNome: string | null;
  /** Nome do titular, quando confirmado ou presente; usado na coluna
   *  "convidado ou anotação" e para nomear quem perde o ingresso no
   *  cancelamento em duas etapas (D7). */
  titular: string | null;
  /** Copiar e WhatsApp: alcance de `enviarConvitePorWhatsapp` sobre este convite. */
  podeEnviar: boolean;
  /** Alcance de `cancelarConvite` sobre este convite. */
  podeCancelar: boolean;
  /** Só o dono do convite anota, gerentes só leem (D4). */
  podeAnotar: boolean;
  /** O leitor é o próprio colaborador dono da linha (esconde o nome dele). */
  eDono: boolean;
  /** Só o Admin tem a tela de auditoria (mesmo critério de `menu-lateral.tsx`). */
  podeVerAuditoria: boolean;
};

export const TOM_DO_ESTADO: Record<
  EstadoDeConvite,
  'neutro' | 'positivo' | 'negativo' | 'atencao' | 'acento'
> = {
  disponivel: 'neutro',
  confirmado: 'positivo',
  presente: 'acento',
  expirado: 'atencao',
  cancelado: 'negativo',
};

export const ROTULO_DO_ESTADO: Record<EstadoDeConvite, string> = {
  disponivel: 'Disponível',
  confirmado: 'Confirmado',
  presente: 'Presente',
  expirado: 'Expirado',
  cancelado: 'Cancelado',
};

/* ---------------------------------------------------------
   Ações compartilhadas
   --------------------------------------------------------- */

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
      {copiado ? 'Copiado' : 'Copiar'}
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

/** Painel de cancelamento em duas etapas (3.3): nomeia o titular quando há um. */
export function PainelDeCancelamento({
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
      <Aviso tom="sucesso" className="mt-3 text-left">
        <p>Convite cancelado.</p>
      </Aviso>
    );
  }

  return (
    <div className="mt-3 rounded-cartao border-2 border-perigo bg-perigo-suave p-4 text-left">
      <p className="m-0 font-corpo text-corpo font-bold text-texto-forte">
        Cancelar este convite?
      </p>
      <p className="mt-2 mb-0 font-corpo text-corpo-sm text-texto">
        Esta ação <strong>não pode ser desfeita</strong>. O convite não volta
        a ficar disponível, para repor é preciso gerar um novo lote.
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
            O sistema não avisa o convidado: se cancelar, avisar
            {titular ? ` ${titular.split(/\s+/)[0]}` : ' a pessoa'} pelo
            WhatsApp é responsabilidade sua.
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
            className="w-full rounded-controle border border-linha bg-campo px-3 py-2 font-corpo text-corpo-sm"
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

/** Anotação pessoal de envio (D4): lembrete de texto livre, sem efeito de sistema. */
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
        {enviadoPara ? `Enviado para: ${enviadoPara}` : 'Marcar para quem enviei'}
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
        placeholder="Nome ou telefone"
        className="min-w-0 flex-1 rounded-controle border border-linha bg-campo px-3 py-1.5 font-corpo text-corpo-sm"
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

/** Conteúdo da coluna "convidado ou anotação" (tabela) / do bloco de status (cartão). */
function ConteudoDoConvidado({ c }: { c: ConvitePainel }) {
  if (c.estado === 'confirmado' || c.estado === 'presente') {
    return (
      <>
        <span className="block font-corpo text-corpo-sm font-bold text-texto-forte">
          {c.titular ?? 'Convidado confirmado'}
        </span>
        <span className="block font-corpo text-corpo-sm text-texto-suave">
          {c.estado === 'presente' && c.checkinEm
            ? `entrou em ${c.checkinEm}`
            : 'confirmado, aguardando o dia'}
        </span>
      </>
    );
  }
  if (c.estado === 'cancelado') {
    return <span className="font-corpo text-corpo-sm text-texto-suave">Convite cancelado</span>;
  }
  if (c.estado === 'expirado') {
    return (
      <span className="font-corpo text-corpo-sm text-texto-suave">
        Prazo venceu sem confirmação
      </span>
    );
  }
  // disponivel
  if (c.podeAnotar) {
    return <AnotacaoDeEnvio conviteId={c.id} enviadoPara={c.enviadoPara} />;
  }
  return (
    <span className="font-corpo text-corpo-sm text-texto-suave">
      {c.enviadoPara ? `Enviado para: ${c.enviadoPara}` : 'Sem anotação de envio'}
    </span>
  );
}

/** Botões de envio (copiar e WhatsApp): só existem quando `podeEnviar` e há `url` no payload. */
function AcoesDeEnvio({ c }: { c: ConvitePainel }) {
  if (!c.podeEnviar || !c.url) return null;
  return (
    <>
      <BotaoCopiar url={c.url} />
      {/*
        Sem `linkWhatsapp`, sem botão: é o caso do convite avulso
        (`convites-avulsos`), que não tem colaborador remetente e é
        distribuído pelo canal que o Admin escolher. Antes o `?? '#'`
        desenhava um botão "WhatsApp" que não levava a lugar nenhum.
      */}
      {c.linkWhatsapp ? (
        <LinkBotao
          href={c.linkWhatsapp}
          target="_blank"
          rel="noopener noreferrer"
          variante="primario"
          tamanho="sm"
        >
          WhatsApp
        </LinkBotao>
      ) : null}
    </>
  );
}

/**
 * Menu de mais ações da linha (3.7): hoje só "ver no rastro de auditoria",
 * que aponta para o filtro por registro que a tarefa 5.8 deixou pronto em
 * `admin/auditoria`. Só existe para quem tem a própria tela de auditoria
 * (Admin, mesmo critério de `menu-lateral.tsx`) — não é um mecanismo de
 * proteção, a proteção é o `exigirPapel(['admin'])` da rota de destino
 * (D3 do design): esconder o item aqui é só cortesia de navegação.
 */
function MenuDeMaisAcoes({ codigo, conviteId }: { codigo: string; conviteId: string }) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        aria-label={`Mais ações do convite ${codigo}`}
        aria-haspopup="menu"
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
        className={cn(
          'inline-flex size-11 flex-none items-center justify-center rounded-controle border transition-colors',
          aberto
            ? 'border-texto-forte bg-texto-forte text-creme-500'
            : 'border-linha bg-cartao text-texto-suave hover:border-linha-forte hover:text-texto-forte',
        )}
      >
        <IconeMaisOpcoes className="size-4" />
      </button>

      {aberto ? (
        <>
          {/* Camada invisível que fecha o menu ao clicar fora. */}
          <button
            type="button"
            aria-label="Fechar menu"
            tabIndex={-1}
            onClick={() => setAberto(false)}
            className="fixed inset-0 z-10 cursor-default border-none bg-transparent p-0"
          />
          <div
            role="menu"
            aria-label={`Mais ações do convite ${codigo}`}
            className="absolute right-0 top-full z-20 mt-2 w-64 rounded-cartao border border-linha bg-cartao p-2 text-left shadow-elevado"
          >
            <Link
              href={`/palestras/admin/auditoria?entidade=palestra_convite&entidadeId=${conviteId}`}
              role="menuitem"
              onClick={() => setAberto(false)}
              className="block min-h-11 rounded-controle px-3 py-2.5 font-corpo text-corpo-sm text-texto hover:bg-superficie-alt hover:text-texto-forte"
            >
              Ver no rastro de auditoria
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------
   Bloco de tabela (desktop, `hidden lg:block` na página)
   --------------------------------------------------------- */

export function LinhaDeConviteTabela({ convite: c }: { convite: ConvitePainel }) {
  const [cancelando, setCancelando] = useState(false);
  const podeVerAcaoDeCancelar =
    c.podeCancelar && (c.estado === 'disponivel' || c.estado === 'confirmado');

  return (
    <tr>
      <Celula className="font-mono font-bold text-texto-forte">{c.codigo}</Celula>
      <Celula>
        {c.eventoCidade}
        <span className="block font-corpo text-corpo-sm text-texto-suave">
          {c.eventoDataHora}
        </span>
      </Celula>
      <Celula>
        {c.eDono ? 'Você' : c.colaboradorNome}
        {c.lojaNome ? (
          <span className="block font-corpo text-corpo-sm text-texto-suave">{c.lojaNome}</span>
        ) : null}
      </Celula>
      <Celula>
        <ConteudoDoConvidado c={c} />
      </Celula>
      <Celula>
        <Selo tom={TOM_DO_ESTADO[c.estado]}>{ROTULO_DO_ESTADO[c.estado]}</Selo>
      </Celula>
      <Celula className="text-right">
        <div className="flex flex-wrap items-center justify-end gap-2">
          {c.estado === 'disponivel' ? <AcoesDeEnvio c={c} /> : null}
          {(c.estado === 'confirmado' || c.estado === 'presente') ? (
            <LinkBotao href={`/palestras/painel/convites/${c.codigo}`} variante="contorno" tamanho="sm">
              Ver dados
            </LinkBotao>
          ) : null}
          {podeVerAcaoDeCancelar && !cancelando ? (
            <Botao variante="texto" tamanho="sm" onClick={() => setCancelando(true)}>
              Cancelar
            </Botao>
          ) : null}
          {!podeVerAcaoDeCancelar &&
          !c.podeVerAuditoria &&
          c.estado !== 'disponivel' &&
          c.estado !== 'confirmado' &&
          c.estado !== 'presente' ? (
            <span className="font-corpo text-corpo-sm text-texto-suave">Sem ação possível</span>
          ) : null}
          {c.podeVerAuditoria ? <MenuDeMaisAcoes codigo={c.codigo} conviteId={c.id} /> : null}
        </div>
        {cancelando ? (
          <PainelDeCancelamento
            codigo={c.codigo}
            estado={c.estado}
            titular={c.titular}
            onFechar={() => setCancelando(false)}
          />
        ) : null}
      </Celula>
    </tr>
  );
}

/* ---------------------------------------------------------
   Bloco de cartão (celular, `lg:hidden` na página)
   --------------------------------------------------------- */

export function CartaoDeConvite({ convite: c }: { convite: ConvitePainel }) {
  const [cancelando, setCancelando] = useState(false);
  const podeVerAcaoDeCancelar =
    c.podeCancelar && (c.estado === 'disponivel' || c.estado === 'confirmado');

  return (
    <li className="list-none rounded-cartao border border-linha bg-cartao p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="m-0 font-corpo text-rotulo font-bold uppercase tracking-sobrancelha text-texto-suave">
            {c.eventoCidade} · {c.eventoDataHora}
          </p>
          <p className="m-0 mt-0.5 font-mono text-corpo-sm text-texto-suave">{c.codigo}</p>
          {!c.eDono ? (
            <p className="m-0 mt-0.5 font-corpo text-corpo-sm text-texto-suave">
              {c.colaboradorNome}
              {c.lojaNome ? ` · ${c.lojaNome}` : ''}
            </p>
          ) : null}
        </div>
        <div className="flex flex-none items-center gap-2">
          <Selo tom={TOM_DO_ESTADO[c.estado]}>{ROTULO_DO_ESTADO[c.estado]}</Selo>
          {c.podeVerAuditoria ? <MenuDeMaisAcoes codigo={c.codigo} conviteId={c.id} /> : null}
        </div>
      </div>

      <div className="mt-2">
        <ConteudoDoConvidado c={c} />
      </div>

      {c.estado === 'confirmado' || c.estado === 'presente' ? (
        <div className="mt-3">
          <LinkBotao
            href={`/palestras/painel/convites/${c.codigo}`}
            variante="contorno"
            tamanho="sm"
            className="w-full"
          >
            Ver dados do confirmado
          </LinkBotao>
        </div>
      ) : null}

      {c.estado === 'disponivel' && c.podeEnviar && c.url ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <AcoesDeEnvio c={c} />
        </div>
      ) : null}

      {podeVerAcaoDeCancelar && !cancelando ? (
        <div className="mt-3">
          <Botao variante="texto" tamanho="sm" onClick={() => setCancelando(true)}>
            Cancelar convite
          </Botao>
        </div>
      ) : null}

      {cancelando ? (
        <PainelDeCancelamento
          codigo={c.codigo}
          estado={c.estado}
          titular={c.titular}
          onFechar={() => setCancelando(false)}
        />
      ) : null}
    </li>
  );
}
