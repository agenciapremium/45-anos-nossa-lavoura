/* =========================================================
   Mensagem padrão de WhatsApp

   Copy aprovada pela cliente, registrada em D2b do design. É gravada em cada
   palestra nova e o Admin pode editar por palestra.

   Decisões por trás do texto, para quem for mexer:
   - o link fica sozinho na última linha útil, porque o WhatsApp monta a
     pré-visualização a partir dele e linha isolada evita que pontuação entre
     na URL;
   - "gratuitas" aparece cedo, porque é a objeção mais provável de quem
     recebe um convite de empresa;
   - "pessoal e intransferível" precede o link, para quem repassar saber que
     o convite trava no primeiro CPF;
   - dois emojis apenas, nas linhas de lugar e data, que é onde ajudam a
     varrer a mensagem.
   ========================================================= */

export const MENSAGEM_PADRAO_WHATSAPP = `Olá! A Nossa Lavoura convida você para o Circuito de Palestras Acelera no Campo 3.0.

📍 {cidade} · {local}
🗓 {data}, às {horario}

Palestras técnicas gratuitas com Giovani Pastre, da Virbac, e Ricardo Arantes.

Convite pessoal e intransferível, válido para você e mais 1 acompanhante.
Confirme sua presença até {prazo}:
{link}

Acelere conhecimento. Acelere resultados. Acelere no Campo.`;

/** Marcadores que o sistema sabe substituir. */
export const MARCADORES = [
  'cidade',
  'data',
  'horario',
  'local',
  'prazo',
  'link',
] as const;

export type Marcador = (typeof MARCADORES)[number];

/** `{link}` é obrigatório: sem ele a mensagem não leva a lugar nenhum. */
export const MARCADORES_OBRIGATORIOS: Marcador[] = ['link'];

export type ValoresDosMarcadores = Record<Marcador, string>;

/**
 * Qualquer coisa entre chaves conta como marcador — inclusive com acento.
 *
 * O padrão é largo de propósito: `{horário}` precisa ser **reconhecido** para
 * poder ser recusado. Um padrão estrito o ignoraria em silêncio, e a chave
 * literal chegaria ao WhatsApp de 400 pessoas.
 */
const PADRAO_DE_MARCADOR = /\{([^{}\n]{1,40})\}/g;

/** Todos os marcadores citados no texto, na ordem em que aparecem. */
export function marcadoresUsados(texto: string): string[] {
  return [...texto.matchAll(PADRAO_DE_MARCADOR)].map((m) => m[1] as string);
}

export type ProblemaDaMensagem =
  | { tipo: 'faltando'; marcador: string }
  | { tipo: 'desconhecido'; marcador: string };

/**
 * Confere a mensagem antes de salvar.
 *
 * Marcador desconhecido é recusado, e não ignorado: se o Admin escreveu
 * `{horário}` com acento, o texto sairia com a chave literal no WhatsApp de
 * 400 pessoas. Melhor recusar na tela.
 */
export function validarMensagem(texto: string): ProblemaDaMensagem[] {
  const problemas: ProblemaDaMensagem[] = [];
  const usados = new Set(marcadoresUsados(texto));

  for (const obrigatorio of MARCADORES_OBRIGATORIOS) {
    if (!usados.has(obrigatorio)) {
      problemas.push({ tipo: 'faltando', marcador: obrigatorio });
    }
  }
  for (const usado of usados) {
    if (!(MARCADORES as readonly string[]).includes(usado)) {
      problemas.push({ tipo: 'desconhecido', marcador: usado });
    }
  }
  return problemas;
}

/** Mensagem de erro pronta para a tela. */
export function explicarProblemas(problemas: ProblemaDaMensagem[]): string {
  const faltando = problemas
    .filter((p) => p.tipo === 'faltando')
    .map((p) => `{${p.marcador}}`);
  const desconhecidos = problemas
    .filter((p) => p.tipo === 'desconhecido')
    .map((p) => `{${p.marcador}}`);

  const partes: string[] = [];
  if (faltando.length) {
    partes.push(
      `A mensagem precisa conter ${faltando.join(', ')} — é onde entra o endereço do convite.`,
    );
  }
  if (desconhecidos.length) {
    partes.push(
      `Marcador não reconhecido: ${desconhecidos.join(', ')}. ` +
        `Os válidos são ${MARCADORES.map((m) => `{${m}}`).join(', ')}.`,
    );
  }
  return partes.join(' ');
}

/** Substitui os marcadores pelos dados reais. */
export function preencherMensagem(
  texto: string,
  valores: ValoresDosMarcadores,
): string {
  return texto.replace(PADRAO_DE_MARCADOR, (inteiro, nome: string) =>
    nome in valores ? valores[nome as Marcador] : inteiro,
  );
}

/**
 * Monta o link do botão "Enviar via WhatsApp" do PDF.
 *
 * `wa.me` **sem número** abre o seletor de contatos do próprio WhatsApp, que
 * é o fluxo descrito no PRD: o colaborador escolhe para quem mandar.
 *
 * `encodeURIComponent` cobre acentos, o `·`, os emojis, as quebras de linha
 * e o `&` — este último é o mais perigoso, porque sem escape cortaria a
 * mensagem no meio e o resto viraria outro parâmetro da URL.
 */
export function linkDoWhatsapp(mensagemPreenchida: string): string {
  return `https://wa.me/?text=${encodeURIComponent(mensagemPreenchida)}`;
}

/** Endereço público de um convite. */
export function urlDoConvite(origem: string, codigo: string): string {
  return `${origem.replace(/\/+$/, '')}/palestras/c/${codigo}`;
}

/* ---------------------------------------------------------
   Mensagem de um convite específico

   Um ponto só de montagem, usado pelo PDF (`lib/palestras/pdf/montar.ts`) e
   pelo painel do colaborador. A spec de `painel-convites` exige que a
   mensagem enviada pelo painel seja IDÊNTICA à do PDF para o mesmo
   convite — a garantia vem de reusar esta função nos dois lugares, não de
   duas implementações mantidas em paralelo (D1 do design).
   --------------------------------------------------------- */

export type MensagemDoConvite = {
  /** Endereço público do convite. */
  url: string;
  /** Texto já com os marcadores substituídos. */
  texto: string;
  /** `https://wa.me/?text=…`, pronto para o botão "Enviar via WhatsApp". */
  linkWhatsapp: string;
};

export function montarMensagemDoConvite(params: {
  origem: string;
  codigo: string;
  mensagemTemplate: string;
  cidade: string;
  data: string;
  horario: string;
  local: string;
  prazo: string;
}): MensagemDoConvite {
  const url = urlDoConvite(params.origem, params.codigo);
  const texto = preencherMensagem(params.mensagemTemplate, {
    cidade: params.cidade,
    data: params.data,
    horario: params.horario,
    local: params.local,
    prazo: params.prazo,
    link: url,
  });
  return { url, texto, linkWhatsapp: linkDoWhatsapp(texto) };
}
