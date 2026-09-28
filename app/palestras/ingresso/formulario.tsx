'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { Aviso, Botao, Campo, Grupo } from '@/components/ui';
import { mascaraProgressiva } from '@/lib/palestras/cpf';
import { ESTADO_INICIAL, recuperar } from './acoes';

/**
 * Repetido de `lib/palestras/codigo.ts` de propósito.
 *
 * Aquele módulo sorteia códigos com `node:crypto`, e importá-lo daqui
 * arrastaria o gerador — e um módulo nativo do Node — para dentro do
 * pacote do navegador. O valor é um número, e o servidor valida de novo
 * com `pareceCodigo`, que é a autoridade.
 */
const TAMANHO_DO_CODIGO = 6;

function BotaoRecuperar() {
  const { pending } = useFormStatus();
  return (
    <Botao
      type="submit"
      tamanho="lg"
      className="w-full"
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? 'Procurando…' : 'Ver meu ingresso'}
    </Botao>
  );
}

export function FormularioDeRecuperacao() {
  const [estado, acao] = useActionState(recuperar, ESTADO_INICIAL);
  const [cpf, setCpf] = useState('');
  const [codigo, setCodigo] = useState('');

  return (
    <form action={acao} noValidate>
      {estado.mensagem ? (
        <Aviso tom="erro" className="mb-6">
          <p>{estado.mensagem}</p>
        </Aviso>
      ) : null}

      <Grupo
        rotulo="CPF usado na confirmação"
        htmlFor="cpf"
        obrigatorio
        ajuda="O mesmo CPF que você informou ao confirmar."
      >
        <Campo
          id="cpf"
          name="cpf"
          value={cpf}
          onChange={(e) => setCpf(mascaraProgressiva(e.target.value))}
          inputMode="numeric"
          autoComplete="off"
          placeholder="000.000.000-00"
          maxLength={14}
          required
        />
      </Grupo>

      <Grupo
        rotulo="Código do convite"
        htmlFor="codigo"
        obrigatorio
        ajuda="São 6 letras e números, no fim do link que você recebeu: .../palestras/c/K7Q2MX"
      >
        <Campo
          id="codigo"
          name="codigo"
          value={codigo}
          // Só maiúsculas: o alfabeto do código não tem minúsculas, e
          // deixar o navegador "corrigir" confundiria mais que ajudaria.
          onChange={(e) =>
            setCodigo(
              e.target.value
                .toUpperCase()
                .replace(/[^0-9A-Z]/g, '')
                .slice(0, TAMANHO_DO_CODIGO),
            )
          }
          autoComplete="off"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          placeholder="K7Q2MX"
          maxLength={TAMANHO_DO_CODIGO}
          className="font-mono tracking-[0.3em] uppercase"
          required
        />
      </Grupo>

      <BotaoRecuperar />
    </form>
  );
}
