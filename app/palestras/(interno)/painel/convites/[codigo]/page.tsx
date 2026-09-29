import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CabecalhoDeTela } from '@/components/palestras/cabecalho-de-tela';
import {
  Cartao,
  LinhaDoTempo,
  LinkBotao,
  Selo,
  TituloDoCartao,
  type PassoDaLinhaDoTempo,
} from '@/components/ui';
import { ACOES } from '@/lib/palestras/auditoria';
import {
  confirmacoesNoEscopo,
  conviteNoEscopo,
  linhaDoTempoDoConvite,
  type EventoDoConvite,
} from '@/lib/palestras/dados';
import { normalizarCodigo, pareceCodigo } from '@/lib/palestras/codigo';
import { permitido } from '@/lib/palestras/escopo';
import { exigirEscopo } from '@/lib/palestras/sessao';
import { formatarCarimbo, formatarData, formatarDataHora, formatarHorario } from '@/lib/tempo';
import { CancelamentoDoDetalhe } from './cancelamento';
import { ROTULO_DO_ESTADO } from '../linha';

export const metadata: Metadata = { title: 'Convite confirmado' };
export const dynamic = 'force-dynamic';

/** Rótulo legível de cada ação de auditoria que pode aparecer na linha do tempo de um convite. */
const ROTULO_DO_EVENTO: Record<string, string> = {
  [ACOES.checkinRegistrado]: 'Entrada registrada na porta',
  [ACOES.presencaConfirmada]: 'Presença confirmada pelo convidado',
  [ACOES.enviadoParaDefinido]: 'Anotado como enviado',
  [ACOES.canceladaPeloColaborador]: 'Convite cancelado pelo colaborador',
  [ACOES.canceladaPeloAdmin]: 'Convite cancelado pelo Admin',
  [ACOES.canceladaPeloConvidado]: 'Convite cancelado pelo convidado',
};

function descricaoDoEvento(ev: EventoDoConvite): string | undefined {
  const dados = (ev.dados ?? {}) as Record<string, unknown>;
  if (ev.acao === ACOES.presencaConfirmada) {
    const partes = ['com aceite da política de privacidade'];
    if (dados.comAcompanhante) partes.push('com acompanhante');
    if (dados.aceiteComunicacoes) partes.push('aceitou receber comunicações');
    return partes.join(' · ');
  }
  if (ev.acao === ACOES.enviadoParaDefinido) {
    return dados.preenchido ? 'anotação de envio preenchida' : 'anotação de envio removida';
  }
  if (ev.atorNome) return `por ${ev.atorNome}`;
  return undefined;
}

/**
 * Detalhe de um convite confirmado: titular, acompanhante, CPF mascarado e
 * a linha do tempo (tarefa 3.4).
 *
 * D2 do design: a busca já é `conviteNoEscopo`, nunca "por id e depois
 * confere se é seu". Fora do escopo, o mesmo 404 de um código inexistente.
 *
 * O CPF completo do convidado é regra de `verCpfCompleto` (D6 de
 * `painel-colaborador`, matriz de papéis): só o Admin o vê, aqui e em toda
 * outra tela. Esta página não altera essa regra.
 */
