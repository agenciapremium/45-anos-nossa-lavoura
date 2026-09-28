'use client';

import { useActionState, useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';

import {
  Aviso,
  Botao,
  Cabecalho,
  Campo,
  Celula,
  CelulaDeTitulo,
  Grupo,
  Selecao,
  Tabela,
  Vazio,
} from '@/components/ui';
import {
  gerarLotes,
} from './acoes';
import { ESTADO_INICIAL } from './estado';

export type PalestraDisponivel = {
  id: string;
  cidade: string;
  rotulo: string;
  prazoVencido: boolean;
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

function BotaoGerar({ total }: { total: number }) {
  const { pending } = useFormStatus();
  return (
    <Botao type="submit" tamanho="lg" disabled={pending || total === 0}>
      {pending
        ? 'Gerando…'
        : total === 0
          ? 'Informe as quantidades'
          : `Gerar ${total} convite(s)`}
    </Botao>
  );
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

  const [regionalId, setRegionalId] = useState('');
  const [lojaId, setLojaId] = useState('');
  const [quantidades, setQuantidades] = useState<Record<string, string>>({});
  const [emMassa, setEmMassa] = useState('');

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

  const selecionados = Object.values(quantidades).filter(
    (v) => Number(v) > 0,
  ).length;

  return (
    <form action={acao}>
      {estado.mensagem ? (
        <Aviso tom={estado.ok ? 'sucesso' : 'erro'} className="mb-6">
          <p>{estado.mensagem}</p>
          {estado.ok && estado.resumo ? (
            <p>
              Palestra de {estado.resumo.palestra} ·{' '}
              {estado.resumo.convites} convite(s) para{' '}
              {estado.resumo.colaboradores} colaborador(es) em{' '}
              {estado.resumo.duracaoMs} ms.
            </p>
          ) : null}
        </Aviso>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Grupo rotulo="Palestra" htmlFor="eventoId" obrigatorio>
          <Selecao id="eventoId" name="eventoId" required defaultValue="">
            <option value="" disabled>
              Escolha a palestra
            </option>
            {palestras.map((p) => (
              <option key={p.id} value={p.id} disabled={p.prazoVencido}>
                {p.rotulo}
                {p.prazoVencido ? ' — prazo vencido' : ''}
              </option>
            ))}
          </Selecao>
        </Grupo>

        <Grupo rotulo="Regional" htmlFor="filtro-regional">
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

        <Grupo rotulo="Loja" htmlFor="filtro-loja">
          <Selecao
            id="filtro-loja"
            value={lojaId}
            onChange={(e) => setLojaId(e.target.value)}
          >
            <option value="">Todas</option>
            {lojasDoFiltro.map((l) => (
              <option key={l.id} value={l.id}>
                {l.codigo} · {l.nome}
              </option>
            ))}
          </Selecao>
        </Grupo>
      </div>

      {/* Aplicar a mesma quantidade a todos os visíveis é o caso comum:
          "10 convites para cada colaborador desta loja". */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-40">
          <Grupo rotulo="Aplicar a todos" htmlFor="em-massa" className="mb-0">
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
        </div>
        <Botao
          variante="contorno"
          onClick={() => {
            const proximo = { ...quantidades };
            for (const c of visiveis) proximo[c.id] = emMassa;
            setQuantidades(proximo);
          }}
        >
          Aplicar aos {visiveis.length} visíveis
        </Botao>
        <Botao variante="texto" onClick={() => setQuantidades({})}>
          Limpar tudo
        </Botao>
        <p className="ml-auto m-0 font-corpo text-corpo text-texto-suave">
          {selecionados} colaborador(es) · <strong>{total}</strong> convite(s)
        </p>
      </div>

      {visiveis.length === 0 ? (
        <Vazio titulo="Nenhum colaborador neste filtro.">
          <p>
            Só entram aqui usuários <strong>ativos</strong> com papel{' '}
            <code className="font-mono">colaborador</code> e loja vinculada.
          </p>
        </Vazio>
      ) : (
        <Tabela>
          <Cabecalho>
            <tr>
              <CelulaDeTitulo>Colaborador</CelulaDeTitulo>
              <CelulaDeTitulo>Loja</CelulaDeTitulo>
              <CelulaDeTitulo>Regional</CelulaDeTitulo>
              <CelulaDeTitulo>Já tem</CelulaDeTitulo>
              <CelulaDeTitulo>Novos convites</CelulaDeTitulo>
            </tr>
          </Cabecalho>
          <tbody>
            {visiveis.map((c) => {
              const erro = estado.errosPorColaborador?.[c.id];
              return (
                <tr key={c.id} className={erro ? 'bg-perigo-suave' : undefined}>
                  <Celula className="font-bold">{c.nome}</Celula>
                  <Celula className="text-corpo-sm">
                    {c.lojaCodigo} · {c.lojaNome}
                  </Celula>
                  <Celula className="text-corpo-sm">{c.regionalNome}</Celula>
                  <Celula className="tabular-nums">{c.jaTem}</Celula>
                  <Celula>
                    <Campo
                      name={`quantidade:${c.id}`}
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      className="w-28"
                      value={quantidades[c.id] ?? ''}
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
                </tr>
              );
            })}
          </tbody>
        </Tabela>
      )}

      <div className="mt-6">
        <BotaoGerar total={total} />
        <p className="mt-2 max-w-prosa font-corpo text-corpo-sm text-texto-suave">
          Novos convites são <strong>somados</strong> aos que o colaborador já
          tem: nada é substituído nem invalidado.
        </p>
      </div>
    </form>
  );
}
