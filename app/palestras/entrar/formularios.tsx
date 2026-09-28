'use client';

import { useActionState, useState } from 'react';

import { Ajuda, Aviso, Botao, Campo, Grupo } from '@/components/ui';
import { mascaraProgressiva } from '@/lib/palestras/cpf';

import {
  acaoDeCpfENascimento,
  acaoDeDefinirSenha,
  acaoDeLinkMagico,
  acaoDePedirCodigo,
  acaoDePedirRedefinicao,
  acaoDeReenviarCodigo,
  acaoDeSenha,
  acaoDeVerificarCodigo,
  type EstadoDoAcesso,
} from './acoes';
import { ESTADO_INICIAL } from './estado';

/* =========================================================
   Formulários das telas de acesso

   Cada um faz uma coisa só e devolve uma mensagem. A mensagem vem pronta
   do servidor — nenhum texto de recusa é montado aqui, porque a
   neutralidade das respostas é uma regra de segurança e não pode depender
   de quem escreveu a tela.
   ========================================================= */

const TOM: Record<
  NonNullable<EstadoDoAcesso['tom']>,
  'erro' | 'atencao' | 'informacao'
> = { erro: 'erro', aviso: 'atencao', informacao: 'informacao' };

function Resposta({ estado }: { estado: EstadoDoAcesso }) {
  if (!estado.mensagem) return null;
  return (
    <Aviso tom={TOM[estado.tom ?? 'informacao']} className="mb-4">
      <p className="m-0">{estado.mensagem}</p>
    </Aviso>
  );
}

function Enviar({ rotulo }: { rotulo: string }) {
  return (
    <Botao type="submit" tamanho="lg" className="w-full">
      {rotulo}
    </Botao>
  );
}

/** Campo de CPF com máscara enquanto se digita. */
function CampoDeCpf({ id = 'cpf' }: { id?: string }) {
  const [valor, setValor] = useState('');
  return (
    <Campo
      id={id}
      name="cpf"
      inputMode="numeric"
      autoComplete="username"
      placeholder="000.000.000-00"
      value={valor}
      onChange={(e) => setValor(mascaraProgressiva(e.target.value))}
      required
    />
  );
}

/* --------------------------------------------------------- 1 · senha */

export function FormularioDeSenha({ destino }: { destino?: string }) {
  const [estado, acao] = useActionState(acaoDeSenha, ESTADO_INICIAL);
  return (
    <form action={acao} noValidate>
      <Resposta estado={estado} />
      <input type="hidden" name="destino" value={destino ?? ''} />
      <Grupo
        rotulo="E-mail ou CPF"
        htmlFor="identificador"
        obrigatorio
        ajuda="Use o e-mail cadastrado ou o seu CPF, com ou sem pontuação."
      >
        <Campo
          id="identificador"
          name="identificador"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
        />
      </Grupo>
      <Grupo rotulo="Senha" htmlFor="senha" obrigatorio>
        <Campo
          id="senha"
          name="senha"
          type="password"
          autoComplete="current-password"
          required
        />
      </Grupo>
      <Enviar rotulo="Entrar" />
      <Ajuda className="mt-4 text-center">
        <a
          href="/palestras/entrar/senha"
          className="font-bold text-terra-700 underline underline-offset-4"
        >
          Esqueci a senha ou ainda não tenho uma
        </a>
      </Ajuda>
    </form>
  );
}

/* --------------------------------------------------- 2 · link mágico */

export function FormularioDeLinkMagico() {
  const [estado, acao] = useActionState(acaoDeLinkMagico, ESTADO_INICIAL);
  return (
    <form action={acao} noValidate>
      <Resposta estado={estado} />
      <Grupo
        rotulo="E-mail"
        htmlFor="email-magico"
        obrigatorio
        ajuda="Enviamos um link que vale por 15 minutos e serve uma vez só."
      >
        <Campo
          id="email-magico"
          name="email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
        />
      </Grupo>
      <Enviar rotulo="Enviar link de acesso" />
    </form>
  );
}

/* --------------------------------------------- 3 · código por CPF (1/2) */

export function FormularioDePedirCodigo() {
  const [estado, acao] = useActionState(acaoDePedirCodigo, ESTADO_INICIAL);
  return (
    <form action={acao} noValidate>
      <Resposta estado={estado} />
      <Grupo
        rotulo="CPF"
        htmlFor="cpf-codigo"
        obrigatorio
        ajuda="Enviamos um código de 6 dígitos para o e-mail cadastrado nesse CPF."
      >
        <CampoDeCpf id="cpf-codigo" />
      </Grupo>
      <Enviar rotulo="Enviar código" />
    </form>
  );
}