export default async function DetalheDoConvite({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const atual = await exigirEscopo();
  const { escopo } = atual;
  const { codigo: bruto } = await params;
  const codigo = normalizarCodigo(bruto);
  if (!pareceCodigo(codigo)) notFound();

  const convite = await conviteNoEscopo(escopo, { codigo });
  if (!convite) notFound();

  const [[confirmacao], eventosDeAuditoria] = await Promise.all([
    confirmacoesNoEscopo(escopo, { conviteId: convite.id }),
    linhaDoTempoDoConvite(escopo, convite.id),
  ]);

  const podeCancelar =
    (convite.estado === 'disponivel' || convite.estado === 'confirmado') &&
    permitido(escopo, 'cancelarConvite', { colaboradorId: convite.colaboradorId });

  const passos: PassoDaLinhaDoTempo[] = [];
  if (convite.estado === 'confirmado') {
    passos.push({
      titulo: 'Entrada registrada na porta',
      descricao: 'Aguardando: o convidado ainda não passou pelo check-in.',
      concluido: false,
    });
  }
  for (const ev of [...eventosDeAuditoria].reverse()) {
    passos.push({
      titulo: ROTULO_DO_EVENTO[ev.acao] ?? ev.acao,
      data: formatarCarimbo(ev.criadoEm),
      descricao: descricaoDoEvento(ev),
      concluido: true,
    });
  }
  passos.push({
    titulo: 'Convite gerado',
    data: formatarCarimbo(convite.criadoEm),
    concluido: true,
  });

  return (
    <>
      <CabecalhoDeTela
        sobrancelha="Painel · Convites"
        titulo={<>Convite <span className="font-mono">{convite.codigo}</span></>}
        extra={
          <Selo tom={convite.estado === 'presente' ? 'acento' : 'positivo'}>
            {convite.estado === 'presente' ? 'Presente' : 'Confirmado'}
          </Selo>
        }
        voltar={{ href: '/palestras/painel/convites', rotulo: 'Voltar para a lista de convites' }}
        acao={
          // Mesmo critério de `linha.tsx`/`menu-lateral.tsx`: só o Admin tem a
          // tela de auditoria; a proteção de verdade é o `exigirPapel(['admin'])`
          // da própria rota, isto é só cortesia de navegação.
          escopo.papel === 'admin' ? (
            <LinkBotao
              href={`/palestras/admin/auditoria?entidade=palestra_convite&entidadeId=${convite.id}`}
              variante="contorno"
              tamanho="sm"
            >
              Ver no rastro
            </LinkBotao>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Cartao superficie="interna">
            <TituloDoCartao>Quem vai entrar</TituloDoCartao>
            {!confirmacao ? (
              <p className="m-0 mt-4 font-corpo text-corpo text-texto">
                {convite.estado === 'disponivel'
                  ? 'Este convite ainda não foi confirmado por ninguém.'
                  : convite.estado === 'cancelado' || convite.estado === 'expirado'
                    ? `Este convite está ${ROTULO_DO_ESTADO[convite.estado].toLowerCase()} e não tem dados de convidado.`
                    : 'Os dados do convidado não foram encontrados. Se isso persistir, avise a administração.'}
              </p>
            ) : (
              <>
                <div className="mt-4 grid gap-5 sm:grid-cols-2">
                  <div>
                    <p className="m-0 font-corpo text-rotulo font-bold uppercase tracking-sobrancelha text-texto-suave">
                      Titular
                    </p>
                    <p className="mt-1 mb-0 font-titulo text-t3 font-bold text-texto-forte">
                      {confirmacao.titular}
                    </p>
                  </div>
                  <div>
                    <p className="m-0 font-corpo text-rotulo font-bold uppercase tracking-sobrancelha text-texto-suave">
                      Acompanhante
                    </p>
                    <p className="mt-1 mb-0 font-corpo text-corpo-lg text-texto">
                      {confirmacao.acompanhante ?? 'Sem acompanhante.'}
                    </p>
                  </div>
                  <div>
                    <p className="m-0 font-corpo text-rotulo font-bold uppercase tracking-sobrancelha text-texto-suave">
                      CPF
                    </p>
                    <p className="mt-1 mb-0 font-mono text-corpo-lg text-texto-forte">
                      {confirmacao.cpf}
                    </p>
                  </div>
                  <div>
                    <p className="m-0 font-corpo text-rotulo font-bold uppercase tracking-sobrancelha text-texto-suave">
                      Vale para
                    </p>
                    <p className="mt-1 mb-0 font-corpo text-corpo-lg text-texto">
                      {confirmacao.acompanhante ? '2 pessoas' : '1 pessoa'}
                    </p>
                  </div>
                </div>
                <p className="mt-5 mb-0 border-t border-linha pt-4 font-corpo text-corpo-sm text-texto-suave">
                  {confirmacao.cpfCompleto
                    ? 'O CPF completo aparece aqui porque o seu papel tem essa permissão (Admin). Telefone, cidade, propriedade e atividade ficam só na exportação em CSV.'
                    : 'O CPF aparece mascarado para o seu papel. Telefone, cidade, propriedade e atividade ficam só na exportação em CSV, que é de gerentes e do Admin.'}
                </p>
              </>
            )}
          </Cartao>

          <Cartao superficie="interna">
            <TituloDoCartao>Linha do tempo</TituloDoCartao>
            <div className="mt-4">
              <LinhaDoTempo passos={passos} />
            </div>
          </Cartao>
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-cartao border-0 bg-inverso-fundo p-5 text-texto-inverso">
            <p className="m-0 font-corpo text-rotulo font-bold uppercase tracking-sobrancelha text-lima-500">
              Palestra
            </p>
            <p className="mt-1 mb-0 font-titulo text-t3 font-bold text-texto-inverso">
              {convite.eventoCidade}
            </p>
            <p className="mt-1 mb-0 font-corpo text-corpo text-texto-inverso">
              {formatarData(convite.eventoDataHora)}, às {formatarHorario(convite.eventoDataHora)}
            </p>
            <p className="mt-3 mb-0 font-corpo text-corpo-sm font-bold text-texto-inverso">
              {convite.eventoLocalNome}
            </p>
            <p className="mt-3 mb-0 border-t border-linha-inversa pt-3 font-corpo text-corpo-sm text-texto-inverso-suave">
              Confirmações até {formatarDataHora(convite.eventoPrazo)}
            </p>
          </div>

          <Cartao superficie="interna">
            <p className="m-0 font-corpo text-rotulo font-bold uppercase tracking-sobrancelha text-texto-suave">
              Origem do convite
            </p>
            <p className="mt-2 mb-0 font-corpo text-corpo font-bold text-texto-forte">
              {convite.colaboradorNome}
            </p>
            <p className="m-0 font-corpo text-[10px] font-bold uppercase tracking-sobrancelha text-texto-suave">
              Colaborador
            </p>
            <dl className="mt-3 mb-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 font-corpo text-corpo-sm">
              <dt className="m-0 text-texto-suave">Loja</dt>
              <dd className="m-0 font-bold text-texto-forte">{convite.lojaNome ?? 'Sem loja'}</dd>
              <dt className="m-0 text-texto-suave">Código</dt>
              <dd className="m-0 font-mono text-texto">{convite.codigo}</dd>
            </dl>
          </Cartao>

          {podeCancelar ? (
            <CancelamentoDoDetalhe codigo={convite.codigo} estado={convite.estado} titular={confirmacao?.titular ?? null} />
          ) : null}
        </div>
      </div>
    </>
  );
}
