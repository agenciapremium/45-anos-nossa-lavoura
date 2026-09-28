'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import {
  Ajuda,
  Aviso,
  Botao,
  Campo,
  ErroDoCampo,
  Grupo,
  Selecao,
} from '@/components/ui';
import {
  ATIVIDADES,
  AVISO_DE_PALESTRA_UNICA,
  mascaraDeWhatsapp,
} from '@/lib/palestras/confirmacao';
import { mascaraProgressiva } from '@/lib/palestras/cpf';
import type { Trecho } from '@/lib/palestras/consentimento';
import {
  confirmar,
} from './acoes';
import { ESTADO_INICIAL } from './estado';

/* =========================================================
   Formulário de confirmação

   Mobile first: um campo por linha, alvos grandes, teclado numérico onde
   o dado é numérico e nenhum passo além do necessário. É a única tela do
   sistema com usuário externo, sem login, sem treinamento e sem suporte.
   ========================================================= */

/**
 * Texto de consentimento com links embutidos.
 *
 * Os trechos vêm prontos do servidor. O texto de configuração nunca vira
 * HTML: cada pedaço entra como texto, e só os marcadores conhecidos viram
 * âncora.
 */
function TextoComLinks({ trechos }: { trechos: Trecho[] }) {
  return (
    <>
      {trechos.map((trecho, i) =>
        trecho.tipo === 'texto' ? (
          <span key={i}>{trecho.valor}</span>
        ) : (
          <a
            key={i}
            href={trecho.href}
            {...(trecho.tipo === 'politica'
              ? { target: '_blank', rel: 'noopener noreferrer' }
              : {})}
            className="font-bold text-terra-700 underline underline-offset-2"
          >
            {trecho.rotulo}
          </a>
        ),
      )}
    </>
  );
}

function BotaoConfirmar() {
  const { pending } = useFormStatus();
  return (
    <Botao
      type="submit"
      tamanho="lg"
      className="w-full"
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? 'Confirmando…' : 'Confirmar minha presença'}
    </Botao>
  );
}