/* --------------------------------------------- 3 · código por CPF (2/2) */

export function FormularioDoCodigo({
  emailMascarado,
  destino,
}: {
  emailMascarado: string;
  destino?: string;
}) {
  const [estado, acao] = useActionState(acaoDeVerificarCodigo, ESTADO_INICIAL);
  const [reenvio, acaoDeReenvio] = useActionState(
    acaoDeReenviarCodigo,
    ESTADO_INICIAL,
  );

  return (
    <>
      <Aviso tom="informacao" className="mb-6">
        <p className="m-0">
          Enviamos um código de 6 dígitos para{' '}
          <strong className="font-mono">{emailMascarado}</strong>. Ele vale por
          10 minutos.
        </p>
      </Aviso>

      <form action={acao} noValidate>
        <Resposta estado={estado} />
        <input type="hidden" name="destino" value={destino ?? ''} />
        <Grupo rotulo="Código de 6 dígitos" htmlFor="codigo" obrigatorio>
          <Campo
            id="codigo"
            name="codigo"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={7}
            placeholder="000000"
            className="text-center font-mono text-t2 tracking-[0.4em]"
            required
          />
        </Grupo>
        <Enviar rotulo="Entrar" />
      </form>

      <form action={acaoDeReenvio} className="mt-4 text-center">
        <Resposta estado={reenvio} />
        <button
          type="submit"
          className="cursor-pointer border-none bg-transparent p-0 font-corpo text-corpo-sm font-bold text-terra-700 underline underline-offset-4"
        >
          Não recebeu? Enviar um novo código
        </button>
      </form>
    </>
  );
}

/* ------------------------------------------ 4 · CPF e data de nascimento */

export function FormularioDeCpfENascimento({ destino }: { destino?: string }) {
  const [estado, acao] = useActionState(
    acaoDeCpfENascimento,
    ESTADO_INICIAL,
  );
  return (
    <form action={acao} noValidate>
      <Resposta estado={estado} />
      <input type="hidden" name="destino" value={destino ?? ''} />
      <Grupo rotulo="CPF" htmlFor="cpf-nascimento" obrigatorio>
        <CampoDeCpf id="cpf-nascimento" />
      </Grupo>
      <Grupo
        rotulo="Data de nascimento"
        htmlFor="dataNascimento"
        obrigatorio
        ajuda="Esta entrada vale para colaboradores e recepção."
      >
        <Campo
          id="dataNascimento"
          name="dataNascimento"
          type="date"
          autoComplete="bday"
          required
        />
      </Grupo>
      <Enviar rotulo="Entrar" />
    </form>
  );
}

/* --------------------------------------------------------- 5 · senha */

export function FormularioDeRedefinicao() {
  const [estado, acao] = useActionState(
    acaoDePedirRedefinicao,
    ESTADO_INICIAL,
  );
  return (
    <form action={acao} noValidate>
      <Resposta estado={estado} />
      <Grupo
        rotulo="E-mail"
        htmlFor="email-senha"
        obrigatorio
        ajuda="Enviamos um link para você criar a senha. Serve tanto para o primeiro acesso quanto para trocar a senha atual."
      >
        <Campo
          id="email-senha"
          name="email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
        />
      </Grupo>
      <Enviar rotulo="Enviar link" />
    </form>
  );
}

export function FormularioDeNovaSenha({ token }: { token: string }) {
  const [estado, acao] = useActionState(acaoDeDefinirSenha, ESTADO_INICIAL);
  return (
    <form action={acao} noValidate>
      <Resposta estado={estado} />
      <input type="hidden" name="token" value={token} />
      <Grupo
        rotulo="Nova senha"
        htmlFor="senha-nova"
        obrigatorio
        ajuda="Ao menos 10 caracteres. Prefira uma frase que só você saiba."
      >
        <Campo
          id="senha-nova"
          name="senha"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
        />
      </Grupo>
      <Grupo rotulo="Repita a nova senha" htmlFor="senha-repetida" obrigatorio>
        <Campo
          id="senha-repetida"
          name="repetida"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
        />
      </Grupo>
      <Enviar rotulo="Salvar senha" />
    </form>
  );
}
