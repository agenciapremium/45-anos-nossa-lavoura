import type { Metadata } from 'next';
import Link from 'next/link';

import { CabecalhoDeTela } from '@/components/palestras/cabecalho-de-tela';
import {
  Botao,
  Cabecalho,
  Campo,
  CelulaDeTitulo,
  Cartao,
  LinkBotao,
  Selecao,
  Tabela,
  Vazio,
} from '@/components/ui';
import { IconeBusca } from '@/components/ui/icones';
import { env } from '@/lib/env';
import type { EstadoDeConvite } from '@/lib/db/schema';
import { somenteDigitos } from '@/lib/palestras/cpf';
import { contextoDePalestra } from '@/lib/palestras/contexto-de-palestra';
import {
  confirmacoesNoEscopo,
  convitesNoEscopo,
  usuariosNoEscopo,
  lojasNoEscopo,
  type ConviteNoEscopo,
} from '@/lib/palestras/dados';
import { listarRegionais } from '@/lib/palestras/consultas';
import { permitido } from '@/lib/palestras/escopo';
import { montarMensagemDoConvite } from '@/lib/palestras/mensagem';
import { origemDoConvite } from '@/lib/palestras/origem';
import { exigirEscopo } from '@/lib/palestras/sessao';
import {
  formatarCarimbo,
  formatarData,
  formatarDataHora,
  formatarHorario,
} from '@/lib/tempo';
import { cn } from '@/lib/utils';
import { CartaoDeConvite, LinhaDeConviteTabela, type ConvitePainel } from './linha';

export const metadata: Metadata = { title: 'Convites' };
export const dynamic = 'force-dynamic';

const TAMANHOS_DE_PAGINA = [20, 50, 100] as const;
const TAMANHO_PADRAO = 20;

const ESTADOS: { valor: EstadoDeConvite; rotulo: string }[] = [
  { valor: 'disponivel', rotulo: 'Disponível' },
  { valor: 'confirmado', rotulo: 'Confirmado' },
  { valor: 'presente', rotulo: 'Presente' },
  { valor: 'expirado', rotulo: 'Expirado' },
  { valor: 'cancelado', rotulo: 'Cancelado' },
];

type Filtros = {
  palestra?: string;
  estado?: string;
  regional?: string;
  loja?: string;
  colaborador?: string;
  pagina?: string;
  tamanho?: string;
  /** Busca por código, titular ou CPF (3.6). */
  busca?: string;
  /** Ordenação da lista (3.6): "recentes" (padrão) ou "codigo". */
  ordenar?: string;
  /**
   * Origem do convite (tarefa 6.1 de `convites-avulsos`): `avulsos` para os
   * gerados direto pela administração, `colaborador` para os da rede de
   * lojas, ausente para os dois juntos. Só o Admin alcança convite avulso,
   * então para os outros papéis este filtro não muda nada.
   */
  origem?: string;
};

/* =========================================================
   /palestras/painel/convites (tarefa 3.2)

   A palestra vem do contexto da barra de topo (`contextoDePalestra`), não
   de um formulário nesta tela: a página lê a mesma resolução que o
   `layout.tsx` usa (URL, senão memória, senão o dia, senão a primeira
   ativa), então trocar a palestra no seletor do topo já filtra esta lista
   sem passo extra aqui.

   D6 do design: a página monta as linhas UMA vez (`paraLinha`) e renderiza
   dois blocos a partir da mesma fonte: tabela em `hidden lg:block`,
   cartões em `lg:hidden`. O link e a mensagem de WhatsApp só entram no
   payload quando o papel tem alcance de ENVIAR sobre aquele convite
   (`paraLinha`), nas duas apresentações.
   ========================================================= */

