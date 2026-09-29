'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';

import {
  AreaDeTexto,
  Aviso,
  Botao,
  Campo,
  Cartao,
  Grupo,
  LinkBotao,
  TituloDoCartao,
} from '@/components/ui';
import {
  MARCADORES,
  MENSAGEM_PADRAO_WHATSAPP,
  montarMensagemDoConvite,
} from '@/lib/palestras/mensagem';
import { slugDePalestra } from '@/lib/palestras/slug';
import {
  deHoraLocal,
  formatarCarimbo,
  formatarData,
  formatarDataPorExtenso,
  formatarHorario,
} from '@/lib/tempo';
import { salvarPalestra, type EstadoDoFormulario } from './acoes';

export type ValoresDaPalestra = {
  id?: string;
  /** Só existe depois de criada (o slug sai da cidade mais a data, na criação). */
  slug?: string;
  cidade: string;
  dataHoraLocal: string;
  localNome: string;
  localEndereco: string;
  prazoLocal: string;
  prazoAjustadoManualmente: boolean;
  mensagemWhatsapp: string;
  ativo: boolean;
};

const INICIAL: EstadoDoFormulario = { ok: false };

function Salvar() {
  const { pending } = useFormStatus();
  return (
    <Botao type="submit" disabled={pending} tamanho="lg">
      {pending ? 'Salvando...' : 'Salvar palestra'}
    </Botao>
  );
}

/** Formata com respaldo: durante a digitação, a data pode estar incompleta. */
function tentar(fn: () => string, respaldo: string): string {
  try {
    return fn();
  } catch {
    return respaldo;
  }
}

/* =========================================================
   Formulário de palestra, com pré-visualização ao lado (tarefa 5.2)

   Nenhuma regra muda: o mesmo `salvarPalestra` de `acoes.ts`, a mesma
   validação Zod, o mesmo cálculo de prazo no servidor. As duas
   pré-visualizações (mensagem de WhatsApp e cartão público) são
   calculadas aqui, no cliente, com as MESMAS funções puras que o
   servidor usa para o texto real (`montarMensagemDoConvite`,
   `lib/tempo.ts`), só para ilustrar; o que é gravado é decidido no
   servidor, a partir do que o formulário envia.

   O prazo continua acompanhando a data da palestra enquanto o Admin não
   tocar nele (`tocado`/`prazoTocado`): a novidade é a caixa "Acompanhar a
   data da palestra", que troca o antigo botão de restaurar por um
   controle que mostra o estado atual (marcado = automático).
   ========================================================= */
