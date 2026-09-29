import type { Metadata } from 'next';
import Link from 'next/link';

import { CabecalhoDeTela } from '@/components/palestras/cabecalho-de-tela';
import {
  AbaSegmentada,
  AbasSegmentadas,
  Botao,
  Cabecalho,
  Campo,
  Celula,
  CelulaDeTitulo,
  LinkBotao,
  Selecao,
  Selo,
  Tabela,
  Vazio,
} from '@/components/ui';
import { IconeBusca } from '@/components/ui/icones';
import type { Papel } from '@/lib/db/schema';
import {
  listarLojas,
  listarRegionais,
  listarUsuarios,
  type UsuarioComEscopo,
} from '@/lib/palestras/consultas';
import { formatarCpf, somenteDigitos } from '@/lib/palestras/cpf';
import { ROTULO_DO_PAPEL } from '@/lib/palestras/papeis';
import { exigirPapel } from '@/lib/palestras/sessao';
import { isoParaDataBr } from '@/lib/tempo';
import { cn } from '@/lib/utils';
import { BotaoDeAtivacao } from './formularios';
import { PainelDeCadastro, type NivelDaEstrutura } from './painel-de-cadastro';

export const metadata: Metadata = { title: 'Estrutura organizacional' };
export const dynamic = 'force-dynamic';

const TAMANHO_DE_PAGINA = 20;

type Filtros = {
  nivel?: string;
  busca?: string;
  papel?: string;
  loja?: string;
  regional?: string;
  inativos?: string;
  pagina?: string;
};

const TOM_DO_PAPEL: Record<Papel, 'neutro' | 'positivo' | 'atencao' | 'negativo' | 'acento'> = {
  admin: 'acento',
  gerente_regional: 'neutro',
  gerente_loja: 'neutro',
  colaborador: 'neutro',
  recepcao: 'atencao',
};

/* =========================================================
   /palestras/admin/organizacao (tarefa 5.3)

   Três níveis, uma aba por vez (D7 do design: abas são links, o estado
   vive na URL). `listarRegionais`, `listarLojas` e `listarUsuarios` são
   exatamente as mesmas consultas de antes, chamadas sem filtro; busca,
   filtro de papel/loja/regional, "mostrar inativos" e a paginação são
   aplicados aqui, em memória, sobre o resultado: a estrutura do circuito
   é da ordem de centenas de linhas, não milhões, e nenhuma Server Action
   muda. O cadastro deixa de ser formulário empilhado e passa a abrir num
   painel lateral (`./painel-de-cadastro.tsx`).
   ========================================================= */

function escopoDoUsuario(u: UsuarioComEscopo): { linha1: string; linha2?: string } {
  if (u.papel === 'admin') return { linha1: 'Todo o circuito' };
  if (u.papel === 'recepcao') return { linha1: 'Porta do evento' };
  if (u.papel === 'gerente_regional') {
    return { linha1: u.regionalNome ?? 'Regional não definida' };
  }
  if (u.lojaCodigo && u.lojaNome) {
    return {
      linha1: `${u.lojaCodigo} · ${u.lojaNome}`,
      linha2: u.regionalNome ?? undefined,
    };
  }
  return { linha1: 'Sem loja vinculada' };
}

