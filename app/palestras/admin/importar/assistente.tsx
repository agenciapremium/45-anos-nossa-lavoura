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
import {
  confirmarImportacao,
  previsualizar,
  type Contagens,
  type EstadoDaImportacao,
} from './acoes';
import { ESTADO_INICIAL } from './estado';

function BotaoEnviar({ rotulo, rotuloPendente }: { rotulo: string; rotuloPendente: string }) {
  const { pending } = useFormStatus();
  return (
    <Botao type="submit" tamanho="lg" disabled={pending}>
      {pending ? rotuloPendente : rotulo}
    </Botao>
  );
}

function Numero({
  valor,
  rotulo,
  tom = 'neutro',
}: {
  valor: number;
  rotulo: string;
  tom?: 'neutro' | 'positivo' | 'atencao' | 'negativo';
}) {
  const cores = {
    neutro: 'text-terra-700',
    positivo: 'text-sucesso',
    atencao: 'text-atencao',
    negativo: 'text-perigo',
  } as const;
  return (
    <div className="rounded-cartao border-2 border-linha bg-cartao p-4 text-center">
      <b
        className={`block font-titulo text-t1 font-bold tabular-nums ${cores[tom]}`}
      >
        {valor}
      </b>
      <span className="block font-corpo text-corpo-sm text-texto-suave">
        {rotulo}
      </span>
    </div>
  );
}

