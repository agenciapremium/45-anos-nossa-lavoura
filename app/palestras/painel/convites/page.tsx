import type { Metadata } from 'next';

import { Botao, LinkBotao, Selecao, Selo, Sobrancelha, Titulo, Vazio } from '@/components/ui';
import { env } from '@/lib/env';
import {
  confirmacoesNoEscopo,
  convitesNoEscopo,
  resumoNoEscopo,
  type ConviteNoEscopo,
} from '@/lib/palestras/dados';
import { permitido } from '@/lib/palestras/escopo';
import { montarMensagemDoConvite } from '@/lib/palestras/mensagem';
import { listarPalestrasAtivas } from '@/lib/palestras/consultas';
import { exigirEscopo } from '@/lib/palestras/sessao';
import {
  formatarCarimbo,
  formatarData,
  formatarDataHora,
  formatarHorario,
} from '@/lib/tempo';
import type { EstadoDeConvite } from '@/lib/db/schema';
import { LinhaDeConvite, type ConvitePainel } from './linha';

export const metadata: Metadata = { title: 'Convites' };
export const dynamic = 'force-dynamic';

const TAMANHO_DA_PAGINA = 20;

const ESTADOS: { valor: EstadoDeConvite; rotulo: string }[] = [
  { valor: 'disponivel', rotulo: 'Disponível' },
  { valor: 'confirmado', rotulo: 'Confirmado' },
  { valor: 'presente', rotulo: 'Presente' },
  { valor: 'expirado', rotulo: 'Expirado' },
  { valor: 'cancelado', rotulo: 'Cancelado' },
];

type Filtros = { palestra?: string; estado?: string; pagina?: string };

function paraLinha(
  c: ConviteNoEscopo,
  origem: string,
  escopo: Parameters<typeof permitido>[0],
  usuarioId: string,
  titularesPorConvite: Map<string, string>,
): ConvitePainel {
  const recurso = { colaboradorId: c.colaboradorId };
  const podeEnviar = permitido(escopo, 'enviarConvitePorWhatsapp', recurso);

  // O link e a mensagem só são montados quando o papel tem alcance para
  // ENVIAR (não só para ler a linha). Um gerente lê o convite da própria
  // loja — é o que a lista mostra — mas o endereço do convite não precisa
  // viajar até o navegador dele: sem a mensagem no payload da página, não
  // há o que copiar do código-fonte mesmo contornando os botões.
  const mensagem =
    c.estado === 'disponivel' && podeEnviar
      ? montarMensagemDoConvite({
          origem,
          codigo: c.codigo,
          mensagemTemplate: c.eventoMensagemTemplate,
          cidade: c.eventoCidade,
          data: formatarData(c.eventoDataHora),
          horario: formatarHorario(c.eventoDataHora),
          local: c.eventoLocalNome,
          prazo: formatarCarimbo(c.eventoPrazo),
        })
      : null;

  return {
    id: c.id,
    codigo: c.codigo,
    estado: c.estado,
    eventoCidade: c.eventoCidade,
    eventoDataHora: formatarDataHora(c.eventoDataHora),
    criadoEm: formatarCarimbo(c.criadoEm),
    url: mensagem?.url ?? null,
    linkWhatsapp: mensagem?.linkWhatsapp ?? null,
    enviadoPara: c.enviadoPara,
    checkinEm: c.checkinEm ? formatarCarimbo(c.checkinEm) : null,
    colaboradorNome: c.colaboradorNome,
    lojaNome: c.lojaNome,
    // D7 do design: a confirmação de cancelamento de um confirmado precisa
    // NOMEAR o titular, não só dizer genericamente que alguém perde o
    // ingresso.
    titular: c.estado === 'confirmado' ? (titularesPorConvite.get(c.id) ?? null) : null,
    podeEnviar,
    podeCancelar: permitido(escopo, 'cancelarConvite', recurso),
    podeAnotar: escopo.papel === 'colaborador' && c.colaboradorId === usuarioId,
    eDono: c.colaboradorId === usuarioId,
  };
}