function paraLinha(
  c: ConviteNoEscopo,
  origem: string,
  escopo: Parameters<typeof permitido>[0],
  usuarioId: string,
  titularesPorConvite: Map<string, string>,
): ConvitePainel {
  const recurso = { colaboradorId: c.colaboradorId };
  const podeEnviar = permitido(escopo, 'enviarConvitePorWhatsapp', recurso);
  const origemDaLinha = origemDoConvite(c);

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
    // Convite avulso fica com o endereço para copiar, mas sem o botão de
    // WhatsApp: a mesma regra da tela do lote (requisito "Sem envio por
    // WhatsApp"), aplicada onde o Admin também encontra esses convites.
    linkWhatsapp: origemDaLinha.avulso ? null : (mensagem?.linkWhatsapp ?? null),
    enviadoPara: c.enviadoPara,
    checkinEm: c.checkinEm ? formatarCarimbo(c.checkinEm) : null,
    // Origem do convite num lugar só (`lib/palestras/origem.ts`): o
    // colaborador com a loja embaixo, ou "Administração" com o rótulo do
    // lote embaixo (D7 de `convites-avulsos`). Nunca campo vazio.
    colaboradorNome: origemDaLinha.titulo,
    lojaNome: origemDaLinha.detalhe,
    titular:
      c.estado === 'confirmado' || c.estado === 'presente'
        ? (titularesPorConvite.get(c.id) ?? null)
        : null,
    podeEnviar,
    podeCancelar: permitido(escopo, 'cancelarConvite', recurso),
    podeAnotar: escopo.papel === 'colaborador' && c.colaboradorId === usuarioId,
    eDono: c.colaboradorId === usuarioId,
    // Mesmo critério de `menu-lateral.tsx`: a tela de auditoria é
    // `exigirPapel(['admin'])` direto, sem ação protegida na matriz (3.7).
    podeVerAuditoria: escopo.papel === 'admin',
  };
}

function classesDoChip(ativo: boolean): string {
  return cn(
    'inline-flex min-h-11 items-center gap-2 rounded-pilula border px-3 font-corpo text-corpo-sm font-bold transition-colors',
    ativo
      ? 'border-lima-700 bg-lima-100 text-terra-700'
      : 'border-linha bg-cartao text-texto-suave hover:border-linha-forte hover:text-texto-forte',
  );
}

function classesDaContagem(ativo: boolean): string {
  return cn(
    'inline-flex min-w-5 items-center justify-center rounded-pilula px-1.5 text-corpo-sm font-bold',
    ativo ? 'bg-lima-700 text-texto-forte' : 'bg-superficie-alt text-texto-suave',
  );
}

