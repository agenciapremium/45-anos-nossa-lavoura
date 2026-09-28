import { Link, Text } from '@react-email/components';
// Import de valor: ver a nota em `base.tsx`.
import * as React from 'react';

import { Casca, Rodape, estilos } from './base';

/* =========================================================
   Os três e-mails transacionais

   Regra que vale para os três (tarefa 3.4): **nenhum** carrega CPF
   completo, senha ou dado de convidado. O que vai no corpo é o mínimo para
   a pessoa entrar — um link, um código — e o prazo para usá-lo.

   O nome do destinatário aparece porque ajuda a distinguir a mensagem de
   um phishing genérico, e não é dado sensível: quem recebe já é dono da
   caixa de entrada.
   ========================================================= */

function Saudacao({ nome }: { nome?: string | null }) {
  const primeiro = nome?.trim().split(/\s+/)[0];
  return (
    <Text style={estilos.paragrafo}>
      {primeiro ? `Olá, ${primeiro}!` : 'Olá!'}
    </Text>
  );
}

/** Link de uso único, válido por 15 minutos. */
export function EmailDeLinkMagico({
  nome,
  url,
  minutos,
}: {
  nome?: string | null;
  url: string;
  minutos: number;
}) {
  return (
    <Casca previa="Seu link de acesso ao Circuito de Palestras">
      <Text style={estilos.titulo}>Seu acesso ao sistema</Text>
      <Saudacao nome={nome} />
      <Text style={estilos.paragrafo}>
        Toque no botão abaixo para entrar. O link vale por {minutos} minutos e
        só pode ser usado uma vez.
      </Text>
      <Text style={{ margin: '0 0 24px' }}>
        <Link href={url} style={estilos.botao}>
          Entrar no sistema
        </Link>
      </Text>
      <Text style={estilos.paragrafo}>
        Se o botão não funcionar, copie e cole este endereço no navegador:
      </Text>
      <Text style={estilos.linkCru}>{url}</Text>
      <Rodape />
    </Casca>
  );
}

/** Código de 6 dígitos do login por CPF. */
export function EmailDeCodigoDeAcesso({
  nome,
  codigo,
  minutos,
}: {
  nome?: string | null;
  codigo: string;
  minutos: number;
}) {
  return (
    <Casca previa={`Seu código de acesso vale por ${minutos} minutos`}>
      <Text style={estilos.titulo}>Seu código de acesso</Text>
      <Saudacao nome={nome} />
      <Text style={estilos.paragrafo}>
        Digite o código abaixo na tela em que você pediu o acesso. Ele vale
        por {minutos} minutos.
      </Text>
      <Text style={estilos.codigo}>{codigo}</Text>
      <Text style={estilos.paragrafo}>
        Ninguém da Nossa Lavoura ou da Agência Premium vai pedir este código
        por telefone, WhatsApp ou e-mail. Se alguém pedir, não informe.
      </Text>
      <Rodape />
    </Casca>
  );
}

/** Definição de senha no primeiro acesso e redefinição. */
export function EmailDeSenha({
  nome,
  url,
  minutos,
  primeiroAcesso,
}: {
  nome?: string | null;
  url: string;
  minutos: number;
  primeiroAcesso: boolean;
}) {
  const titulo = primeiroAcesso ? 'Defina a sua senha' : 'Redefina a sua senha';
  return (
    <Casca previa={titulo}>
      <Text style={estilos.titulo}>{titulo}</Text>
      <Saudacao nome={nome} />
      <Text style={estilos.paragrafo}>
        {primeiroAcesso
          ? 'Use o botão abaixo para criar a sua senha de acesso ao sistema do circuito.'
          : 'Recebemos um pedido para redefinir a sua senha. Use o botão abaixo para criar uma nova.'}{' '}
        O link vale por {minutos} minutos e só funciona uma vez.
      </Text>
      <Text style={{ margin: '0 0 24px' }}>
        <Link href={url} style={estilos.botao}>
          {primeiroAcesso ? 'Criar senha' : 'Criar nova senha'}
        </Link>
      </Text>
      <Text style={estilos.paragrafo}>
        Se o botão não funcionar, copie e cole este endereço no navegador:
      </Text>
      <Text style={estilos.linkCru}>{url}</Text>
      <Rodape />
    </Casca>
  );
}