export function FormularioDeConfirmacao({
  codigo,
  trechosDoAceite,
  textoDoOptIn,
  trechosDoApoio,
}: {
  codigo: string;
  trechosDoAceite: Trecho[];
  textoDoOptIn: string;
  trechosDoApoio: Trecho[];
}) {
  const [estado, acao] = useActionState(confirmar, ESTADO_INICIAL);

  // Controlados só onde há máscara. O resto é campo não controlado, para
  // o preenchimento automático do navegador funcionar sem briga.
  const [cpf, setCpf] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

  const erro = (campo: string) => estado.erros?.[campo];

  return (
    <form action={acao} noValidate>
      <input type="hidden" name="codigo" value={codigo} />

      {estado.mensagem ? (
        <Aviso tom="erro" className="mb-6">
          <p>{estado.mensagem}</p>
        </Aviso>
      ) : null}

      <Grupo rotulo="CPF" htmlFor="cpf" obrigatorio erro={erro('cpf')}>
        <Campo
          id="cpf"
          name="cpf"
          value={cpf}
          onChange={(e) => setCpf(mascaraProgressiva(e.target.value))}
          // `inputMode` numérico abre o teclado de números no celular sem
          // recusar o que for colado com pontos e traço.
          inputMode="numeric"
          autoComplete="off"
          placeholder="000.000.000-00"
          maxLength={14}
          aria-invalid={Boolean(erro('cpf'))}
          required
        />
      </Grupo>

      <Grupo
        rotulo="Nome completo"
        htmlFor="nome"
        obrigatorio
        erro={erro('nome')}
        ajuda="Como está no seu documento — é o nome conferido na entrada."
      >
        <Campo
          id="nome"
          name="nome"
          autoComplete="name"
          autoCapitalize="words"
          maxLength={200}
          aria-invalid={Boolean(erro('nome'))}
          required
        />
      </Grupo>

      <Grupo
        rotulo="WhatsApp"
        htmlFor="whatsapp"
        obrigatorio
        erro={erro('whatsapp')}
      >
        <Campo
          id="whatsapp"
          name="whatsapp"
          value={whatsapp}
          onChange={(e) => setWhatsapp(mascaraDeWhatsapp(e.target.value))}
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="(69) 90000-0000"
          maxLength={16}
          aria-invalid={Boolean(erro('whatsapp'))}
          required
        />
      </Grupo>

      <Grupo rotulo="Cidade" htmlFor="cidade" obrigatorio erro={erro('cidade')}>
        <Campo
          id="cidade"
          name="cidade"
          autoComplete="address-level2"
          autoCapitalize="words"
          maxLength={120}
          aria-invalid={Boolean(erro('cidade'))}
          required
        />
      </Grupo>

      <Grupo
        rotulo="Nome da propriedade"
        htmlFor="propriedade"
        obrigatorio
        erro={erro('propriedade')}
      >
        <Campo
          id="propriedade"
          name="propriedade"
          autoCapitalize="words"
          maxLength={160}
          aria-invalid={Boolean(erro('propriedade'))}
          required
        />
      </Grupo>

      <Grupo
        rotulo="Atividade da propriedade"
        htmlFor="atividade"
        obrigatorio
        erro={erro('atividade')}
      >
        <Selecao
          id="atividade"
          name="atividade"
          defaultValue=""
          aria-invalid={Boolean(erro('atividade'))}
          required
        >
          <option value="" disabled>
            Escolha uma opção
          </option>
          {ATIVIDADES.map((a) => (
            <option key={a.valor} value={a.valor}>
              {a.rotulo}
            </option>
          ))}
        </Selecao>
      </Grupo>

      <Grupo
        rotulo="Nome do acompanhante"
        htmlFor="acompanhanteNome"
        erro={erro('acompanhanteNome')}
        ajuda="Opcional. Seu convite dá entrada para você e mais uma pessoa."
      >
        <Campo
          id="acompanhanteNome"
          name="acompanhanteNome"
          autoCapitalize="words"
          maxLength={200}
          aria-invalid={Boolean(erro('acompanhanteNome'))}
        />
      </Grupo>

      {/* ---------- consentimento ---------- */}
      <fieldset className="mt-8 mb-4 rounded-cartao border-2 border-linha bg-superficie-alt p-4">
        <legend className="px-2 font-corpo text-rotulo font-bold uppercase tracking-sobrancelha text-lima-700">
          Uso dos seus dados
        </legend>

        <label
          htmlFor="aceitePolitica"
          className="flex cursor-pointer items-start gap-3 font-corpo text-corpo text-texto"
        >
          <input
            id="aceitePolitica"
            name="aceitePolitica"
            type="checkbox"
            // Desmarcada por padrão, por exigência da spec: sem `defaultChecked`.
            className="mt-0.5 size-6 flex-none accent-lima-500"
            aria-invalid={Boolean(erro('aceitePolitica'))}
          />
          <span>
            <TextoComLinks trechos={trechosDoAceite} />
          </span>
        </label>
        {erro('aceitePolitica') ? (
          <ErroDoCampo>{erro('aceitePolitica')}</ErroDoCampo>
        ) : null}

        <label
          htmlFor="aceiteComunicacoes"
          className="mt-4 flex cursor-pointer items-start gap-3 font-corpo text-corpo text-texto"
        >
          <input
            id="aceiteComunicacoes"
            name="aceiteComunicacoes"
            type="checkbox"
            className="mt-0.5 size-6 flex-none accent-lima-500"
          />
          <span>{textoDoOptIn}</span>
        </label>

        <Ajuda className="mt-4">
          <TextoComLinks trechos={trechosDoApoio} />
        </Ajuda>
      </fieldset>

      <Aviso tom="atencao" className="mb-6">
        <p>{AVISO_DE_PALESTRA_UNICA}</p>
      </Aviso>

      <BotaoConfirmar />

      <p className="mt-4 mb-0 text-center font-corpo text-corpo-sm text-texto-suave">
        Confira o CPF antes de confirmar: o convite trava no CPF informado e
        não há como trocar depois.
      </p>
    </form>
  );
}