export default async function Organizacao({
  searchParams,
}: {
  searchParams: Promise<Filtros>;
}) {
  const { escopo } = await exigirPapel(['admin']);
  const f = await searchParams;

  const [regionais, lojas, usuarios] = await Promise.all([
    listarRegionais(escopo),
    listarLojas(escopo),
    listarUsuarios(escopo),
  ]);

  const nivel: NivelDaEstrutura =
    f.nivel === 'lojas' ? 'lojas' : f.nivel === 'usuarios' ? 'usuarios' : 'regionais';

  const mostrarInativos = f.inativos === 'sim';
  const busca = (f.busca ?? '').trim().toLowerCase();
  const buscaDigitos = somenteDigitos(f.busca ?? '');

  const regionalFiltroId = regionais.some((r) => r.id === f.regional) ? f.regional : undefined;
  const lojaFiltroId = lojas.some((l) => l.id === f.loja) ? f.loja : undefined;
  const papelFiltro = (
    ['admin', 'gerente_regional', 'gerente_loja', 'colaborador', 'recepcao'] as Papel[]
  ).includes(f.papel as Papel)
    ? (f.papel as Papel)
    : undefined;

  function comFiltro(mudancas: Partial<Filtros>): string {
    const proximo: Filtros = {
      nivel: f.nivel,
      busca: f.busca,
      papel: f.papel,
      loja: f.loja,
      regional: f.regional,
      inativos: f.inativos,
      pagina: f.pagina,
      ...mudancas,
    };
    const params = new URLSearchParams();
    for (const [chave, valor] of Object.entries(proximo)) {
      if (valor) params.set(chave, valor);
    }
    const texto = params.toString();
    return texto ? `?${texto}` : '';
  }

  const regionaisFiltradas = regionais
    .filter((r) => mostrarInativos || r.ativo)
    .filter((r) => !busca || r.nome.toLowerCase().includes(busca));

  const lojasFiltradas = lojas
    .filter((l) => mostrarInativos || l.ativo)
    .filter((l) => !regionalFiltroId || l.regionalId === regionalFiltroId)
    .filter(
      (l) =>
        !busca ||
        l.nome.toLowerCase().includes(busca) ||
        l.codigo.toLowerCase().includes(busca),
    );

  const usuariosFiltrados = usuarios
    .filter((u) => mostrarInativos || u.ativo)
    .filter((u) => !papelFiltro || u.papel === papelFiltro)
    .filter((u) => !lojaFiltroId || u.lojaId === lojaFiltroId)
    .filter(
      (u) =>
        !busca ||
        u.nome.toLowerCase().includes(busca) ||
        (buscaDigitos.length >= 3 && u.cpf.includes(buscaDigitos)),
    );

  const totalPorAba = {
    regionais: regionaisFiltradas.length,
    lojas: lojasFiltradas.length,
    usuarios: usuariosFiltrados.length,
  };
  const totalDeLinhas = totalPorAba[nivel];
  const totalDePaginas = Math.max(1, Math.ceil(totalDeLinhas / TAMANHO_DE_PAGINA));
  const pagina = Math.min(
    Math.max(1, Number.parseInt(f.pagina ?? '1', 10) || 1),
    totalDePaginas,
  );
  const inicio = (pagina - 1) * TAMANHO_DE_PAGINA;

  const contagemPorPapel = {
    colaborador: usuarios.filter((u) => u.papel === 'colaborador').length,
    gerentes: usuarios.filter((u) => u.papel === 'gerente_regional' || u.papel === 'gerente_loja')
      .length,
    recepcao: usuarios.filter((u) => u.papel === 'recepcao').length,
    admin: usuarios.filter((u) => u.papel === 'admin').length,
  };

  return (
    <>
      <CabecalhoDeTela
        sobrancelha="Administração · cadastro"
        titulo="Estrutura organizacional"
        acao={
          <div className="flex flex-wrap items-center gap-3">
            <LinkBotao href="/palestras/admin/importar" variante="contorno" tamanho="sm">
              Importar por CSV
            </LinkBotao>
            <PainelDeCadastro nivel={nivel} regionais={regionais} lojas={lojas} />
          </div>
        }
      />

      <p className="mt-0 mb-6 max-w-prosa font-corpo text-corpo-lg text-texto">
        Três níveis: uma regional contém lojas, uma loja contém usuários. Para
        centenas de colaboradores, use a importação por CSV, o cadastro
        manual é para ajuste fino. Desativar preserva o histórico, não
        existe exclusão.
      </p>

      <AbasSegmentadas className="mb-4">
        <AbaSegmentada href="/palestras/admin/organizacao?nivel=regionais" ativo={nivel === 'regionais'}>
          Regionais <span className="ml-1.5 font-normal opacity-70">{regionais.length}</span>
        </AbaSegmentada>
        <AbaSegmentada href="/palestras/admin/organizacao?nivel=lojas" ativo={nivel === 'lojas'}>
          Lojas <span className="ml-1.5 font-normal opacity-70">{lojas.length}</span>
        </AbaSegmentada>
        <AbaSegmentada href="/palestras/admin/organizacao?nivel=usuarios" ativo={nivel === 'usuarios'}>
          Usuários <span className="ml-1.5 font-normal opacity-70">{usuarios.length}</span>
        </AbaSegmentada>
      </AbasSegmentadas>

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <input type="hidden" name="nivel" value={nivel} />

        <label className="relative block min-w-0 sm:w-64">
          <span className="mb-1 block font-corpo text-corpo-sm font-bold text-texto-forte">
            Buscar
          </span>
          <IconeBusca className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-texto-suave" />
          <Campo
            type="search"
            name="busca"
            defaultValue={f.busca ?? ''}
            placeholder={nivel === 'usuarios' ? 'Nome ou CPF' : 'Nome ou código'}
            className="pl-9"
          />
        </label>

        {nivel === 'lojas' ? (
          <label className="min-w-0 sm:w-56">
            <span className="mb-1 block font-corpo text-corpo-sm font-bold text-texto-forte">
              Regional
            </span>
            <Selecao name="regional" defaultValue={regionalFiltroId ?? ''}>
              <option value="">Todas</option>
              {regionais.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nome}
                </option>
              ))}
            </Selecao>
          </label>
        ) : null}

        {nivel === 'usuarios' ? (
          <>
            <label className="min-w-0 sm:w-52">
              <span className="mb-1 block font-corpo text-corpo-sm font-bold text-texto-forte">
                Papel
              </span>
              <Selecao name="papel" defaultValue={papelFiltro ?? ''}>
                <option value="">Todos os papéis</option>
                {(Object.keys(ROTULO_DO_PAPEL) as Papel[]).map((p) => (
                  <option key={p} value={p}>
                    {ROTULO_DO_PAPEL[p]}
                  </option>
                ))}
              </Selecao>
            </label>
            <label className="min-w-0 sm:w-56">
              <span className="mb-1 block font-corpo text-corpo-sm font-bold text-texto-forte">
                Loja
              </span>
              <Selecao name="loja" defaultValue={lojaFiltroId ?? ''}>
                <option value="">Todas</option>
                {lojas.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.codigo} · {l.nome}
                  </option>
                ))}
              </Selecao>
            </label>
          </>
        ) : null}

        <label className="flex min-h-11 items-center gap-2 font-corpo text-corpo-sm text-texto-forte">
          <input
            type="checkbox"
            name="inativos"
            value="sim"
            defaultChecked={mostrarInativos}
            className="size-5 accent-lima-500"
          />
          Mostrar inativos
        </label>

        <Botao type="submit" tamanho="sm">
          Filtrar
        </Botao>
        {busca || regionalFiltroId || lojaFiltroId || papelFiltro || mostrarInativos ? (
          <LinkBotao
            href={`/palestras/admin/organizacao?nivel=${nivel}`}
            variante="texto"
            tamanho="sm"
          >
            Limpar
          </LinkBotao>
        ) : null}

        {nivel === 'usuarios' ? (
          <p className="m-0 ml-auto font-corpo text-corpo-sm text-texto-suave">
            {usuarios.length} usuários · {contagemPorPapel.colaborador} colaboradores ·{' '}
            {contagemPorPapel.gerentes} gerentes · {contagemPorPapel.recepcao} recepção ·{' '}
            {contagemPorPapel.admin} admin
          </p>
        ) : null}
      </form>

      {nivel === 'regionais' ? (
        regionaisFiltradas.length === 0 ? (
          <Vazio titulo="Nenhuma regional neste filtro.">
            {regionais.length === 0 ? (
              <p>Crie ao menos uma regional antes de cadastrar lojas, toda loja pertence a uma.</p>
            ) : null}
          </Vazio>
        ) : (
          <Tabela superficie="interna">
            <Cabecalho superficie="interna">
              <tr>
                <CelulaDeTitulo>Nome</CelulaDeTitulo>
                <CelulaDeTitulo className="text-right">Lojas</CelulaDeTitulo>
                <CelulaDeTitulo>Situação</CelulaDeTitulo>
                <CelulaDeTitulo className="text-right">
                  <span className="sr-only">Ações</span>
                </CelulaDeTitulo>
              </tr>
            </Cabecalho>
            <tbody>
              {regionaisFiltradas.slice(inicio, inicio + TAMANHO_DE_PAGINA).map((r) => (
                <tr key={r.id}>
                  <Celula className="font-bold text-texto-forte">{r.nome}</Celula>
                  <Celula className="text-right tabular-nums">
                    {lojas.filter((l) => l.regionalId === r.id).length}
                  </Celula>
                  <Celula>
                    <Selo tom={r.ativo ? 'positivo' : 'neutro'}>
                      {r.ativo ? 'Ativa' : 'Inativa'}
                    </Selo>
                  </Celula>
                  <Celula className="text-right">
                    <BotaoDeAtivacao alvo="regional" id={r.id} ativo={r.ativo} />
                  </Celula>
                </tr>
              ))}
            </tbody>
          </Tabela>
        )
      ) : null}

      {nivel === 'lojas' ? (
        lojasFiltradas.length === 0 ? (
          <Vazio titulo="Nenhuma loja neste filtro." />
        ) : (
          <Tabela superficie="interna">
            <Cabecalho superficie="interna">
              <tr>
                <CelulaDeTitulo>Código</CelulaDeTitulo>
                <CelulaDeTitulo>Loja</CelulaDeTitulo>
                <CelulaDeTitulo>Regional</CelulaDeTitulo>
                <CelulaDeTitulo className="text-right">Usuários</CelulaDeTitulo>
                <CelulaDeTitulo>Situação</CelulaDeTitulo>
                <CelulaDeTitulo className="text-right">
                  <span className="sr-only">Ações</span>
                </CelulaDeTitulo>
              </tr>
            </Cabecalho>
            <tbody>
              {lojasFiltradas.slice(inicio, inicio + TAMANHO_DE_PAGINA).map((l) => (
                <tr key={l.id}>
                  <Celula className="font-mono">{l.codigo}</Celula>
                  <Celula className="font-bold text-texto-forte">
                    {l.nome}
                    {l.cidade ? (
                      <span className="block font-normal text-corpo-sm text-texto-suave">
                        {l.cidade}
                      </span>
                    ) : null}
                  </Celula>
                  <Celula>{l.regionalNome}</Celula>
                  <Celula className="text-right tabular-nums">
                    {usuarios.filter((u) => u.lojaId === l.id).length}
                  </Celula>
                  <Celula>
                    <Selo tom={l.ativo ? 'positivo' : 'neutro'}>
                      {l.ativo ? 'Ativa' : 'Inativa'}
                    </Selo>
                  </Celula>
                  <Celula className="text-right">
                    <BotaoDeAtivacao alvo="loja" id={l.id} ativo={l.ativo} />
                  </Celula>
                </tr>
              ))}
            </tbody>
          </Tabela>
        )
      ) : null}

      {nivel === 'usuarios' ? (
        usuariosFiltrados.length === 0 ? (
          <Vazio titulo="Nenhum usuário neste filtro.">
            {usuarios.length === 0 ? (
              <p>
                Para centenas de colaboradores, use a{' '}
                <Link
                  href="/palestras/admin/importar"
                  className="font-bold underline underline-offset-4"
                >
                  importação por CSV
                </Link>{' '}
                em vez do formulário.
              </p>
            ) : null}
          </Vazio>
        ) : (
          <Tabela superficie="interna">
            <Cabecalho superficie="interna">
              <tr>
                <CelulaDeTitulo>Nome</CelulaDeTitulo>
                <CelulaDeTitulo>CPF</CelulaDeTitulo>
                <CelulaDeTitulo>Nascimento</CelulaDeTitulo>
                <CelulaDeTitulo>Papel</CelulaDeTitulo>
                <CelulaDeTitulo>Escopo</CelulaDeTitulo>
                <CelulaDeTitulo>Situação</CelulaDeTitulo>
                <CelulaDeTitulo className="text-right">
                  <span className="sr-only">Ações</span>
                </CelulaDeTitulo>
              </tr>
            </Cabecalho>
            <tbody>
              {usuariosFiltrados.slice(inicio, inicio + TAMANHO_DE_PAGINA).map((u) => {
                const escopoTexto = escopoDoUsuario(u);
                return (
                  <tr key={u.id} className={cn(!u.ativo && 'bg-superficie-alt')}>
                    <Celula className="font-bold text-texto-forte">
                      {u.nome}
                      <span className="block font-normal text-corpo-sm text-texto-suave">
                        {u.email ?? 'sem e-mail cadastrado'}
                      </span>
                    </Celula>
                    {/* O Admin vê o CPF inteiro nesta tela: os demais papéis
                        recebem a versão mascarada, aplicada por
                        `auth-e-papeis` em outras superfícies. */}
                    <Celula className="font-mono">{formatarCpf(u.cpf)}</Celula>
                    <Celula>{isoParaDataBr(u.dataNascimento)}</Celula>
                    <Celula>
                      <Selo tom={TOM_DO_PAPEL[u.papel as Papel]}>
                        {ROTULO_DO_PAPEL[u.papel as Papel]}
                      </Selo>
                    </Celula>
                    <Celula className="text-corpo-sm">
                      {escopoTexto.linha1}
                      {escopoTexto.linha2 ? (
                        <span className="block text-texto-suave">{escopoTexto.linha2}</span>
                      ) : null}
                    </Celula>
                    <Celula>
                      <Selo tom={u.ativo ? 'positivo' : 'neutro'}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </Selo>
                    </Celula>
                    <Celula className="text-right">
                      <BotaoDeAtivacao alvo="usuario" id={u.id} ativo={u.ativo} />
                    </Celula>
                  </tr>
                );
              })}
            </tbody>
          </Tabela>
        )
      ) : null}

      {totalDeLinhas > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <p className="m-0 font-corpo text-corpo-sm text-texto-suave">
            Mostrando{' '}
            <strong className="text-texto-forte">
              {inicio + 1} a {Math.min(inicio + TAMANHO_DE_PAGINA, totalDeLinhas)}
            </strong>{' '}
            de <strong className="text-texto-forte">{totalDeLinhas}</strong>
          </p>
          {totalDePaginas > 1 ? (
            <div className="ml-auto flex items-center gap-3">
              <LinkBotao
                href={`/palestras/admin/organizacao${comFiltro({ pagina: String(pagina - 1) })}`}
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
                href={`/palestras/admin/organizacao${comFiltro({ pagina: String(pagina + 1) })}`}
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
