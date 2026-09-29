import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
/*
   Import de VALOR, não de tipo. O `tsconfig` usa `jsx: "preserve"` para o
   Next cuidar da transformação, e fora do Next (o script
   `npm run test:acesso`) o JSX vira `React.createElement` — que sem este
   import estoura com "React is not defined".
*/
import * as React from 'react';

/* =========================================================
   Casca comum dos e-mails transacionais

   Estilo em objeto, inline: cliente de e-mail não carrega folha externa e
   o Outlook ignora boa parte do CSS moderno. Os valores vêm de
   `tokens.css`, transcritos — importar o CSS aqui não teria efeito.

   **Sem imagem remota.** O selo do circuito só existe em `.webp`, que o
   Outlook não abre, e o único `.png` do projeto está no pacote do PDF, sem
   URL pública. Como o selo carrega as marcas dos patrocinadores e não pode
   ser recortado nem distorcido, um selo que falha em metade das caixas de
   entrada é pior que nenhum: o cabeçalho é tipográfico.
   ========================================================= */

const TERRA_900 = '#2a1512';
const TERRA_700 = '#3d201b';
const TERRA_300 = '#8a5b4f';
const LIMA_500 = '#b8db3d';
const CREME_500 = '#fffadc';

const PILHA_DE_FONTES =
  "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export const estilos = {
  corpo: {
    margin: 0,
    padding: '24px 0',
    backgroundColor: '#f1ead2',
    fontFamily: PILHA_DE_FONTES,
    color: TERRA_900,
  } as React.CSSProperties,

  container: {
    margin: '0 auto',
    maxWidth: '560px',
    backgroundColor: CREME_500,
    border: `2px solid ${TERRA_700}`,
    borderRadius: '16px',
    overflow: 'hidden',
  } as React.CSSProperties,

  cabecalho: {
    backgroundColor: TERRA_900,
    padding: '20px 28px',
  } as React.CSSProperties,

  sobrancelha: {
    margin: 0,
    color: LIMA_500,
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  } as React.CSSProperties,

  marca: {
    margin: '4px 0 0',
    color: CREME_500,
    fontSize: '20px',
    fontWeight: 700,
    lineHeight: 1.2,
  } as React.CSSProperties,

  miolo: { padding: '28px' } as React.CSSProperties,

  titulo: {
    margin: '0 0 12px',
    fontSize: '22px',
    fontWeight: 700,
    lineHeight: 1.25,
    color: TERRA_900,
  } as React.CSSProperties,

  paragrafo: {
    margin: '0 0 16px',
    fontSize: '16px',
    lineHeight: 1.6,
    color: TERRA_700,
  } as React.CSSProperties,

  botao: {
    display: 'inline-block',
    backgroundColor: LIMA_500,
    color: TERRA_900,
    fontSize: '16px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    textDecoration: 'none',
    padding: '14px 26px',
    borderRadius: '12px',
  } as React.CSSProperties,

  codigo: {
    margin: '8px 0 20px',
    display: 'inline-block',
    backgroundColor: '#e9f4c4',
    border: `2px solid ${LIMA_500}`,
    borderRadius: '12px',
    padding: '14px 24px',
    fontSize: '32px',
    fontWeight: 700,
    letterSpacing: '0.28em',
    color: TERRA_900,
    fontFamily: "'Courier New', Courier, monospace",
  } as React.CSSProperties,

  linkCru: {
    margin: '0 0 8px',
    fontSize: '13px',
    lineHeight: 1.5,
    color: TERRA_300,
    wordBreak: 'break-all',
  } as React.CSSProperties,

  divisor: {
    margin: '24px 0',
    border: 'none',
    borderTop: `1px solid ${TERRA_300}`,
    opacity: 0.35,
  } as React.CSSProperties,

  rodape: {
    margin: 0,
    fontSize: '13px',
    lineHeight: 1.6,
    color: TERRA_300,
  } as React.CSSProperties,
} as const;

/**
 * Aviso de fecho, igual em todos os e-mails.
 *
 * Diz o que fazer se a pessoa não pediu nada, sem jamais afirmar que
 * existe uma conta com aquele endereço.
 */
export function Rodape() {
  return (
    <>
      <Hr style={estilos.divisor} />
      <Text style={estilos.rodape}>
        Se você não pediu este acesso, ignore esta mensagem: nada acontece
        sem alguém abrir o link ou digitar o código.
      </Text>
      <Text style={estilos.rodape}>
        Circuito de Palestras Acelera no Campo 3.0 · Nossa Lavoura, Grupo Axia
        Agro. Mensagem automática; não responda a este endereço.
      </Text>
    </>
  );
}

export function Casca({
  previa,
  children,
}: {
  previa: string;
  children: React.ReactNode;
}) {
  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>{previa}</Preview>
      <Body style={estilos.corpo}>
        <Container style={estilos.container}>
          <Section style={estilos.cabecalho}>
            <Text style={estilos.sobrancelha}>Acelera no Campo 3.0</Text>
            <Text style={estilos.marca}>Circuito de Palestras</Text>
          </Section>
          <Section style={estilos.miolo}>{children}</Section>
        </Container>
      </Body>
    </Html>
  );
}
