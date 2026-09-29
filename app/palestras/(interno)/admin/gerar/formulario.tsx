'use client';

import Link from 'next/link';
import { useActionState, useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';

import {
  Aviso,
  Botao,
  Cabecalho,
  Campo,
  Cartao,
  Celula,
  CelulaDeTitulo,
  Grupo,
  Selecao,
  Tabela,
  TituloDoCartao,
  Vazio,
} from '@/components/ui';
import { esquemaDeQuantidade } from '@/lib/palestras/validacao';
import { gerarLotes } from './acoes';
import { ESTADO_INICIAL } from './estado';

/* =========================================================
   Formulário de geração de convites (tarefa 5.5)

   `gerarLotes` (que chama `gerarLotesDeConvites`), a validação de
   quantidade (`esquemaDeQuantidade`, máximo de 500 por colaborador numa
   operação) e o registro de auditoria continuam exatamente como estavam.
   A novidade é toda de apresentação: filtros e quantidade em massa numa
   barra só, e um resumo lateral que soma "colaboradores com quantidade" e
   "convites a gerar" em tempo real, reaproveitando a MESMA validação de
   quantidade no cliente, só para destacar a linha antes de enviar (o
   servidor recusa de novo se algo passar batido).
   ========================================================= */

export type PalestraDisponivel = {
  id: string;
  /** Já inclui o aviso de prazo, para a opção do seletor. */
  rotulo: string;
  /** Sem o aviso de prazo, para o resumo lateral. */
  rotuloResumo: string;
  prazoVencido: boolean;
  prazoVenceHoje: boolean;
  /** Só a hora (ex.: "23h59"), para o aviso de prazo que já diz "hoje". */
  prazoFormatado: string;
};

export type Colaborador = {
  id: string;
  nome: string;
  lojaId: string | null;
  lojaCodigo: string | null;
  lojaNome: string | null;
  regionalId: string | null;
  regionalNome: string | null;
  jaTem: number;
};

function BotaoGerar({
  total,
  algumErro,
  linhasComErro,
}: {
  total: number;
  algumErro: boolean;
  linhasComErro: number;
}) {
  const { pending } = useFormStatus();
  const desabilitado = pending || total === 0 || algumErro;
  return (
    <Botao
      type="submit"
      tamanho="lg"
      disabled={desabilitado}
      className="w-full"
      variante="primario"
    >
      {pending
        ? 'Gerando...'
        : algumErro
          ? `Corrija ${linhasComErro} linha${linhasComErro === 1 ? '' : 's'} para gerar`
          : total === 0
            ? 'Informe as quantidades'
            : `Gerar ${total} convite(s)`}
    </Botao>
  );
}

/** Reaproveita a validação real do servidor, só para avisar antes de enviar. */
function erroDeQuantidade(valorTexto: string): string | null {
  const bruto = valorTexto.trim();
  if (!bruto) return null; // vazio = colaborador não selecionado, não é erro
  const numero = Number(bruto);
  const analise = esquemaDeQuantidade.safeParse(numero);
  if (analise.success) return null;
  return analise.error.issues[0]?.message ?? 'Quantidade inválida.';
}

export function FormularioDeGeracao({
  palestras,
  colaboradores,
  regionais,
  lojas,
}: {
  palestras: PalestraDisponivel[];
  colaboradores: Colaborador[];
  regionais: { id: string; nome: string }[];
  lojas: { id: string; nome: string; codigo: string; regionalId: string }[];
}) {
  const [estado, acao] = useActionState(gerarLotes, ESTADO_INICIAL);

  const [eventoId, setEventoId] = useState('');
  const [regionalId, setRegionalId] = useState('');
  const [lojaId, setLojaId] = useState('');
  const [quantidades, setQuantidades] = useState<Record<string, string>>({});
  const [emMassa, setEmMassa] = useState('');

  const palestraEscolhida = palestras.find((p) => p.id === eventoId) ?? null;

  const lojasDoFiltro = useMemo(
    () => (regionalId ? lojas.filter((l) => l.regionalId === regionalId) : lojas),
    [lojas, regionalId],
  );

  const visiveis = useMemo(
    () =>
      colaboradores.filter(
        (c) =>
          (!regionalId || c.regionalId === regionalId) &&
          (!lojaId || c.lojaId === lojaId),
      ),
    [colaboradores, regionalId, lojaId],
  );

  const total = useMemo(
    () =>
      Object.values(quantidades).reduce((s, v) => {
        const n = Number(v);
        return s + (Number.isFinite(n) && n > 0 ? n : 0);
      }, 0),
    [quantidades],
  );

  const selecionados = Object.values(quantidades).filter((v) => Number(v) > 0).length;

  const linhasComErroCliente = visiveis.filter((c) =>
    erroDeQuantidade(quantidades[c.id] ?? ''),
  ).length;

  return (
    <form action={acao} className="grid items-start gap-5 lg:grid-cols-[1fr_340px]">
      <div className="flex min-w-0 flex-col gap-4">
        {estado.mensagem ? (
          <Aviso tom={estado.ok ? 'sucesso' : 'erro'}>
            <p>{estado.mensagem}</p>
            {estado.ok && estado.resumo ? (
              <p>
                Palestra de {estado.resumo.palestra} · {estado.resumo.convites} convite(s) para{' '}
                {estado.resumo.colaboradores} colaborador(es) em {estado.resumo.duracaoMs} ms.
              </p>
            ) : null}
          </Aviso>
        ) : null}

        <div className="flex flex-wrap items-end gap-3">
          <Grupo rotulo="Palestra" htmlFor="eventoId" obrigatorio className="mb-0 w-56">
            <Selecao
              id="eventoId"
              name="eventoId"
              required
              value={eventoId}
              onChange={(e) => setEventoId(e.target.value)}
            >
              <option value="" disabled>
                Escolha a palestra
              </option>
              {palestras.map((p) => (
                <option key={p.id} value={p.id} disabled={p.prazoVencido}>
                  {p.rotulo}
                </option>
              ))}
            </Selecao>
          </Grupo>

          <Grupo rotulo="Regional" htmlFor="filtro-regional" className="mb-0 w-48">
            <Selecao
              id="filtro-regional"
              value={regionalId}
              onChange={(e) => {
                setRegionalId(e.target.value);
                setLojaId('');
              }}
            >
              <option value="">Todas</option>
              {regionais.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nome}
                </option>
              ))}
            </Selecao>
          </Grupo>

          <Grupo rotulo="Loja" htmlFor="filtro-loja" className="mb-0 w-52">
            <Selecao id="filtro-loja" value={lojaId} onChange={(e) => setLojaId(e.target.value)}>
              <option value="">Todas</option>
              {lojasDoFiltro.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.codigo} · {l.nome}
                </option>
              ))}
            </Selecao>
          </Grupo>

          {/* Aplicar a mesma quantidade a todos os visíveis é o caso comum:
              "10 convites para cada colaborador desta loja". */}
          <Grupo rotulo="Para todos" htmlFor="em-massa" className="mb-0 w-28">
            <Campo
              id="em-massa"
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={emMassa}
              onChange={(e) => setEmMassa(e.target.value)}
              placeholder="10"
            />
          </Grupo>

          <Botao
            type="button"
            variante="contorno"
            onClick={() => {
              const proximo = { ...quantidades };
              for (const c of visiveis) proximo[c.id] = emMassa;
              setQuantidades(proximo);
            }}
          >
            Aplicar aos {visiveis.length} visíveis
          </Botao>
          <Botao type="button" variante="texto" onClick={() => setQuantidades({})}>
            Limpar tudo
          </Botao>
        </div>

        {visiveis.length === 0 ? (
          <Vazio titulo="Nenhum colaborador neste filtro.">
            <p>
              Só entram aqui usuários <strong>ativos</strong> com papel{' '}
              <code className="font-mono">colaborador</code> e loja vinculada.
            </p>
          </Vazio>
        ) : (
          <Tabela superficie="interna">
            <Cabecalho superficie="interna">
              <tr>
                <CelulaDeTitulo>Colaborador</CelulaDeTitulo>
                <CelulaDeTitulo>Loja</CelulaDeTitulo>
                <CelulaDeTitulo className="text-right">Já tem</CelulaDeTitulo>
                <CelulaDeTitulo>Novos</CelulaDeTitulo>
                <CelulaDeTitulo className="text-right">Fica com</CelulaDeTitulo>
              </tr>
            </Cabecalho>
            <tbody>
              {visiveis.map((c) => {
                const valorTexto = quantidades[c.id] ?? '';
                const erroServidor = estado.errosPorColaborador?.[c.id];
                const erroCliente = erroDeQuantidade(valorTexto);
                const erro = erroServidor ?? erroCliente;
                const numero = Number(valorTexto);
                const valida = !erro && Number.isFinite(numero) && numero > 0;

                return (
                  <tr key={c.id} className={erro ? 'bg-perigo-suave' : undefined}>
                    <Celula className="font-bold text-texto-forte">{c.nome}</Celula>
                    <Celula className="text-corpo-sm">
                      {c.lojaCodigo} · {c.lojaNome}
                    </Celula>
                    <Celula className="text-right tabular-nums">{c.jaTem}</Celula>
                    <Celula>
                      <Campo
                        name={`quantidade:${c.id}`}
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        className="w-24"
                        value={valorTexto}
                        onChange={(e) =>
                          setQuantidades((q) => ({ ...q, [c.id]: e.target.value }))
                        }
                        aria-invalid={Boolean(erro)}
                        aria-label={`Quantidade de convites para ${c.nome}`}
                      />
                      {erro ? (
                        <span className="mt-1 block font-corpo text-corpo-sm font-bold text-perigo">
                          {erro}
                        </span>
                      ) : null}
                    </Celula>
                    <Celula className="text-right tabular-nums font-bold">
                      {erroCliente ? (
                        <span className="text-perigo">inválido</span>
                      ) : (
                        <span className="text-texto-forte">
                          {c.jaTem + (valida ? numero : 0)}
                        </span>
                      )}
                    </Celula>
                  </tr>
                );
              })}
            </tbody>
          </Tabela>
        )}

        <p className="m-0 font-corpo text-corpo-sm text-texto-suave">
          Mostrando {visiveis.length} de {colaboradores.length} colaborador(es). Só entram
          usuários ativos, com papel colaborador e loja vinculada.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="rounded-cartao bg-inverso-fundo p-5 text-texto-inverso">
          <p className="m-0 mb-4 font-corpo text-rotulo font-bold uppercase tracking-sobrancelha text-lima-500">
            Resumo da operação
          </p>
          <dl className="m-0 flex flex-col gap-3">
            <div>
              <dt className="font-corpo text-corpo-sm text-texto-inverso-suave">Palestra</dt>
              <dd className="m-0 mt-0.5 font-corpo text-corpo-lg font-bold text-texto-inverso">
                {palestraEscolhida?.rotuloResumo ?? 'Nenhuma escolhida'}
              </dd>
            </div>
            <div>
              <dt className="font-corpo text-corpo-sm text-texto-inverso-suave">
                Colaboradores com quantidade
              </dt>
              <dd className="m-0 mt-0.5 font-corpo text-corpo-lg font-bold text-texto-inverso">
                {selecionados} de {visiveis.length}
              </dd>
            </div>
            <div>
              <dt className="font-corpo text-corpo-sm text-texto-inverso-suave">
                Convites a gerar
              </dt>
              <dd className="m-0 mt-0.5 font-titulo text-t1 font-bold leading-none text-lima-500">
                {total}
              </dd>
            </div>
          </dl>
          <div className="mt-5">
            <BotaoGerar total={total} algumErro={linhasComErroCliente > 0} linhasComErro={linhasComErroCliente} />
          </div>
          <p className="m-0 mt-3 font-corpo text-corpo-sm text-texto-inverso-suave">
            Novos convites são <strong className="text-texto-inverso">somados</strong> aos que o
            colaborador já tem: nada é substituído nem invalidado.
          </p>
        </div>

        {palestraEscolhida?.prazoVenceHoje ? (
          <Aviso tom="atencao">
            <p>
              <strong>O prazo desta palestra vence hoje às {palestraEscolhida.prazoFormatado}.</strong>{' '}
              Convite gerado depois do prazo nasce já expirado. Se for gerar, avise as lojas
              para enviarem hoje.
            </p>
          </Aviso>
        ) : null}

        <Cartao superficie="interna">
          <TituloDoCartao className="mb-2">Como funciona</TituloDoCartao>
          <ul className="m-0 list-disc pl-5 font-corpo text-corpo text-texto">
            <li>Cada convite nasce <strong>disponível</strong>, com código de 6 caracteres.</li>
            <li>
              Novos convites são <strong>somados</strong> aos que a pessoa já tem: nada é
              substituído.
            </li>
            <li>A operação é registrada na auditoria com quem gerou e quantos.</li>
            <li>
              Depois de gerar, vá em{' '}
              <Link
                href="/palestras/admin/distribuir"
                className="font-bold underline underline-offset-4"
              >
                PDFs de distribuição
              </Link>
              .
            </li>
          </ul>
        </Cartao>
      </div>
    </form>
  );
}