function Resumo({ contagens }: { contagens: Contagens }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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

function ListaDeErros({ estado }: { estado: EstadoDaImportacao }) {
  const erros = estado.erros ?? [];
  if (erros.length === 0) return null;

  return (
    <section className="mt-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 className="m-0 font-titulo text-t3 font-bold text-texto-forte">
          Linhas recusadas ({erros.length})
        </h3>
        {/*
          O relatório é montado no navegador a partir dos erros que já estão
          na tela — não precisa voltar ao servidor nem reenviar o CSV.
        */}
        <Botao variante="contorno" tamanho="sm" onClick={() => baixarRelatorio(erros)}>
          Baixar relatório de erros (CSV)
        </Botao>
      </div>
      <Tabela>
        <Cabecalho>
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
              <Celula className="font-mono text-corpo-sm">
                {e.campo ?? '—'}
              </Celula>
              <Celula>{e.motivo}</Celula>
              <Celula className="max-w-[28ch] truncate font-mono text-corpo-sm text-texto-suave">
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
    </section>
  );
}

function baixarRelatorio(
  erros: NonNullable<EstadoDaImportacao['erros']>,
): void {
  const escapar = (v: string) =>
    /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  const csv = [
    'linha,campo,motivo,conteudo_original',
    ...erros.map((e) =>
      [String(e.linha), e.campo ?? '', e.motivo, e.original]
        .map(escapar)
        .join(','),
    ),
  ].join('\n');

  // BOM para o Excel abrir em UTF-8 sem transformar acento em caractere solto.
  const blob = new Blob([`﻿${csv}`], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'erros-da-importacao.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function AssistenteDeImportacao() {
  const [previa, acaoPrevia] = useActionState(previsualizar, ESTADO_INICIAL);
  const [confirmacao, acaoConfirmar] = useActionState(
    confirmarImportacao,
    ESTADO_INICIAL,
  );
  const [somenteValidas, setSomenteValidas] = useState(false);

  const estado =
    confirmacao.etapa !== 'inicial' ? confirmacao : previa;

  /* ---------- concluída ---------- */
  if (confirmacao.etapa === 'confirmada' && confirmacao.contagens) {
    return (
      <>
        <Aviso tom="sucesso" titulo="Importação concluída" className="mb-6">
          <p>{confirmacao.mensagem}</p>
        </Aviso>
        <Resumo contagens={confirmacao.contagens} />
        <ListaDeErros estado={confirmacao} />
        <div className="mt-6 flex flex-wrap gap-3">
          <LinkBotao href="/palestras/admin/organizacao">
            Ver a estrutura
          </LinkBotao>
          <LinkBotao href="/palestras/admin/importar" variante="texto">
            Importar outro arquivo
          </LinkBotao>
        </div>
      </>
    );
  }

  /* ---------- pré-visualização ---------- */
  if (previa.etapa === 'previa' && previa.contagens) {
    const temErros = previa.contagens.erros > 0;
    const podeConfirmar = !temErros || somenteValidas;

    return (
      <>
        {confirmacao.etapa === 'falha' && confirmacao.mensagem ? (
          <Aviso tom="erro" className="mb-6">
            <p>{confirmacao.mensagem}</p>
          </Aviso>
        ) : null}

        <Aviso tom="informacao" titulo="Nada foi gravado ainda" className="mb-6">
          <p>
            Esta é a pré-visualização de <strong>{previa.arquivoNome}</strong>.
            Confira os números e confirme para gravar.
          </p>
        </Aviso>

        <Resumo contagens={previa.contagens} />

        {previa.amostra?.length ? (
          <section className="mt-6">
            <h3 className="mb-3 font-titulo text-t3 font-bold text-texto-forte">
              Amostra do que vai ser gravado
            </h3>
            <Tabela>
              <Cabecalho>
                <tr>
                  <CelulaDeTitulo>Linha</CelulaDeTitulo>
                  <CelulaDeTitulo>Nome</CelulaDeTitulo>
                  <CelulaDeTitulo>CPF</CelulaDeTitulo>
                  <CelulaDeTitulo>Papel</CelulaDeTitulo>
                  <CelulaDeTitulo>Loja</CelulaDeTitulo>
                  <CelulaDeTitulo>Regional</CelulaDeTitulo>
                  <CelulaDeTitulo>Situação</CelulaDeTitulo>
                </tr>
              </Cabecalho>
              <tbody>
                {previa.amostra.map((a) => (
                  <tr key={a.linha}>
                    <Celula className="tabular-nums">{a.linha}</Celula>
                    <Celula className="font-bold">{a.nome}</Celula>
                    <Celula className="font-mono">{formatarCpf(a.cpf)}</Celula>
                    <Celula>{a.papel}</Celula>
                    <Celula className="text-corpo-sm">{a.loja}</Celula>
                    <Celula className="text-corpo-sm">{a.regional}</Celula>
                    <Celula>
                      <Selo tom={a.situacao === 'novo' ? 'positivo' : 'neutro'}>
                        {a.situacao}
                      </Selo>
                    </Celula>
                  </tr>
                ))}
              </tbody>
            </Tabela>
          </section>
        ) : null}

        <ListaDeErros estado={previa} />

        <form action={acaoConfirmar} className="mt-8">
          <input type="hidden" name="conteudo" value={previa.conteudo ?? ''} />
          <input
            type="hidden"
            name="arquivoNome"
            value={previa.arquivoNome ?? ''}
          />
          <input
            type="hidden"
            name="somenteValidas"
            value={somenteValidas ? 'sim' : 'nao'}
          />

          {temErros ? (
            <label className="mb-4 flex items-start gap-2 font-corpo text-corpo">
              <input
                type="checkbox"
                checked={somenteValidas}
                onChange={(e) => setSomenteValidas(e.target.checked)}
                className="mt-1 size-5 accent-lima-500"
              />
              <span>
                Importar apenas as {previa.contagens.total - previa.contagens.erros}{' '}
                linha(s) válida(s). As {previa.contagens.erros} com erro são
                ignoradas e continuam no relatório.
              </span>
            </label>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Botao type="submit" tamanho="lg" disabled={!podeConfirmar}>
              Confirmar importação
            </Botao>
            <LinkBotao href="/palestras/admin/importar" variante="texto">
              Escolher outro arquivo
            </LinkBotao>
          </div>
          {!podeConfirmar ? (
            <p className="mt-2 font-corpo text-corpo-sm text-perigo">
              Há linhas com erro. Corrija a planilha ou marque a opção acima.
            </p>
          ) : null}
        </form>
      </>
    );
  }

  /* ---------- envio ---------- */
  return (
    <>
      {estado.etapa === 'falha' && estado.mensagem ? (
        <Aviso tom="erro" titulo="Arquivo recusado" className="mb-6">
          <p>{estado.mensagem}</p>
        </Aviso>
      ) : null}

      <ListaDeErros estado={estado} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Cartao>
          <TituloDoCartao>1. Baixe o modelo</TituloDoCartao>
          <p className="mt-2 mb-4 font-corpo text-corpo text-texto">
            O cabeçalho precisa ser exatamente o do modelo. Formate a coluna de
            CPF como <strong>texto</strong> antes de digitar: como número, o
            Excel come o zero à esquerda.
          </p>
          <LinkBotao
            href="/palestras/admin/importar/modelo"
            variante="contorno"
            download
          >
            Baixar modelo colaboradores.csv
          </LinkBotao>
        </Cartao>

        <Cartao>
          <TituloDoCartao>2. Envie o arquivo preenchido</TituloDoCartao>
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
            <BotaoEnviar
              rotulo="Pré-visualizar"
              rotuloPendente="Analisando…"
            />
          </form>
        </Cartao>
      </div>
    </>
  );
}