export default async function Convites({
  searchParams,
}: {
  searchParams: Promise<Filtros>;
}) {
  const atual = await exigirEscopo();
  const { escopo } = atual;
  const f = await searchParams;

  const { atual: palestraAtual } = await contextoDePalestra(f.palestra);

  const podeExportarCsv = permitido(escopo, 'exportarCsv');
  const podeBaixarPdf = escopo.papel === 'colaborador';

  const acaoPrincipal = podeExportarCsv && palestraAtual ? (
    <LinkBotao
      href={`/palestras/relatorios/csv?palestra=${palestraAtual.id}`}
      variante="contorno"
      tamanho="sm"
    >
      Exportar CSV
    </LinkBotao>
  ) : podeBaixarPdf ? (
    <LinkBotao href="/palestras/painel/convites/pdf" variante="secundario" tamanho="sm">
      Baixar meu PDF
    </LinkBotao>
  ) : undefined;

  if (!palestraAtual) {
    return (
      <>
        <CabecalhoDeTela sobrancelha="Painel" titulo="Convites" acao={acaoPrincipal} />
        <Vazio titulo="Nenhuma palestra ativa">
          <p className="m-0">
            Assim que a administração cadastrar uma palestra, os convites aparecem aqui.
          </p>
        </Vazio>
      </>
    );
  }

  // Os filtros avançados (regional, loja, colaborador) só valem a pena para
  // quem tem mais de um recurso no escopo: um colaborador só tem os
  // próprios convites, e a recepção nem alcança esta tela.
  const podeFiltrarRegional = escopo.papel === 'admin';
  const podeFiltrarLoja = escopo.papel === 'admin' || escopo.papel === 'gerente_regional';
  const podeFiltrarColaborador = escopo.papel !== 'colaborador';

  const [regionais, lojas, colaboradores] = await Promise.all([
    podeFiltrarRegional ? listarRegionais(escopo) : Promise.resolve([]),
    podeFiltrarLoja ? lojasNoEscopo(escopo) : Promise.resolve([]),
    podeFiltrarColaborador
      ? usuariosNoEscopo(escopo, { papel: 'colaborador' })
      : Promise.resolve([]),
  ]);

  const regionalId =
    podeFiltrarRegional && regionais.some((r) => r.id === f.regional) ? f.regional : undefined;
  const lojaId = podeFiltrarLoja && lojas.some((l) => l.id === f.loja) ? f.loja : undefined;
  const colaboradorId =
    podeFiltrarColaborador && colaboradores.some((c) => c.id === f.colaborador)
      ? f.colaborador
      : undefined;

  const estadoFiltro = ESTADOS.some((e) => e.valor === f.estado)
    ? (f.estado as EstadoDeConvite)
    : undefined;

  // Origem (tarefa 6.1): só faz sentido para quem alcança convite avulso,
  // que é só o Admin. Para os outros papéis o seletor não aparece e o valor
  // da URL é ignorado — nada a ganhar filtrando por uma origem que o escopo
  // já não alcança.
  const podeFiltrarOrigem = escopo.papel === 'admin';
  const origemFiltro =
    podeFiltrarOrigem && (f.origem === 'avulsos' || f.origem === 'colaborador')
      ? f.origem
      : undefined;

  const tamanhoNumerico = Number.parseInt(f.tamanho ?? '', 10);
  const tamanho = (TAMANHOS_DE_PAGINA as readonly number[]).includes(tamanhoNumerico)
    ? tamanhoNumerico
    : TAMANHO_PADRAO;

  // Uma consulta só, sem filtro de estado nem de busca: alimenta as
  // contagens dos chips (que precisam refletir regional/loja/colaborador e
  // a busca, mas não o próprio estado escolhido) e a lista paginada.
  const todosNoFiltro = await convitesNoEscopo(escopo, {
    eventoId: palestraAtual.id,
    regionalId,
    lojaId,
    colaboradorId,
    semColaborador: origemFiltro === 'avulsos',
    comColaborador: origemFiltro === 'colaborador',
  });

  // Titular (e CPF, só para alimentar a busca) vêm de `confirmacoesNoEscopo`
  // porque `convitesNoEscopo` não sabe de confirmação nenhuma (3.2). A
  // consulta acontece aqui, ANTES da paginação, porque a busca por titular
  // ou CPF (3.6) precisa alcançar o conjunto filtrado inteiro, não só a
  // página visível.
  const temConfirmadoNoFiltro = todosNoFiltro.some(
    (c) => c.estado === 'confirmado' || c.estado === 'presente',
  );
  const titularesPorConvite = new Map<string, string>();
  const cpfPorConvite = new Map<string, string>();
  if (temConfirmadoNoFiltro) {
    const confirmados = await confirmacoesNoEscopo(escopo, { eventoId: palestraAtual.id });
    for (const conf of confirmados) {
      titularesPorConvite.set(conf.conviteId, conf.titular);
      cpfPorConvite.set(conf.conviteId, conf.cpf);
    }
  }

  // Busca por código, titular ou CPF (3.6): em memória, sobre o conjunto já
  // restrito pelo escopo e pelos filtros acima, no mesmo padrão de
  // `admin/organizacao/page.tsx` (5.3). O CPF aceita com e sem pontuação e
  // compara só dígitos, como o resto do sistema (`lib/palestras/cpf.ts`); o
  // limiar de 3 dígitos evita que uma busca de um dígito só bata com tudo.
  // Quando o papel não enxerga o CPF completo, `cpfPorConvite` já chega
  // mascarado da consulta acima (`confirmacoesNoEscopo` respeita
  // `veCpfCompleto`), então a busca por CPF aqui só alcança os dígitos que
  // a pessoa já veria em qualquer outra tela: ela não amplia o escopo.
  const busca = (f.busca ?? '').trim().toLowerCase();
  const buscaDigitos = somenteDigitos(f.busca ?? '');
  const noFiltroDeBusca = !busca
    ? todosNoFiltro
    : todosNoFiltro.filter(
        (c) =>
          c.codigo.toLowerCase().includes(busca) ||
          (titularesPorConvite.get(c.id)?.toLowerCase().includes(busca) ?? false) ||
          (buscaDigitos.length >= 3 &&
            (cpfPorConvite.get(c.id)?.includes(buscaDigitos) ?? false)),
      );

  const contagens: Record<EstadoDeConvite, number> = {
    disponivel: 0,
    confirmado: 0,
    presente: 0,
    expirado: 0,
    cancelado: 0,
  };
  for (const c of noFiltroDeBusca) contagens[c.estado] += 1;

  const filtradosSemOrdem = estadoFiltro
    ? noFiltroDeBusca.filter((c) => c.estado === estadoFiltro)
    : noFiltroDeBusca;

  // Ordenação (3.6): o valor vem da URL (D7), nunca de estado de cliente.
  // "Mais recentes" é o padrão do mockup; "Código" ajuda a achar um convite
  // já sabido de cor.
  const ordenarPor = f.ordenar === 'codigo' ? 'codigo' : 'recentes';
  const filtrados = [...filtradosSemOrdem].sort((a, b) =>
    ordenarPor === 'codigo'
      ? a.codigo.localeCompare(b.codigo)
      : b.criadoEm.getTime() - a.criadoEm.getTime(),
  );

  const totalDePaginas = Math.max(1, Math.ceil(filtrados.length / tamanho));
  const pagina = Math.min(
    Math.max(1, Number.parseInt(f.pagina ?? '1', 10) || 1),
    totalDePaginas,
  );
  const visiveis = filtrados.slice((pagina - 1) * tamanho, pagina * tamanho);

  const origem = env().APP_BASE_URL;

  const linhas = visiveis.map((c) =>
    paraLinha(c, origem, escopo, atual.usuarioId, titularesPorConvite),
  );

  function comFiltro(mudancas: Partial<Filtros>): string {
    const proximo: Filtros = {
      palestra: f.palestra,
      estado: f.estado,
      regional: f.regional,
      loja: f.loja,
      colaborador: f.colaborador,
      tamanho: f.tamanho,
      pagina: f.pagina,
      busca: f.busca,
      ordenar: f.ordenar,
      origem: f.origem,
      ...mudancas,
    };
    const params = new URLSearchParams();
    for (const [chave, valor] of Object.entries(proximo)) {
      if (valor) params.set(chave, valor);
    }
    const texto = params.toString();
    return texto ? `?${texto}` : '';
  }

  const temFiltroAvancado = Boolean(
    f.regional || f.loja || f.colaborador || f.tamanho || f.busca || f.ordenar || f.origem,
  );

  return (
    <>
      <CabecalhoDeTela sobrancelha="Painel" titulo="Convites" acao={acaoPrincipal} />

      <p className="mt-0 mb-6 max-w-prosa font-corpo text-corpo-lg text-texto">
        {escopo.papel === 'colaborador'
          ? 'Os convites gerados para você, nesta palestra. Copie o link ou envie pelo WhatsApp, o convidado escolhe o contato.'
          : 'Convites do seu escopo nesta palestra. Ações de envio e cancelamento ficam só com o colaborador dono e, para cancelar, também com o Admin.'}
      </p>

      <Cartao superficie="interna" className="mb-6 p-4">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="mr-1 font-corpo text-corpo-sm font-bold uppercase tracking-rotulo text-texto-suave">
            Estado
          </span>
          {(['todos', ...ESTADOS.map((e) => e.valor)] as const).map((valor) => {
            const ativo = valor === 'todos' ? !f.estado : f.estado === valor;
            const rotulo = valor === 'todos' ? 'Todos' : ESTADOS.find((e) => e.valor === valor)!.rotulo;
            const contagem =
              valor === 'todos'
                ? Object.values(contagens).reduce((a, b) => a + b, 0)
                : contagens[valor as EstadoDeConvite];
            return (
              <Link
                key={valor}
                href={`/palestras/painel/convites${comFiltro({ estado: valor === 'todos' ? undefined : valor, pagina: undefined })}`}
                aria-current={ativo ? 'true' : undefined}
                className={classesDoChip(ativo)}
              >
                {rotulo}
                <span className={classesDaContagem(ativo)}>{contagem}</span>
              </Link>
            );
          })}
        </div>

        <form
          method="get"
          className="mt-3 flex flex-wrap items-end gap-3 border-t border-linha pt-3"
        >
          {f.palestra ? <input type="hidden" name="palestra" value={f.palestra} /> : null}
          {f.estado ? <input type="hidden" name="estado" value={f.estado} /> : null}

          <label className="relative min-w-0 sm:w-64">
            <span className="mb-1 block font-corpo text-corpo-sm font-bold text-texto-forte">
              Buscar
            </span>
            <IconeBusca className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-texto-suave" />
            <Campo
              type="search"
              name="busca"
              defaultValue={f.busca ?? ''}
              placeholder="Código, titular ou CPF"
              className="pl-9"
            />
          </label>

          {podeFiltrarRegional ? (
            <label className="min-w-0 sm:w-52">
              <span className="mb-1 block font-corpo text-corpo-sm font-bold text-texto-forte">
                Regional
              </span>
              <Selecao name="regional" defaultValue={regionalId ?? ''}>
                <option value="">Todas</option>
                {regionais.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nome}
                  </option>
                ))}
              </Selecao>
            </label>
          ) : null}

          {podeFiltrarLoja ? (
            <label className="min-w-0 sm:w-52">
              <span className="mb-1 block font-corpo text-corpo-sm font-bold text-texto-forte">
                Loja
              </span>
              <Selecao name="loja" defaultValue={lojaId ?? ''}>
                <option value="">Todas</option>
                {lojas
                  .filter((l) => !regionalId || l.regionalId === regionalId)
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.codigo} · {l.nome}
                    </option>
                  ))}
              </Selecao>
            </label>
          ) : null}

          {podeFiltrarColaborador ? (
            <label className="min-w-0 sm:w-60">
              <span className="mb-1 block font-corpo text-corpo-sm font-bold text-texto-forte">
                Colaborador
              </span>
              <Selecao name="colaborador" defaultValue={colaboradorId ?? ''}>
                <option value="">Todos</option>
                {colaboradores.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </Selecao>
            </label>
          ) : null}

          {podeFiltrarOrigem ? (
            <label className="min-w-0 sm:w-56">
              <span className="mb-1 block font-corpo text-corpo-sm font-bold text-texto-forte">
                Origem
              </span>
              <Selecao name="origem" defaultValue={origemFiltro ?? ''}>
                <option value="">Todas as origens</option>
                <option value="avulsos">Avulsos (sem colaborador)</option>
                <option value="colaborador">Só de colaborador</option>
              </Selecao>
            </label>
          ) : null}

          <label className="min-w-0 sm:w-44">
            <span className="mb-1 block font-corpo text-corpo-sm font-bold text-texto-forte">
              Ordenar por
            </span>
            <Selecao name="ordenar" defaultValue={ordenarPor}>
              <option value="recentes">Mais recentes</option>
              <option value="codigo">Código</option>
            </Selecao>
          </label>

          <label className="min-w-0 sm:w-32">
            <span className="mb-1 block font-corpo text-corpo-sm font-bold text-texto-forte">
              Por página
            </span>
            <Selecao name="tamanho" defaultValue={String(tamanho)}>
              {TAMANHOS_DE_PAGINA.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Selecao>
          </label>

          <Botao type="submit" tamanho="sm">
            Filtrar
          </Botao>
          {temFiltroAvancado ? (
            <LinkBotao
              href={`/palestras/painel/convites${comFiltro({
                regional: undefined,
                loja: undefined,
                colaborador: undefined,
                tamanho: undefined,
                pagina: undefined,
                busca: undefined,
                ordenar: undefined,
                origem: undefined,
              })}`}
              variante="texto"
              tamanho="sm"
            >
              Limpar
            </LinkBotao>
          ) : null}
        </form>
      </Cartao>

      {linhas.length === 0 ? (
        <Vazio titulo="Nenhum convite neste filtro.">
          <p className="m-0">
            {estadoFiltro || regionalId || lojaId || colaboradorId || busca || origemFiltro
              ? 'Tente limpar os filtros acima.'
              : 'Assim que houver convites nesta palestra, no seu escopo, eles aparecem aqui.'}
          </p>
        </Vazio>
      ) : (
        <>
          <div className="hidden lg:block">
            <Tabela superficie="interna">
              <Cabecalho superficie="interna">
                <tr>
                  <CelulaDeTitulo>Código</CelulaDeTitulo>
                  <CelulaDeTitulo>Palestra</CelulaDeTitulo>
                  {/* "Origem", e não "Colaborador": a coluna também mostra
                      "Administração" com o rótulo do lote, no convite
                      avulso (tarefa 6.1). */}
                  <CelulaDeTitulo>Origem</CelulaDeTitulo>
                  <CelulaDeTitulo>Convidado ou anotação</CelulaDeTitulo>
                  <CelulaDeTitulo>Estado</CelulaDeTitulo>
                  <CelulaDeTitulo className="text-right">Ações</CelulaDeTitulo>
                </tr>
              </Cabecalho>
              <tbody>
                {linhas.map((c) => (
                  <LinhaDeConviteTabela key={c.id} convite={c} />
                ))}
              </tbody>
            </Tabela>
          </div>

          <ul className="m-0 flex flex-col gap-3 p-0 lg:hidden">
            {linhas.map((c) => (
              <CartaoDeConvite key={c.id} convite={c} />
            ))}
          </ul>

          {podeBaixarPdf ? (
            <LinkBotao
              href="/palestras/painel/convites/pdf"
              variante="secundario"
              className="mt-3 w-full justify-center lg:hidden"
            >
              Baixar meu PDF de convites
            </LinkBotao>
          ) : null}
        </>
      )}

      {filtrados.length > 0 ? (
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <p className="m-0 font-corpo text-corpo-sm text-texto-suave">
            Mostrando{' '}
            <strong className="text-texto-forte">
              {(pagina - 1) * tamanho + 1} a {Math.min(pagina * tamanho, filtrados.length)}
            </strong>{' '}
            de <strong className="text-texto-forte">{filtrados.length}</strong> convites
          </p>
          {totalDePaginas > 1 ? (
            <div className="ml-auto flex items-center gap-3">
              <LinkBotao
                href={`/palestras/painel/convites${comFiltro({ pagina: String(pagina - 1) })}`}
                variante="contorno"
                tamanho="sm"
                aria-disabled={pagina <= 1}
                className={pagina <= 1 ? 'pointer-events-none opacity-40' : ''}
              >
                Anterior
              </LinkBotao>
              <span className="font-corpo text-corpo-sm text-texto-suave">
                Página {pagina} de {totalDePaginas}
              </span>
              <LinkBotao
                href={`/palestras/painel/convites${comFiltro({ pagina: String(pagina + 1) })}`}
                variante="contorno"
                tamanho="sm"
                aria-disabled={pagina >= totalDePaginas}
                className={pagina >= totalDePaginas ? 'pointer-events-none opacity-40' : ''}
              >
                Próxima
              </LinkBotao>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
