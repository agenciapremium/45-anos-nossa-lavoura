'use client';

import { useState, useTransition } from 'react';

import { Botao, Campo, Grupo } from '@/components/ui';
import { mascaraProgressiva, somenteDigitos } from '@/lib/palestras/cpf';
import type { ConfirmadoParaRecepcao } from '@/lib/palestras/dados';

import { buscarPorCpf, buscarPorNome } from './acoes';

/* =========================================================
   Busca manual (D1 do design)

   Não é um recurso escondido de contingência: fica na mesma tela do
   leitor, a um toque. Um campo só, que decide sozinho se o que foi
   digitado é CPF ou nome — quem está na porta não escolhe um "modo de
   busca", só digita o que tem em mãos.

   Mostra apenas titular, acompanhante e CPF mascarado (spec "dados
   mostrados na busca") — o mesmo tipo restrito que a recepção já usa em
   `lib/palestras/dados.ts`.
   ========================================================= */

type ResultadoDaBusca = ConfirmadoParaRecepcao[] | 'cpf-nao-encontrado' | null;

function pareceCpfEmDigitacao(valor: string): boolean {
  return /^[\d.\-\s]*$/.test(valor);
}

export function BuscaManual({
  eventoId,
  ocupado,
  onConfirmar,
}: {
  eventoId: string;
  ocupado: boolean;
  onConfirmar: (conviteId: string) => void;
}) {
  const [termo, setTermo] = useState('');
  const [resultados, setResultados] = useState<ResultadoDaBusca>(null);
  const [buscando, iniciarBusca] = useTransition();

  function buscar() {
    const valor = termo.trim();
    if (!valor) return;
    const digitos = somenteDigitos(valor);

    iniciarBusca(async () => {
      if (digitos.length === 11) {
        const r = await buscarPorCpf(eventoId, digitos);
        setResultados(r ? [r] : 'cpf-nao-encontrado');
      } else {
        const r = await buscarPorNome(eventoId, valor);
        setResultados(r);
      }
    });
  }

  return (
    <div className="rounded-cartao border-2 border-terra-700 bg-cartao p-5">
      <Grupo
        rotulo="CPF ou nome do titular"
        htmlFor="busca-checkin"
        ajuda="CPF completo (11 dígitos) ou parte do nome. Toque em Buscar."
      >
        <div className="flex gap-2">
          <Campo
            id="busca-checkin"
            value={termo}
            onChange={(e) => {
              const v = e.target.value;
              setTermo(pareceCpfEmDigitacao(v) ? mascaraProgressiva(v) : v);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                buscar();
              }
            }}
            placeholder="000.000.000-00 ou nome"
            autoComplete="off"
          />
          <Botao
            type="button"
            onClick={buscar}
            disabled={buscando || ocupado || !termo.trim()}
            className="shrink-0"
          >
            {buscando ? 'Buscando…' : 'Buscar'}
          </Botao>
        </div>
      </Grupo>

      {resultados === 'cpf-nao-encontrado' && (
        <p className="m-0 font-corpo text-corpo font-bold text-perigo">
          Nenhum confirmado com este CPF, nesta palestra.
        </p>
      )}
      {Array.isArray(resultados) && resultados.length === 0 && (
        <p className="m-0 font-corpo text-corpo text-texto-suave">
          Nenhum confirmado encontrado com esse nome, nesta palestra.
        </p>
      )}
      {Array.isArray(resultados) && resultados.length > 0 && (
        <ul className="m-0 mt-4 flex list-none flex-col gap-3 p-0">
          {resultados.map((r) => (
            <li
              key={r.conviteId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-controle border-2 border-linha p-3"
            >
              <div className="min-w-0">
                <p className="m-0 font-corpo text-corpo-lg font-bold text-texto-forte">
                  {r.titular}
                </p>
                <p className="m-0 font-corpo text-corpo-sm text-texto-suave">
                  {r.acompanhante ? `Acompanhante: ${r.acompanhante} · ` : 'Sem acompanhante · '}
                  CPF {r.cpf}
                </p>
              </div>
              <Botao
                type="button"
                tamanho="sm"
                disabled={ocupado}
                onClick={() => onConfirmar(r.conviteId)}
              >
                Confirmar entrada
              </Botao>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