export default async function Convites({
  searchParams,
}: {
  searchParams: Promise<Filtros>;
}) {
  const atual = await exigirEscopo();
  const { escopo } = atual;
  const f = await searchParams;

  const palestras = await listarPalestrasAtivas();
  const eventoId = f.palestra && palestras.some((p) => p.id === f.palestra) ? f.palestra : undefined;
  const estadoFiltro = ESTADOS.some((e) => e.valor === f.estado)
    ? (f.estado as EstadoDeConvite)
    : undefined;
  const pagina = Math.max(1, Number.parseInt(f.pagina ?? '1', 10) || 1);

  const [todos, resumo] = await Promise.all([
    convitesNoEscopo(escopo, { eventoId, estado: estadoFiltro }),
    resumoNoEscopo(escopo, eventoId),
  ]);

  const totalGerados = Object.values(resumo).reduce((a, b) => a + b, 0);
  const totalDePaginas = Math.max(1, Math.ceil(todos.length / TAMANHO_DA_PAGINA));
  const paginaAtual = Math.min(pagina, totalDePaginas);
  const visiveis = todos.slice(
    (paginaAtual - 1) * TAMANHO_DA_PAGINA,
    paginaAtual * TAMANHO_DA_PAGINA,
  );

  const origem = env().APP_BASE_URL;

  // Só busca titulares quando a página atual tem confirmados — a maioria
  // das visitas ao colaborador é sobre `disponivel`, que nem chama isto.
  const temConfirmadoNaPagina = visiveis.some((c) => c.estado === 'confirmado');
  const titularesPorConvite = new Map<string, string>();
  if (temConfirmadoNaPagina) {
    const confirmados = await confirmacoesNoEscopo(escopo, { eventoId });
    for (const conf of confirmados) titularesPorConvite.set(conf.conviteId, conf.titular);
  }

  const linhas = visiveis.map((c) =>
    paraLinha(c, origem, escopo, atual.usuarioId, titularesPorConvite),
  );

  const podeBaixarPdf = escopo.papel === 'colaborador';

  function comFiltro(mudancas: Partial<Filtros>): string {
    const params = new URLSearchParams();
    const proximo = { palestra: f.palestra, estado: f.estado, ...mudancas };
    if (proximo.palestra) params.set('palestra', proximo.palestra);
    if (proximo.estado) params.set('estado', proximo.estado);
    if (mudancas.pagina) params.set('pagina', mudancas.pagina);
    const query = params.toString();
    return query ? `?${query}` : '';
  }

  return (
    <>
      <Sobrancelha>Distribuição</Sobrancelha>
      <Titulo>Convites</Titulo>
      <p className="mt-2 mb-6 max-w-prosa font-corpo text-corpo-lg text-texto">
        {escopo.papel === 'colaborador'
          ? 'Os convites gerados para você. Copie o link ou envie pelo WhatsApp — o convidado escolhe o contato.'
          : 'Convites do seu escopo. Ações de envio e cancelamento ficam só com o colaborador dono e, para cancelar, também com o Admin.'}
      </p>

      {podeBaixarPdf ? (
        <div className="mb-6">
          <LinkBotao href="/palestras/painel/convites/pdf" variante="secundario">
            Baixar meu PDF de distribuição
          </LinkBotao>
        </div>
      ) : null}

      {/* Filtros fixos no topo (D6): ficam visíveis mesmo rolando a lista. */}
      <div className="sticky top-0 z-10 -mx-[var(--gutter-page)] mb-6 border-b-2 border-linha bg-fundo px-[var(--gutter-page)] py-4">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="min-w-0 flex-1 sm:max-w-xs">
            <span className="mb-1 block font-corpo text-corpo-sm font-bold text-texto-forte">
              Palestra
            </span>
            <Selecao name="palestra" defaultValue={f.palestra ?? ''}>
              <option value="">Todas</option>
              {palestras.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.cidade} — {formatarData(p.dataHora)}
                </option>
              ))}
            </Selecao>
          </label>
          <label className="min-w-0 flex-1 sm:max-w-xs">
            <span className="mb-1 block font-corpo text-corpo-sm font-bold text-texto-forte">
              Estado
            </span>
            <Selecao name="estado" defaultValue={f.estado ?? ''}>
              <option value="">Todos</option>
              {ESTADOS.map((e) => (
                <option key={e.valor} value={e.valor}>
                  {e.rotulo}
                </option>
              ))}
            </Selecao>
          </label>
          <Botao type="submit" tamanho="sm">
            Filtrar
          </Botao>
        </form>

        {/* Contagem por estado, sempre visível (D6) — reflete o filtro de palestra. */}
        <ul className="mt-3 flex list-none flex-wrap gap-2 p-0">
          <li>
            <Selo tom="neutro">{totalGerados} gerados</Selo>
          </li>
          {ESTADOS.map((e) => (
            <li key={e.valor}>
              <Selo
                tom={
                  e.valor === 'confirmado'
                    ? 'positivo'
                    : e.valor === 'cancelado'
                      ? 'negativo'
                      : e.valor === 'expirado'
                        ? 'atencao'
                        : e.valor === 'presente'
                          ? 'acento'
                          : 'neutro'
                }
              >
                {resumo[e.valor]} {e.rotulo.toLowerCase()}
              </Selo>
            </li>
          ))}
        </ul>
      </div>

      {linhas.length === 0 ? (
        <Vazio titulo="Nenhum convite neste filtro.">
          <p className="m-0">
            {f.palestra || f.estado
              ? 'Tente limpar os filtros acima.'
              : 'Assim que houver convites no seu escopo, eles aparecem aqui.'}
          </p>
        </Vazio>
      ) : (
        <ul className="m-0 flex flex-col gap-3 p-0">
          {linhas.map((c) => (
            <LinhaDeConvite key={c.id} convite={c} />
          ))}
        </ul>
      )}

      {totalDePaginas > 1 ? (
        <div className="mt-6 flex items-center justify-between gap-3">
          <LinkBotao
            href={comFiltro({ pagina: String(paginaAtual - 1) })}
            variante="contorno"
            tamanho="sm"
            aria-disabled={paginaAtual <= 1}
            className={paginaAtual <= 1 ? 'pointer-events-none opacity-40' : ''}
          >
            Anterior
          </LinkBotao>
          <span className="font-corpo text-corpo-sm text-texto-suave">
            Página {paginaAtual} de {totalDePaginas}
          </span>
          <LinkBotao
            href={comFiltro({ pagina: String(paginaAtual + 1) })}
            variante="contorno"
            tamanho="sm"
            aria-disabled={paginaAtual >= totalDePaginas}
            className={paginaAtual >= totalDePaginas ? 'pointer-events-none opacity-40' : ''}
          >
            Próxima
          </LinkBotao>
        </div>
      ) : null}
    </>
  );
}
