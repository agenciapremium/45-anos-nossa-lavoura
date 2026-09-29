'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import {
  Aviso,
  Botao,
  Campo,
  Cartao,
  Grupo,
  Selecao,
  TituloDoCartao,
} from '@/components/ui';
import { ROTULO_AVULSO_PADRAO } from '@/lib/palestras/origem';
import { esquemaDeQuantidade, esquemaDeRotulo } from '@/lib/palestras/validacao';
import { gerarAvulso } from './acoes';
import { ESTADO_AVULSO_INICIAL } from './estado';
import type { PalestraDisponivel } from './formulario';

/* =========================================================
   Modo avulso da tela de gerar convites (tarefas 4.1 e 4.2)

   Mesma casca, mesmo resumo escuro à direita e mesmo botão do modo por
   colaborador: o que muda é que não existe tabela de pessoas. O Admin
   informa a palestra, a quantidade e (se quiser) um rótulo, e o lote nasce
   sem vínculo nenhum.

   As duas validações do cliente são as MESMAS do servidor
   (`esquemaDeQuantidade` e `esquemaDeRotulo`, de `lib/palestras/validacao`),
   importadas, não reescritas: aqui elas só adiantam o aviso: a Server
   Action valida de novo, e é ela quem decide.
   ========================================================= */

function BotaoGerar({ quantidade, invalido }: { quantidade: number; invalido: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Botao
      type="submit"
      tamanho="lg"
      variante="primario"
      className="w-full"
      disabled={pending || invalido || quantidade <= 0}
      aria-busy={pending}
    >
      {pending
        ? 'Gerando...'
        : invalido
          ? 'Corrija a quantidade'
          : quantidade <= 0
            ? 'Informe a quantidade'
            : `Gerar ${quantidade} convite${quantidade === 1 ? '' : 's'}`}
    </Botao>
  );
}

function erroDeQuantidade(texto: string): string | null {
  const bruto = texto.trim();
  if (!bruto) return null;
  const analise = esquemaDeQuantidade.safeParse(Number(bruto));
  return analise.success ? null : (analise.error.issues[0]?.message ?? 'Quantidade inválida.');
}

function erroDeRotulo(texto: string): string | null {
  const analise = esquemaDeRotulo.safeParse(texto);
  return analise.success ? null : (analise.error.issues[0]?.message ?? 'Rótulo inválido.');
}

export function FormularioAvulso({
  palestras,
  palestraPadraoId,
}: {
  palestras: PalestraDisponivel[];
  /** A palestra do contexto da barra de topo, quando ela ainda aceita convites. */
  palestraPadraoId: string | null;
}) {
  const [estado, acao] = useActionState(gerarAvulso, ESTADO_AVULSO_INICIAL);

  const [eventoId, setEventoId] = useState(palestraPadraoId ?? '');
  const [quantidade, setQuantidade] = useState('');
  const [rotulo, setRotulo] = useState('');

  const palestraEscolhida = palestras.find((p) => p.id === eventoId) ?? null;
  const erroQuantidade = estado.erros?.quantidade ?? erroDeQuantidade(quantidade);
  const erroRotulo = estado.erros?.rotulo ?? erroDeRotulo(rotulo);
  const numero = Number(quantidade.trim());
  const total = Number.isFinite(numero) && numero > 0 ? numero : 0;

  return (
    <form action={acao} className="grid items-start gap-5 lg:grid-cols-[1fr_340px]">
      <div className="flex min-w-0 flex-col gap-4">
        {estado.mensagem ? (
          <Aviso tom="erro">
            <p>{estado.mensagem}</p>
          </Aviso>
        ) : null}

        <Cartao superficie="interna">
          <div className="flex flex-wrap items-start gap-4">
            <Grupo rotulo="Palestra" htmlFor="avulso-palestra" obrigatorio className="mb-0 w-64">
              <Selecao
                id="avulso-palestra"
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

            <Grupo
              rotulo="Quantos convites"
              htmlFor="avulso-quantidade"
              obrigatorio
              erro={erroQuantidade ?? undefined}
              className="mb-0 w-40"
            >
              <Campo
                id="avulso-quantidade"
                name="quantidade"
                type="number"
                min={1}
                step={1}
                required
                inputMode="numeric"
                placeholder="20"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                aria-invalid={Boolean(erroQuantidade)}
              />
            </Grupo>

            <Grupo
              rotulo="Rótulo do lote"
              htmlFor="avulso-rotulo"
              erro={erroRotulo ?? undefined}
              ajuda={
                <>
                  Opcional, até 80 caracteres. É o que aparece no lugar do colaborador na lista de
                  convites e na lista da porta. Sem rótulo, esses lugares mostram
                  &quot;{ROTULO_AVULSO_PADRAO}&quot;.
                </>
              }
              className="mb-0 min-w-0 flex-1"
            >
              <Campo
                id="avulso-rotulo"
                name="rotulo"
                type="text"
                maxLength={80}
                placeholder="Imprensa, Patrocinador Virbac, Convidados do Grupo..."
                value={rotulo}
                onChange={(e) => setRotulo(e.target.value)}
                aria-invalid={Boolean(erroRotulo)}
              />
            </Grupo>
          </div>
        </Cartao>

        <Cartao superficie="interna">
          <TituloDoCartao className="mb-2">O que o convite avulso não tem</TituloDoCartao>
          <ul className="m-0 list-disc pl-5 font-corpo text-corpo text-texto">
            <li>
              <strong>Sem envio por WhatsApp.</strong> A mensagem do sistema é assinada pelo
              colaborador que envia, e aqui não há remetente: o Admin copia o link e manda pelo
              canal que quiser.
            </li>
            <li>
              <strong>Sem anotação de &quot;enviado para&quot;.</strong> Esse lembrete é do
              colaborador, para ele lembrar a quem deu cada convite.
            </li>
            <li>
              <strong>Fora dos recortes por regional, loja e colaborador.</strong> Ele não tem
              nenhum dos três, e entrar num deles falsearia o desempenho de quem está na conta.
              Entra no total da palestra, no funil e na série diária, e aparece como linha
              &quot;Avulsos&quot; nas métricas.
            </li>
            <li>
              <strong>Só o Admin enxerga.</strong> Colaborador, gerentes e recepção não o veem em
              lista, contagem, exportação nem detalhe.
            </li>
          </ul>
        </Cartao>
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
              <dt className="font-corpo text-corpo-sm text-texto-inverso-suave">Origem</dt>
              <dd className="m-0 mt-0.5 font-corpo text-corpo-lg font-bold text-texto-inverso">
                Administração
                <span className="block font-corpo text-corpo-sm font-normal text-texto-inverso-suave">
                  {rotulo.trim() || ROTULO_AVULSO_PADRAO}
                </span>
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
            <BotaoGerar
              quantidade={total}
              invalido={Boolean(erroQuantidade) || Boolean(erroRotulo)}
            />
          </div>
          <p className="m-0 mt-3 font-corpo text-corpo-sm text-texto-inverso-suave">
            Depois de gerar, a próxima tela traz os{' '}
            <strong className="text-texto-inverso">links para copiar</strong>, o PDF e o CSV do
            lote.
          </p>
        </div>

        {palestraEscolhida?.prazoVenceHoje ? (
          <Aviso tom="atencao">
            <p>
              <strong>
                O prazo desta palestra vence hoje às {palestraEscolhida.prazoFormatado}.
              </strong>{' '}
              Convite gerado depois do prazo nasce já expirado. Se for gerar, distribua hoje.
            </p>
          </Aviso>
        ) : null}
      </div>
    </form>
  );
}
