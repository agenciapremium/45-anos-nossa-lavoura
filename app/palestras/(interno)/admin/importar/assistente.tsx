'use client';

import { useActionState, useState } from 'react';
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
  LinkBotao,
  Selo,
  Tabela,
  TituloDoCartao,
} from '@/components/ui';
import { formatarCpf } from '@/lib/palestras/cpf';
import { cn } from '@/lib/utils';
import {
  confirmarImportacao,
  previsualizar,
  type Contagens,
  type EstadoDaImportacao,
} from './acoes';
import { ESTADO_INICIAL } from './estado';

/* =========================================================
   Assistente de importação (tarefa 5.4)

   O estado (`previsualizar` -> `confirmarImportacao`) e a validação
   inteira continuam em `acoes.ts` e `lib/palestras/servicos/importacao.ts`,
   sem nenhuma mudança: nada é gravado antes da confirmação explícita.
   Esta reescrita só acrescenta os passos, reorganiza contagens, amostra e
   erros lado a lado, e deixa a confirmação em duas etapas mais evidente.
   ========================================================= */

function BotaoEnviar({ rotulo, rotuloPendente }: { rotulo: string; rotuloPendente: string }) {
  const { pending } = useFormStatus();
  return (
    <Botao type="submit" tamanho="lg" disabled={pending}>
      {pending ? rotuloPendente : rotulo}
    </Botao>
  );
}

/* ---------------------------------------------------------
   Passos (1. Enviar arquivo, 2. Conferir contagens, 3. Confirmar e gravar)
   --------------------------------------------------------- */
const NOMES_DOS_PASSOS = ['Enviar arquivo', 'Conferir contagens', 'Confirmar e gravar'];

