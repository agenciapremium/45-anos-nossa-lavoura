import type { Metadata } from 'next';
import Link from 'next/link';

import {
  Cabecalho,
  Celula,
  CelulaDeTitulo,
  LinkBotao,
  Selo,
  Sobrancelha,
  Tabela,
  Titulo,
  Vazio,
} from '@/components/ui';
import { convitesPorPalestra, listarPalestras } from '@/lib/palestras/consultas';
import { exigirPapel } from '@/lib/palestras/sessao';
import { formatarCarimbo, formatarDataHora, venceu } from '@/lib/tempo';
import { AcoesDaPalestra } from './acoes-de-linha';

export const metadata: Metadata = { title: 'Palestras' };

export default async function ListaDePalestras() {
  const { escopo } = await exigirPapel(['admin']);

  const [palestras, convites] = await Promise.all([
    listarPalestras(),
    convitesPorPalestra(escopo),
  ]);

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Sobrancelha>Cadastro</Sobrancelha>
          <Titulo>Palestras</Titulo>
          <p className="mt-2 max-w-prosa font-corpo text-corpo-lg text-texto">
            Nenhuma palestra é fixa no código: tudo que aparece em{' '}
            <code className="font-mono">/palestras</code> sai daqui.
          </p>
        </div>
        <LinkBotao href="/palestras/admin/palestras/nova">
          Nova palestra
        </LinkBotao>
      </div>

      {palestras.length === 0 ? (
        <Vazio titulo="Nenhuma palestra cadastrada.">
          <p>
            Comece pelas quatro do circuito: Vilhena, Espigão d’Oeste,
            Ji-Paraná e Porto Velho.
          </p>
        </Vazio>
      ) : (
        <Tabela>
          <Cabecalho>
            <tr>
              <CelulaDeTitulo>Cidade</CelulaDeTitulo>
              <CelulaDeTitulo>Data e hora</CelulaDeTitulo>
              <CelulaDeTitulo>Prazo de confirmação</CelulaDeTitulo>
              <CelulaDeTitulo>Local</CelulaDeTitulo>
              <CelulaDeTitulo>Convites</CelulaDeTitulo>
              <CelulaDeTitulo>Situação</CelulaDeTitulo>
              <CelulaDeTitulo>
                <span className="sr-only">Ações</span>
              </CelulaDeTitulo>
            </tr>
          </Cabecalho>
          <tbody>
            {palestras.map((p) => {
              const total = convites.get(p.id) ?? 0;
              const vencido = venceu(p.prazoConfirmacao);
              return (
                <tr key={p.id}>
                  <Celula>
                    <Link
                      href={`/palestras/admin/palestras/${p.id}`}
                      className="font-bold text-terra-700 underline underline-offset-4"
                    >
                      {p.cidade}
                    </Link>
                    <span className="block font-mono text-corpo-sm text-texto-suave">
                      {p.slug}
                    </span>
                  </Celula>
                  <Celula>{formatarDataHora(p.dataHora)}</Celula>
                  <Celula>
                    {formatarCarimbo(p.prazoConfirmacao)}
                    {p.prazoAjustadoManualmente ? (
                      <Selo tom="atencao" className="ml-2">
                        manual
                      </Selo>
                    ) : null}
                    {vencido ? (
                      <Selo tom="negativo" className="ml-2">
                        vencido
                      </Selo>
                    ) : null}
                  </Celula>
                  <Celula>
                    <span className="font-bold">{p.localNome}</span>
                    <span className="block text-corpo-sm text-texto-suave">
                      {p.localEndereco}
                    </span>
                  </Celula>
                  <Celula className="text-right tabular-nums">{total}</Celula>
                  <Celula>
                    <Selo tom={p.ativo ? 'positivo' : 'neutro'}>
                      {p.ativo ? 'ativa' : 'desativada'}
                    </Selo>
                  </Celula>
                  <Celula>
                    <AcoesDaPalestra
                      id={p.id}
                      ativo={p.ativo}
                      temConvites={total > 0}
                    />
                  </Celula>
                </tr>
              );
            })}
          </tbody>
        </Tabela>
      )}
    </>
  );
}
