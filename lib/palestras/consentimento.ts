/* =========================================================
   Textos de consentimento · D9 e D9b do design

   Os textos aprovados moram aqui como **padrão**, não como conteúdo do
   JSX. Quem os exibe recebe strings prontas de `configuracao.ts`, que
   procura primeiro uma linha em `palestra_configuracao` — é o que permite
   uma revisão do DPO entrar sem nova publicação da aplicação.

   Dois marcadores são substituídos por links na hora de renderizar. Eles
   existem para que o texto continue sendo **um texto**: o link precisa
   ficar dentro da frase, e uma frase partida em três pedaços de JSX não é
   editável por quem revisa.

     {politica}  ->  link "Política de Privacidade", em nova aba
     {dpo}       ->  o e-mail do encarregado, como `mailto:`

   Este módulo é puro de propósito: não fala com o banco e não importa
   `server-only`, para poder atravessar a fronteira até o formulário.
   ========================================================= */

/** Versão vigente da política da Nossa Lavoura (3.0, de 29/10/2025). */
export const VERSAO_DA_POLITICA_PADRAO = '3.0';

export const URL_DA_POLITICA_PADRAO =
  'https://nossalavoura.com.br/politica-de-privacidade/';

/** Encarregado de dados (DPO): GEP Soluções em Compliance. */
export const EMAIL_DO_ENCARREGADO_PADRAO = 'dpo@axiaagro.com.br';

export const ROTULO_DA_POLITICA = 'Política de Privacidade';

/**
 * Aceite **obrigatório**, desmarcado por padrão.
 *
 * A declaração sobre o acompanhante está aqui, e não num terceiro
 * checkbox, porque é o titular quem informa o nome de um terceiro que
 * nunca viu o formulário.
 */
export const TEXTO_DE_ACEITE_PADRAO =
  'Autorizo a Nossa Lavoura (Grupo Axia Agro) a tratar meus dados para ' +
  'confirmar e controlar minha presença no Circuito de Palestras Acelera ' +
  'no Campo 3.0, conforme a {politica}. Se eu informar um acompanhante, ' +
  'declaro que ele está ciente e de acordo.';

/**
 * Opt-in **opcional**, desmarcado por padrão.
 *
 * O texto diz explicitamente que não é condição, para que ninguém marque
 * por medo de perder a vaga.
 */
export const TEXTO_DE_OPT_IN_PADRAO =
  'Quero receber novidades, convites e ofertas da Nossa Lavoura. ' +
  'Opcional — sua presença está confirmada do mesmo jeito.';

/**
 * Apoio, em corpo menor, abaixo dos checkboxes.
 *
 * A guarda é amarrada à **finalidade**, não a um prazo (D9c): a cliente
 * decidiu por retenção indeterminada, sem rotina de expurgo, e anunciar um
 * prazo que não é cumprido seria pior que não anunciar nenhum.
 */
export const TEXTO_DE_APOIO_PADRAO =
  'Seus dados ficam guardados enquanto essa finalidade existir. Você pode ' +
  'pedir acesso, correção ou exclusão, e revogar esta autorização a ' +
  'qualquer momento, pelo e-mail {dpo}.';

export type TextosDeConsentimento = {
  /** Gravada na confirmação. Não muda por alteração posterior. */
  versaoDaPolitica: string;
  urlDaPolitica: string;
  emailDoEncarregado: string;
  aceite: string;
  optIn: string;
  apoio: string;
};

export const TEXTOS_PADRAO: TextosDeConsentimento = {
  versaoDaPolitica: VERSAO_DA_POLITICA_PADRAO,
  urlDaPolitica: URL_DA_POLITICA_PADRAO,
  emailDoEncarregado: EMAIL_DO_ENCARREGADO_PADRAO,
  aceite: TEXTO_DE_ACEITE_PADRAO,
  optIn: TEXTO_DE_OPT_IN_PADRAO,
  apoio: TEXTO_DE_APOIO_PADRAO,
};

/** Um pedaço de texto do consentimento, já classificado para o JSX. */
export type Trecho =
  | { tipo: 'texto'; valor: string }
  | { tipo: 'politica'; rotulo: string; href: string }
  | { tipo: 'dpo'; rotulo: string; href: string };

const MARCADORES = /\{(politica|dpo)\}/g;

/**
 * Parte o texto nos marcadores, preservando tudo que está entre eles.
 *
 * Devolver trechos em vez de HTML é deliberado: o texto vem de
 * configuração, e configuração que vira HTML é injeção esperando
 * acontecer. Aqui, o que vem do banco só pode virar texto.
 */
export function partirTexto(
  texto: string,
  contexto: { urlDaPolitica: string; emailDoEncarregado: string },
): Trecho[] {
  const trechos: Trecho[] = [];
  let ultimo = 0;

  for (const achado of texto.matchAll(MARCADORES)) {
    const inicio = achado.index ?? 0;
    if (inicio > ultimo) {
      trechos.push({ tipo: 'texto', valor: texto.slice(ultimo, inicio) });
    }
    if (achado[1] === 'politica') {
      trechos.push({
        tipo: 'politica',
        rotulo: ROTULO_DA_POLITICA,
        href: contexto.urlDaPolitica,
      });
    } else {
      trechos.push({
        tipo: 'dpo',
        rotulo: contexto.emailDoEncarregado,
        href: `mailto:${contexto.emailDoEncarregado}`,
      });
    }
    ultimo = inicio + achado[0].length;
  }

  if (ultimo < texto.length) {
    trechos.push({ tipo: 'texto', valor: texto.slice(ultimo) });
  }
  return trechos;
}

/** O texto como a pessoa lê, sem marcadores. É o que fica de evidência. */
export function textoPlano(
  texto: string,
  contexto: { emailDoEncarregado: string },
): string {
  return texto
    .replace(/\{politica\}/g, ROTULO_DA_POLITICA)
    .replace(/\{dpo\}/g, contexto.emailDoEncarregado);
}