export function FormularioDePalestra({
  valores,
  origemPublica,
}: {
  valores: ValoresDaPalestra;
  /** Só para ilustrar o link nas pré-visualizações; nunca é gravada. */
  origemPublica: string;
}) {
  const [estado, acao] = useActionState(salvarPalestra, INICIAL);

  const [cidade, setCidade] = useState(valores.cidade);
  const [dataHora, setDataHora] = useState(valores.dataHoraLocal);
  const [prazo, setPrazo] = useState(valores.prazoLocal);
  const [tocado, setTocado] = useState(valores.prazoAjustadoManualmente);
  const [localNome, setLocalNome] = useState(valores.localNome);
  const [localEndereco, setLocalEndereco] = useState(valores.localEndereco);
  const [mensagem, setMensagem] = useState(valores.mensagemWhatsapp);

  const areaRef = useRef<HTMLTextAreaElement>(null);

  // Enquanto o prazo não foi assumido pelo Admin, ele segue a data.
  useEffect(() => {
    if (tocado || !dataHora) return;
    setPrazo(vesperaAs2359(dataHora));
  }, [dataHora, tocado]);

  const erro = (campo: string) => estado.erros?.[campo] ?? null;

  function inserirMarcador(nome: string) {
    const area = areaRef.current;
    if (!area) {
      setMensagem((atual) => `${atual}{${nome}}`);
      return;
    }
    const inicio = area.selectionStart ?? area.value.length;
    const fim = area.selectionEnd ?? area.value.length;
    const novoValor = `${area.value.slice(0, inicio)}{${nome}}${area.value.slice(fim)}`;
    setMensagem(novoValor);
    const posicao = inicio + nome.length + 2;
    requestAnimationFrame(() => {
      area.focus();
      area.setSelectionRange(posicao, posicao);
    });
  }

  let dataValida = false;
  if (dataHora) {
    try {
      deHoraLocal(dataHora);
      dataValida = true;
    } catch {
      dataValida = false;
    }
  }
  const dataFormatada = dataValida
    ? tentar(() => formatarData(deHoraLocal(dataHora)), '[data]')
    : '[data]';
  const horarioFormatado = dataValida
    ? tentar(() => formatarHorario(deHoraLocal(dataHora)), '[horário]')
    : '[horário]';
  const dataPorExtenso = dataValida
    ? tentar(() => formatarDataPorExtenso(deHoraLocal(dataHora)), '')
    : '';
  const prazoFormatado = prazo
    ? tentar(() => formatarCarimbo(deHoraLocal(prazo)), '[prazo]')
    : '[prazo]';

  const slugPrevia =
    valores.slug ??
    slugDePalestra(
      cidade || 'palestra',
      dataFormatada.includes('/') ? dataFormatada : '00/00/0000',
    );

  const mensagemPreenchida = montarMensagemDoConvite({
    origem: origemPublica,
    codigo: 'PREVIA',
    mensagemTemplate: mensagem,
    cidade: cidade || '[cidade]',
    data: dataFormatada,
    horario: horarioFormatado,
    local: localNome || '[nome do local]',
    prazo: prazoFormatado,
  });

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1.35fr_1fr]">
      <form
        id="formulario-de-palestra"
        action={acao}
        className="flex flex-col gap-6"
      >
        {valores.id ? <input type="hidden" name="id" value={valores.id} /> : null}
        <input type="hidden" name="prazoTocado" value={tocado ? 'sim' : 'nao'} />

        {estado.mensagem ? (
          <Aviso tom={estado.ok ? 'sucesso' : 'erro'}>
            <p>{estado.mensagem}</p>
          </Aviso>
        ) : null}

        <Cartao superficie="interna">
          <TituloDoCartao className="mb-4">Identificação</TituloDoCartao>
          <div className="grid gap-4 sm:grid-cols-2">
            <Grupo
              rotulo="Cidade"
              htmlFor="cidade"
              obrigatorio
              erro={erro('cidade')}
              ajuda="É o nome que aparece no convite e no ingresso."
            >
              <Campo
                id="cidade"
                name="cidade"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                placeholder="Vilhena"
                required
                aria-invalid={Boolean(erro('cidade'))}
              />
            </Grupo>
            <Grupo
              rotulo="Endereço curto"
              ajuda={
                valores.slug
                  ? 'Definido na criação, não muda mais.'
                  : 'Gerado a partir da cidade e da data, ao salvar.'
              }
            >
              <Campo
                value={slugPrevia}
                readOnly
                className="cursor-not-allowed bg-superficie-alt font-mono text-texto-suave"
              />
            </Grupo>
          </div>
        </Cartao>

        <Cartao superficie="interna">
          <TituloDoCartao className="mb-4">Quando</TituloDoCartao>
          <div className="grid gap-4 sm:grid-cols-2">
            <Grupo
              rotulo="Data e hora"
              htmlFor="dataHoraLocal"
              obrigatorio
              erro={erro('dataHoraLocal')}
              ajuda="Horário de Porto Velho (UTC-4)."
            >
              <Campo
                id="dataHoraLocal"
                name="dataHoraLocal"
                type="datetime-local"
                value={dataHora}
                onChange={(e) => setDataHora(e.target.value)}
                required
                aria-invalid={Boolean(erro('dataHoraLocal'))}
              />
            </Grupo>

            <Grupo
              rotulo="Prazo de confirmação"
              htmlFor="prazoLocal"
              erro={erro('prazoLocal')}
            >
              <Campo
                id="prazoLocal"
                name="prazoLocal"
                type="datetime-local"
                value={prazo}
                disabled={!tocado}
                onChange={(e) => {
                  setPrazo(e.target.value);
                  setTocado(true);
                }}
                aria-invalid={Boolean(erro('prazoLocal'))}
              />
              <label className="mt-2 flex min-h-11 items-center gap-2 font-corpo text-corpo-sm text-texto-forte">
                <input
                  type="checkbox"
                  checked={!tocado}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setTocado(false);
                      if (dataHora) setPrazo(vesperaAs2359(dataHora));
                    } else {
                      setTocado(true);
                    }
                  }}
                  className="size-5 accent-lima-500"
                />
                Acompanhar a data da palestra (véspera às 23h59)
              </label>
            </Grupo>
          </div>
        </Cartao>

        <Cartao superficie="interna">
          <TituloDoCartao className="mb-4">Onde</TituloDoCartao>
          <Grupo
            rotulo="Nome do local"
            htmlFor="localNome"
            obrigatorio
            erro={erro('localNome')}
          >
            <Campo
              id="localNome"
              name="localNome"
              value={localNome}
              onChange={(e) => setLocalNome(e.target.value)}
              placeholder="Espaço de Eventos"
              required
              aria-invalid={Boolean(erro('localNome'))}
            />
          </Grupo>
          <Grupo
            rotulo="Endereço"
            htmlFor="localEndereco"
            obrigatorio
            erro={erro('localEndereco')}
            ajuda="Escreva como se fosse para alguém digitar no GPS: rua, número e bairro."
          >
            <Campo
              id="localEndereco"
              name="localEndereco"
              value={localEndereco}
              onChange={(e) => setLocalEndereco(e.target.value)}
              placeholder="Av. Major Amarante, 1000, Centro"
              required
              aria-invalid={Boolean(erro('localEndereco'))}
            />
          </Grupo>
        </Cartao>

        <Cartao superficie="interna">
          <TituloDoCartao className="mb-1">Mensagem padrão de WhatsApp</TituloDoCartao>
          <p className="mt-0 mb-3 font-corpo text-corpo-sm text-texto-suave">
            É o texto que o colaborador envia junto do link. Toque em um
            marcador para inserir no ponto onde está o cursor.
          </p>
          <div className="mb-3 flex flex-wrap gap-2">
            {MARCADORES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => inserirMarcador(m)}
                className="inline-flex min-h-11 items-center rounded-pilula border border-linha bg-superficie-alt px-3 font-mono text-corpo-sm text-texto-forte transition-colors hover:border-linha-forte"
              >
                {`{${m}}`}
              </button>
            ))}
          </div>
          <Grupo
            rotulo="Texto da mensagem"
            htmlFor="mensagemWhatsapp"
            obrigatorio
            erro={erro('mensagemWhatsapp')}
            ajuda={
              <>
                <strong>{'{link}'}</strong> é obrigatório: é onde entra o
                endereço do convite, sempre no fim, porque é o que o
                WhatsApp transforma em pré-visualização.
              </>
            }
          >
            <AreaDeTexto
              ref={areaRef}
              id="mensagemWhatsapp"
              name="mensagemWhatsapp"
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              rows={12}
              required
              aria-invalid={Boolean(erro('mensagemWhatsapp'))}
            />
          </Grupo>
          <Botao
            variante="contorno"
            tamanho="sm"
            onClick={() => setMensagem(MENSAGEM_PADRAO_WHATSAPP)}
          >
            Restaurar texto padrão
          </Botao>
        </Cartao>

        <div className="flex flex-wrap items-center gap-3">
          <Salvar />
          <LinkBotao href="/palestras/admin/palestras" variante="texto">
            Voltar para a lista
          </LinkBotao>
        </div>
      </form>

      <div className="flex flex-col gap-6">
        <Cartao superficie="interna">
          <p className="m-0 mb-3 font-corpo text-rotulo font-bold uppercase tracking-sobrancelha text-texto-suave">
            Como chega no WhatsApp
          </p>
          <div className="rounded-cartao bg-lima-100 p-4">
            <p className="m-0 whitespace-pre-line font-corpo text-corpo text-texto-forte">
              {mensagemPreenchida.texto}
            </p>
          </div>
          <p className="m-0 mt-3 font-corpo text-corpo-sm text-texto-suave">
            Os marcadores são substituídos na hora do envio, convite por
            convite. O código acima (PREVIA) é só ilustrativo.
          </p>
        </Cartao>

        <Cartao superficie="interna">
          <p className="m-0 mb-3 font-corpo text-rotulo font-bold uppercase tracking-sobrancelha text-texto-suave">
            Como entra na página pública
          </p>
          <Cartao elevado className="p-4">
            <p className="m-0 font-corpo text-rotulo font-bold uppercase tracking-sobrancelha text-texto-suave">
              {dataFormatada} · {horarioFormatado}
            </p>
            <h3 className="mt-2 mb-3 font-titulo text-t2 font-bold leading-justo tracking-destaque text-texto-forte">
              {cidade || '[cidade]'}
            </h3>
            <p className="m-0 font-corpo text-corpo-lg font-bold text-texto-forte">
              {localNome || '[nome do local]'}
            </p>
            <p className="mt-1 mb-4 font-corpo text-corpo text-texto">
              {localEndereco || '[endereço]'}
            </p>
            {dataPorExtenso ? (
              <p className="m-0 border-l-4 border-linha-acento pl-4 font-corpo text-corpo-sm text-texto-suave">
                {dataPorExtenso}
              </p>
            ) : null}
          </Cartao>
        </Cartao>

        <Cartao superficie="interna">
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              form="formulario-de-palestra"
              name="ativo"
              value="sim"
              defaultChecked={valores.ativo}
              className="size-5 flex-none accent-lima-500"
            />
            <span>
              <span className="block font-corpo text-corpo font-bold text-texto-forte">
                Palestra ativa
              </span>
              <span className="block font-corpo text-corpo-sm text-texto-suave">
                Aparece na página pública e pode receber convites.
              </span>
            </span>
          </label>
          {/*
            Checkbox desmarcado não é enviado; o par abaixo garante o valor.
            Os dois usam `form="formulario-de-palestra"` porque este cartão
            vive na coluna de pré-visualização, fora da árvore do
            elemento <form> (que fecha ao final da coluna da esquerda).
          */}
          <input type="hidden" form="formulario-de-palestra" name="ativo" value="nao" />
        </Cartao>

        <Aviso tom="atencao">
          <p>
            <strong>Ao salvar, nada é enviado.</strong> A palestra passa a
            existir para geração de convites: quem avisa os convidados é
            sempre o colaborador, pelo WhatsApp.
          </p>
        </Aviso>
      </div>
    </div>
  );
}

/** `2026-10-13T19:00` -> `2026-10-12T23:59`, em texto, sem passar por fuso. */
function vesperaAs2359(dataHoraLocal: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T/.exec(dataHoraLocal);
  if (!m) return '';
  const anterior = new Date(
    Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12) - 86_400_000,
  );
  const aa = anterior.getUTCFullYear();
  const mm = String(anterior.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(anterior.getUTCDate()).padStart(2, '0');
  return `${aa}-${mm}-${dd}T23:59`;
}
