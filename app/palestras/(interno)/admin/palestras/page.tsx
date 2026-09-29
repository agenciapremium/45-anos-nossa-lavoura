import type { Metadata } from 'next';
import Link from 'next/link';

import { CabecalhoDeTela } from '@/components/palestras/cabecalho-de-tela';
import {
  Aviso,
  Cabecalho,
  Cartao,
  Celula,
  CelulaDeTitulo,
  LinkBotao,
  Selo,
  Tabela,
  TituloDoCartao,
  Vazio,
} from '@/components/ui';
import { convitesPorPalestra, listarPalestras } from '@/lib/palestras/consultas';
import { exigirPapel } from '@/lib/palestras/sessao';
import {
  agora,
  formatarCarimbo,
  formatarDataHora,
  mesmoDiaCivil,
  venceu,
} from '@/lib/tempo';
import { AcoesDaPalestra } from './acoes-de-linha';

export const metadata: Metadata = { title: 'Palestras' };
export const dynamic = 'force-dynamic';

type TomDeSelo = 'neutro' | 'positivo' | 'atencao' | 'negativo' | 'acento';

/* =========================================================
   /palestras/admin/palestras (tarefa 5.1)

   Lista de cadastro do Admin, com situação (calculada a partir da data da
   palestra), prazo de confirmação (com a marca de "manual" quando o Admin
   ajustou à mão) e o total de convites já gerados por linha. Nenhuma regra
   de domínio muda aqui: `listarPalestras`, `convitesPorPalestra` e as
   Server Actions de `acoes.ts`/`acoes-de-linha.tsx` continuam exatamente
   como estavam, esta tela só reorganiza a apresentação.
   ========================================================= */

function situacaoDaPalestra(
  palestra: { dataHora: Date; ativo: boolean },
  referencia: Date,
): { rotulo: string; tom: TomDeSelo } {
  if (!palestra.ativo) return { rotulo: 'Desativada', tom: 'neutro' };
  if (palestra.dataHora.getTime() < referencia.getTime()) {
    return { rotulo: 'Realizada', tom: 'neutro' };
  }
  if (mesmoDiaCivil(palestra.dataHora, referencia)) {
    return { rotulo: 'Hoje', tom: 'acento' };
  }
  return { rotulo: 'Aberta', tom: 'positivo' };
}

function chipsDoPrazo(
  palestra: { prazoConfirmacao: Date; prazoAjustadoManualmente: boolean },
  referencia: Date,
): { rotulo: string; tom: TomDeSelo }[] {
  const chips: { rotulo: string; tom: TomDeSelo }[] = [];
  if (palestra.prazoAjustadoManualmente) {
    chips.push({ rotulo: 'manual', tom: 'atencao' });
  }
  if (venceu(palestra.prazoConfirmacao, referencia)) {
    chips.push({ rotulo: 'encerrado', tom: 'neutro' });
  } else if (mesmoDiaCivil(palestra.prazoConfirmacao, referencia)) {
    chips.push({ rotulo: 'vence hoje', tom: 'atencao' });
  }
  return chips;
}

export default async function ListaDePalestras() {
  const { escopo } = await exigirPapel(['admin']);

  const [palestras, convites] = await Promise.all([
    listarPalestras(),
    convitesPorPalestra(escopo),
  ]);

  const referencia = agora();

  return (
    <>
      <CabecalhoDeTela
        sobrancelha="Administração · cadastro"
        titulo="Palestras"
        acao={
          <LinkBotao href="/palestras/admin/palestras/nova" tamanho="sm">
            Nova palestra
          </LinkBotao>
        }
      />

      <p className="mt-0 mb-6 max-w-prosa font-corpo text-corpo-lg text-texto">
        Nada é fixo no código: o que aparece na página pública do circuito, na
        mensagem de WhatsApp e no ingresso sai daqui. Desativar preserva o
        histórico, não existe exclusão quando já há convite gerado.
      </p>

      {palestras.length === 0 ? (
        <Vazio titulo="Nenhuma palestra cadastrada.">
          <p>
            Comece pelas quatro do circuito: Vilhena, Espigão d’Oeste,
            Ji-Paraná e Porto Velho.
          </p>
        </Vazio>
      ) : (
        <Tabela superficie="interna">
          <Cabecalho superficie="interna">
            <tr>
              <CelulaDeTitulo>Cidade</CelulaDeTitulo>
              <CelulaDeTitulo>Data e hora</CelulaDeTitulo>
              <CelulaDeTitulo>Prazo de confirmação</CelulaDeTitulo>
              <CelulaDeTitulo>Local</CelulaDeTitulo>
              <CelulaDeTitulo className="text-right">Convites</CelulaDeTitulo>
              <CelulaDeTitulo>Situação</CelulaDeTitulo>
              <CelulaDeTitulo>
                <span className="sr-only">Ações</span>
              </CelulaDeTitulo>
            </tr>
          </Cabecalho>
          <tbody>
            {palestras.map((p) => {
              const total = convites.get(p.id) ?? 0;
              const situacao = situacaoDaPalestra(p, referencia);
              const chips = chipsDoPrazo(p, referencia);
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
                    {chips.length > 0 ? (
                      <span className="mt-1 flex flex-wrap gap-1">
                        {chips.map((chip) => (
                          <Selo key={chip.rotulo} tom={chip.tom}>
                            {chip.rotulo}
                          </Selo>
                        ))}
                      </span>
                    ) : null}
                  </Celula>
                  <Celula>
                    <span className="font-bold text-texto-forte">
                      {p.localNome}
                    </span>
                    <span className="block text-corpo-sm text-texto-suave">
                      {p.localEndereco}
                    </span>
                  </Celula>
                  <Celula className="text-right font-bold tabular-nums text-texto-forte">
                    {total}
                  </Celula>
                  <Celula>
                    <Selo tom={situacao.tom}>{situacao.rotulo}</Selo>
                  </Celula>
                  <Celula className="text-right">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <LinkBotao
                        href={`/palestras/admin/palestras/${p.id}`}
                        variante="contorno"
                        tamanho="sm"
                      >
                        Editar
                      </LinkBotao>
                      <AcoesDaPalestra
                        id={p.id}
                        ativo={p.ativo}
                        temConvites={total > 0}
                      />
                    </div>
                  </Celula>
                </tr>
              );
            })}
          </tbody>
        </Tabela>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Cartao superficie="interna">
          <TituloDoCartao className="mb-2">O prazo se ajusta sozinho</TituloDoCartao>
          <p className="m-0 font-corpo text-corpo text-texto">
            Ao mudar a data da palestra, o prazo de confirmação acompanha, a
            menos que você já tenha ajustado o prazo à mão: nesse caso a linha
            ganha o selo <strong className="text-texto-forte">manual</strong>.
          </p>
        </Cartao>
        <Cartao superficie="interna">
          <TituloDoCartao className="mb-2">Desativar, nunca excluir</TituloDoCartao>
          <p className="m-0 font-corpo text-corpo text-texto">
            Uma palestra com convites gerados não pode ser excluída. Desativada,
            ela sai da página pública e das listas, e os convites existentes
            seguem válidos.
          </p>
        </Cartao>
        <Aviso tom="informacao">
          <p>
            <strong>Mensagem de WhatsApp:</strong> cada palestra tem a sua, com
            cidade, data, horário, local e prazo preenchidos automaticamente. É
            o texto que o colaborador envia.
          </p>
        </Aviso>
      </div>
    </>
  );
}