function Passos({
  passoAtual,
  concluido = false,
}: {
  passoAtual: 1 | 2 | 3;
  concluido?: boolean;
}) {
  return (
    <ol className="m-0 flex flex-wrap items-center gap-3 p-0">
      {NOMES_DOS_PASSOS.map((nome, indiceZero) => {
        const indice = indiceZero + 1;
        const feito = indice < passoAtual || (indice === passoAtual && concluido);
        const atual = indice === passoAtual && !concluido;
        return (
          <li key={nome} className="flex list-none items-center gap-3">
            {indiceZero > 0 ? (
              <span aria-hidden="true" className="h-px w-6 flex-none bg-linha sm:w-12" />
            ) : null}
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-7 flex-none items-center justify-center rounded-pilula font-corpo text-corpo-sm font-bold',
                  feito
                    ? 'bg-sucesso text-creme-500'
                    : atual
                      ? 'bg-terra-900 text-lima-500'
                      : 'bg-superficie-alt text-texto-suave',
                )}
              >
                {feito ? '✓' : indice}
              </span>
              <span
                className={cn(
                  'font-corpo text-corpo-sm font-bold',
                  feito || atual ? 'text-texto-forte' : 'text-texto-suave',
                )}
              >
                {nome}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/* ---------------------------------------------------------
   Contagens
   --------------------------------------------------------- */
const CORES_DO_NUMERO = {
  neutro: { moldura: 'border-linha bg-cartao', texto: 'text-texto-forte', rotulo: 'text-texto-suave' },
  positivo: { moldura: 'border-sucesso bg-sucesso-suave', texto: 'text-sucesso', rotulo: 'text-sucesso' },
  negativo: { moldura: 'border-perigo bg-perigo-suave', texto: 'text-perigo', rotulo: 'text-perigo' },
} as const;

function Numero({
  valor,
  rotulo,
  tom = 'neutro',
}: {
  valor: number;
  rotulo: string;
  tom?: keyof typeof CORES_DO_NUMERO;
}) {
  const cores = CORES_DO_NUMERO[tom];
  return (
    <div className={cn('rounded-cartao border p-3 text-center', cores.moldura)}>
      <b className={cn('block font-titulo text-t2 font-bold tabular-nums', cores.texto)}>
        {valor}
      </b>
      <span className={cn('block font-corpo text-corpo-sm', cores.rotulo)}>{rotulo}</span>
    </div>
  );
}

function Resumo({ contagens }: { contagens: Contagens }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      <Numero valor={contagens.novos} rotulo="novos" tom="positivo" />
      <Numero valor={contagens.atualizados} rotulo="atualizados" />
      <Numero
        valor={contagens.erros}
        rotulo="com erro"
        tom={contagens.erros ? 'negativo' : 'neutro'}
      />
      <Numero valor={contagens.total} rotulo="linhas no arquivo" />
      <Numero valor={contagens.regionaisNovas} rotulo="regionais novas" />
      <Numero valor={contagens.lojasNovas} rotulo="lojas novas" />
      <Numero valor={contagens.lojasAtualizadas} rotulo="lojas atualizadas" />
    </div>
  );
}

/* ---------------------------------------------------------
   Lista de erros
   --------------------------------------------------------- */
function ListaDeErros({ estado }: { estado: EstadoDaImportacao }) {
  const erros = estado.erros ?? [];
  if (erros.length === 0) return null;

  return (
    <Cartao superficie="interna" className="flex flex-col border-2 border-perigo">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <TituloDoCartao className="text-perigo">
          {erros.length} linha{erros.length === 1 ? '' : 's'} recusada{erros.length === 1 ? '' : 's'}
        </TituloDoCartao>
        {/*
          O relatório é montado no navegador a partir dos erros que já estão
          na tela, não precisa voltar ao servidor nem reenviar o CSV.
        */}
        <Botao variante="contorno" tamanho="sm" onClick={() => baixarRelatorio(erros)}>
          Baixar relatório CSV
        </Botao>
      </div>
      <Tabela superficie="interna">
        <Cabecalho superficie="interna">
          <tr>
            <CelulaDeTitulo>Linha</CelulaDeTitulo>
            <CelulaDeTitulo>Campo</CelulaDeTitulo>
            <CelulaDeTitulo>Motivo</CelulaDeTitulo>
            <CelulaDeTitulo>Conteúdo original</CelulaDeTitulo>
          </tr>
        </Cabecalho>
        <tbody>
          {erros.slice(0, 200).map((e, i) => (
            <tr key={`${e.linha}-${e.campo}-${i}`}>
              <Celula className="tabular-nums font-bold">{e.linha}</Celula>
              <Celula className="font-mono text-corpo-sm">{e.campo ?? '(nenhum)'}</Celula>
              <Celula>{e.motivo}</Celula>
              <Celula className="max-w-[24ch] truncate font-mono text-corpo-sm text-texto-suave">
                {e.original}
              </Celula>
            </tr>
          ))}
        </tbody>
      </Tabela>
      {erros.length > 200 ? (
        <p className="mt-2 font-corpo text-corpo-sm text-texto-suave">
          Mostrando as 200 primeiras. O relatório em CSV traz todas.
        </p>
      ) : null}
    </Cartao>
  );
}

function baixarRelatorio(erros: NonNullable<EstadoDaImportacao['erros']>): void {
  const escapar = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const csv = [
    'linha,campo,motivo,conteudo_original',
    ...erros.map((e) =>
      [String(e.linha), e.campo ?? '', e.motivo, e.original].map(escapar).join(','),
    ),
  ].join('\n');

  // BOM para o Excel abrir em UTF-8 sem transformar acento em caractere solto.
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'erros-da-importacao.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/* ---------------------------------------------------------
   Assistente
   --------------------------------------------------------- */
export function AssistenteDeImportacao() {
  const [previa, acaoPrevia] = useActionState(previsualizar, ESTADO_INICIAL);
  const [confirmacao, acaoConfirmar] = useActionState(confirmarImportacao, ESTADO_INICIAL);
  const [somenteValidas, setSomenteValidas] = useState(false);

  /* ---------- concluída ---------- */
  if (confirmacao.etapa === 'confirmada' && confirmacao.contagens) {
    return (
      <div className="flex flex-col gap-6">
        <Passos passoAtual={3} concluido />
        <Aviso tom="sucesso" titulo="Importação concluída">
          <p>{confirmacao.mensagem}</p>
        </Aviso>
        <Resumo contagens={confirmacao.contagens} />
        <ListaDeErros estado={confirmacao} />
        <div className="flex flex-wrap gap-3">
          <LinkBotao href="/palestras/admin/organizacao">Ver a estrutura</LinkBotao>
          <LinkBotao href="/palestras/admin/importar" variante="texto">
            Importar outro arquivo
          </LinkBotao>
        </div>
      </div>
    );
  }

  /* ---------- pré-visualização (conferência antes de gravar) ---------- */
  if (previa.etapa === 'previa' && previa.contagens) {
    const temErros = previa.contagens.erros > 0;
    const podeConfirmar = !temErros || somenteValidas;
    const linhasValidas = previa.contagens.total - previa.contagens.erros;

    return (
      <div className="flex flex-col gap-6">
        <Passos passoAtual={2} />

        {confirmacao.etapa === 'falha' && confirmacao.mensagem ? (
          <Aviso tom="erro">
            <p>{confirmacao.mensagem}</p>
          </Aviso>
        ) : null}

        <Aviso tom="informacao" titulo="Nada foi gravado ainda">
          <p>
            Esta é a conferência de <strong>{previa.arquivoNome}</strong>, com{' '}
            {previa.contagens.total} linha{previa.contagens.total === 1 ? '' : 's'}. A carga é
            idempotente: reimportar o mesmo arquivo não duplica ninguém.
          </p>
        </Aviso>

        <Resumo contagens={previa.contagens} />

        <div className="grid gap-6 lg:grid-cols-2">
          {previa.amostra?.length ? (
            <Cartao superficie="interna" className="flex flex-col">
              <TituloDoCartao className="mb-3">Amostra do que vai ser gravado</TituloDoCartao>
              <Tabela superficie="interna">
                <Cabecalho superficie="interna">
                  <tr>
                    <CelulaDeTitulo>Linha</CelulaDeTitulo>
                    <CelulaDeTitulo>Nome</CelulaDeTitulo>
                    <CelulaDeTitulo>CPF</CelulaDeTitulo>
                    <CelulaDeTitulo>Loja</CelulaDeTitulo>
                    <CelulaDeTitulo>Situação</CelulaDeTitulo>
                  </tr>
                </Cabecalho>
                <tbody>
                  {previa.amostra.map((a) => (
                    <tr key={a.linha}>
                      <Celula className="tabular-nums">{a.linha}</Celula>
                      <Celula className="font-bold">{a.nome}</Celula>
                      <Celula className="font-mono">{formatarCpf(a.cpf)}</Celula>
                      <Celula className="text-corpo-sm">{a.loja}</Celula>
                      <Celula>
                        <Selo tom={a.situacao === 'novo' ? 'positivo' : 'neutro'}>
                          {a.situacao}
                        </Selo>
                      </Celula>
                    </tr>
                  ))}
                </tbody>
              </Tabela>
              <p className="mt-2 font-corpo text-corpo-sm text-texto-suave">
                Primeiras {previa.amostra.length} de {linhasValidas} linha(s) válida(s).
                Atualizar mexe em nome, e-mail, papel e loja, nunca no CPF, que é a chave.
              </p>
            </Cartao>
          ) : null}

          <ListaDeErros estado={previa} />
        </div>

        <Cartao superficie="interna" className="flex flex-wrap items-center gap-5">
          <form action={acaoConfirmar} className="flex flex-1 flex-wrap items-center gap-5">
            <input type="hidden" name="conteudo" value={previa.conteudo ?? ''} />
            <input type="hidden" name="arquivoNome" value={previa.arquivoNome ?? ''} />
            <input type="hidden" name="somenteValidas" value={somenteValidas ? 'sim' : 'nao'} />

            {temErros ? (
              <label className="flex min-h-11 flex-1 items-start gap-3 font-corpo text-corpo">
                <input
                  type="checkbox"
                  checked={somenteValidas}
                  onChange={(e) => setSomenteValidas(e.target.checked)}
                  className="mt-1 size-5 accent-lima-500"
                />
                <span>
                  Gravar apenas as <strong className="text-texto-forte">{linhasValidas}</strong>{' '}
                  linha(s) válida(s). As {previa.contagens.erros} com erro são ignoradas e
                  continuam no relatório. Nada é gravado pela metade.
                </span>
              </label>
            ) : (
              <p className="m-0 flex-1 font-corpo text-corpo text-texto">
                Nenhum erro nesta planilha: as {previa.contagens.total} linha(s) vão ser
                gravadas.
              </p>
            )}

            <Botao type="submit" tamanho="lg" disabled={!podeConfirmar} className="flex-none">
              Confirmar importação de {podeConfirmar ? linhasValidas : previa.contagens.total}
            </Botao>
          </form>
        </Cartao>
        {!podeConfirmar ? (
          <p className="m-0 font-corpo text-corpo-sm font-bold text-perigo">
            Há linhas com erro. Corrija a planilha ou marque a opção acima.
          </p>
        ) : null}

        <div>
          <LinkBotao href="/palestras/admin/importar" variante="texto">
            Escolher outro arquivo
          </LinkBotao>
        </div>
      </div>
    );
  }

  /* ---------- envio ---------- */
  return (
    <div className="flex flex-col gap-6">
      <Passos passoAtual={1} />

      {previa.etapa === 'falha' && previa.mensagem ? (
        <Aviso tom="erro" titulo="Arquivo recusado">
          <p>{previa.mensagem}</p>
        </Aviso>
      ) : null}

      <ListaDeErros estado={previa} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Cartao superficie="interna">
          <TituloDoCartao className="mb-2">1. Baixe o modelo</TituloDoCartao>
          <p className="mt-0 mb-4 font-corpo text-corpo text-texto">
            O cabeçalho precisa ser exatamente o do modelo. Formate a coluna
            de CPF como <strong>texto</strong> antes de digitar: como
            número, o Excel come o zero à esquerda.
          </p>
          <LinkBotao
            href="/palestras/admin/importar/modelo"
            variante="contorno"
            download
          >
            Baixar modelo colaboradores.csv
          </LinkBotao>
        </Cartao>

        <Cartao superficie="interna">
          <TituloDoCartao className="mb-2">2. Envie o arquivo preenchido</TituloDoCartao>
          <form action={acaoPrevia} className="mt-4">
            <Grupo
              rotulo="Arquivo CSV"
              htmlFor="arquivo"
              obrigatorio
              ajuda="UTF-8, separado por vírgula, até 2 MB."
            >
              <Campo
                id="arquivo"
                name="arquivo"
                type="file"
                accept=".csv,text/csv"
                required
                className="py-2"
              />
            </Grupo>
            <BotaoEnviar rotulo="Pré-visualizar" rotuloPendente="Analisando..." />
          </form>
        </Cartao>
      </div>
    </div>
  );
}
