'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';

import {
  AreaDeTexto,
  Aviso,
  Botao,
  Campo,
  Cartao,
  Grupo,
  LinkBotao,
} from '@/components/ui';
import { MARCADORES, MENSAGEM_PADRAO_WHATSAPP } from '@/lib/palestras/mensagem';
import { salvarPalestra, type EstadoDoFormulario } from './acoes';

export type ValoresDaPalestra = {
  id?: string;
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
      {pending ? 'Salvando…' : 'Salvar palestra'}
    </Botao>
  );
}

/**
 * Formulário de palestra.
 *
 * O campo de prazo se comporta de dois jeitos: enquanto ninguém o tocou, ele
 * acompanha a data da palestra (véspera às 23h59) e mostra isso em texto;
 * assim que o Admin digita, vira valor dele e o sistema para de recalcular.
 * O `prazoTocado` é o que avisa o servidor de qual dos dois está valendo.
 */
export function FormularioDePalestra({
  valores,
}: {
  valores: ValoresDaPalestra;
}) {
  const [estado, acao] = useActionState(salvarPalestra, INICIAL);

  const [dataHora, setDataHora] = useState(valores.dataHoraLocal);
  const [prazo, setPrazo] = useState(valores.prazoLocal);
  const [tocado, setTocado] = useState(valores.prazoAjustadoManualmente);
  const [mensagem, setMensagem] = useState(valores.mensagemWhatsapp);

  // Enquanto o prazo não foi assumido pelo Admin, ele segue a data.
  useEffect(() => {
    if (tocado || !dataHora) return;
    setPrazo(vesperaAs2359(dataHora));
  }, [dataHora, tocado]);

  const erro = (campo: string) => estado.erros?.[campo] ?? null;

  return (
    <form action={acao} className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      {valores.id ? <input type="hidden" name="id" value={valores.id} /> : null}
      <input type="hidden" name="prazoTocado" value={tocado ? 'sim' : 'nao'} />

      <div className="lg:col-span-2">
        {estado.mensagem ? (
          <Aviso tom={estado.ok ? 'sucesso' : 'erro'} className="mb-4">
            <p>{estado.mensagem}</p>
          </Aviso>
        ) : null}
      </div>

      <Cartao>
        <Grupo rotulo="Cidade" htmlFor="cidade" obrigatorio erro={erro('cidade')}>
          <Campo
            id="cidade"
            name="cidade"
            defaultValue={valores.cidade}
            placeholder="Vilhena"
            required
            aria-invalid={Boolean(erro('cidade'))}
          />
        </Grupo>

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
          ajuda={
            tocado
              ? 'Ajustado manualmente. Mudar a data da palestra não altera mais este valor.'
              : 'Preenchido automaticamente com a véspera às 23h59. Editar assume o controle.'
          }
        >
          <Campo
            id="prazoLocal"
            name="prazoLocal"
            type="datetime-local"
            value={prazo}
            onChange={(e) => {
              setPrazo(e.target.value);
              setTocado(true);
            }}
            aria-invalid={Boolean(erro('prazoLocal'))}
          />
          {tocado ? (
            <Botao
              variante="texto"
              tamanho="sm"
              className="mt-2 px-0"
              onClick={() => {
                setTocado(false);
                setPrazo(vesperaAs2359(dataHora));
              }}
            >
              Voltar ao cálculo automático
            </Botao>
          ) : null}
        </Grupo>

        <Grupo
          rotulo="Nome do local"
          htmlFor="localNome"
          obrigatorio
          erro={erro('localNome')}
        >
          <Campo
            id="localNome"
            name="localNome"
            defaultValue={valores.localNome}
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
        >
          <Campo
            id="localEndereco"
            name="localEndereco"
            defaultValue={valores.localEndereco}
            placeholder="Av. Major Amarante, 1000 — Centro"
            required
            aria-invalid={Boolean(erro('localEndereco'))}
          />
        </Grupo>

        <label className="flex items-center gap-2 font-corpo text-corpo">
          <input
            type="checkbox"
            name="ativo"
            value="sim"
            defaultChecked={valores.ativo}
            className="size-5 accent-lima-500"
          />
          Palestra ativa (aparece em <code>/palestras</code>)
        </label>
        {/* Checkbox desmarcado não é enviado; o par abaixo garante o valor. */}
        <input type="hidden" name="ativo" value="nao" />
      </Cartao>

      <Cartao>
        <Grupo
          rotulo="Mensagem padrão de WhatsApp"
          htmlFor="mensagemWhatsapp"
          obrigatorio
          erro={erro('mensagemWhatsapp')}
          ajuda={
            <>
              Marcadores válidos:{' '}
              {MARCADORES.map((m) => (
                <code key={m} className="mr-1 font-mono">
                  {`{${m}}`}
                </code>
              ))}
              <br />
              <strong>{'{link}'}</strong> é obrigatório — é onde entra o
              endereço do convite.
            </>
          }
        >
          <AreaDeTexto
            id="mensagemWhatsapp"
            name="mensagemWhatsapp"
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            rows={18}
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

      <div className="flex flex-wrap items-center gap-3 lg:col-span-2">
        <Salvar />
        <LinkBotao href="/palestras/admin/palestras" variante="texto">
          Voltar para a lista
        </LinkBotao>
      </div>
    </form>
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
