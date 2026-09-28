import { FUSO } from '@/lib/tempo';

/* =========================================================
   Arquivo `.ics` da palestra (D7 do design)

   Um arquivo de calendário, não um convite: sem `ORGANIZER`, sem
   `ATTENDEE`, sem `METHOD:REQUEST`. Ninguém recebe e-mail por causa dele, e
   ele não carrega nenhum dado pessoal — só os dados da palestra, que são
   públicos em `/palestras`.

   Módulo puro, sem banco: o formato do `.ics` é chato o bastante para
   merecer teste próprio.
   ========================================================= */

/**
 * Rondônia é UTC-4 o ano inteiro, sem horário de verão.
 *
 * O bloco `VTIMEZONE` é escrito à mão porque o `.ics` precisa ser
 * autocontido: um aplicativo de calendário que não conheça
 * `America/Porto_Velho` ainda assim acerta o horário lendo o deslocamento
 * declarado aqui.
 */
const DESLOCAMENTO = '-0400';

/** Sem duração no cadastro, uma palestra ocupa a noite. */
export const HORAS_DE_DURACAO = 3;

export type DadosDaAgenda = {
  /** Instante UTC de início. */
  inicio: Date;
  cidade: string;
  localNome: string;
  localEndereco: string;
  /** Identificador estável do evento, para o calendário não duplicar. */
  uid: string;
  agora?: Date;
};

/**
 * Escapa o que o RFC 5545 exige em valores de texto.
 *
 * A vírgula é a que morde na prática: um endereço como "Av. JK, 1711, Casa
 * Preta" sem escape vira três valores e o calendário mostra só o primeiro.
 */
function escapar(valor: string): string {
  return valor
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** `20261013T190000` — data e hora locais, sem `Z`. */
function carimboLocal(instante: Date): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(instante);

  const pegar = (tipo: string) =>
    partes.find((p) => p.type === tipo)?.value ?? '00';

  return (
    `${pegar('year')}${pegar('month')}${pegar('day')}` +
    `T${pegar('hour')}${pegar('minute')}${pegar('second')}`
  );
}

/** `20261013T230000Z` — instante UTC. */
function carimboUtc(instante: Date): string {
  return `${instante.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`;
}

/**
 * Dobra as linhas em 75 octetos, como manda o RFC.
 *
 * Conta **bytes**, não caracteres: "Ji-Paraná" tem 9 caracteres e 10
 * octetos em UTF-8, e uma dobra no meio de um caractere de dois bytes
 * quebra o arquivo em alguns leitores.
 */
function dobrar(linha: string): string {
  const bytes = Buffer.from(linha, 'utf8');
  if (bytes.length <= 75) return linha;

  const pedacos: string[] = [];
  let inicio = 0;
  let limite = 75;

  while (inicio < bytes.length) {
    let fim = Math.min(inicio + limite, bytes.length);
    // Recua até o começo de um caractere completo.
    while (fim < bytes.length && (bytes[fim]! & 0xc0) === 0x80) fim--;
    pedacos.push(bytes.subarray(inicio, fim).toString('utf8'));
    inicio = fim;
    limite = 74; // as continuações começam com um espaço
  }

  return pedacos.join('\r\n ');
}

export const TITULO_DO_EVENTO = 'Circuito de Palestras Acelera no Campo 3.0';

export const DESCRICAO_DO_EVENTO =
  'Palestras técnicas gratuitas com Giovani Pastre, da Virbac, e Ricardo ' +
  'Arantes. Convite pessoal e intransferível, válido para você e 1 ' +
  'acompanhante. Leve o seu ingresso com QR Code.';

export function montarIcs(dados: DadosDaAgenda): string {
  const { inicio, cidade, localNome, localEndereco, uid } = dados;
  const fim = new Date(inicio.getTime() + HORAS_DE_DURACAO * 3_600_000);
  const agora = dados.agora ?? new Date();

  const linhas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Nossa Lavoura//Acelera no Campo 3.0//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VTIMEZONE',
    `TZID:${FUSO}`,
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    `TZOFFSETFROM:${DESLOCAMENTO}`,
    `TZOFFSETTO:${DESLOCAMENTO}`,
    'TZNAME:-04',
    'END:STANDARD',
    'END:VTIMEZONE',
    'BEGIN:VEVENT',
    `UID:${escapar(uid)}`,
    `DTSTAMP:${carimboUtc(agora)}`,
    `DTSTART;TZID=${FUSO}:${carimboLocal(inicio)}`,
    `DTEND;TZID=${FUSO}:${carimboLocal(fim)}`,
    `SUMMARY:${escapar(`${TITULO_DO_EVENTO} · ${cidade}`)}`,
    `LOCATION:${escapar(`${localNome}, ${localEndereco}`)}`,
    `DESCRIPTION:${escapar(DESCRICAO_DO_EVENTO)}`,
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'TRIGGER:-PT3H',
    `DESCRIPTION:${escapar(`${TITULO_DO_EVENTO} hoje, em ${cidade}`)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  // CRLF entre linhas e no fim, como o RFC pede.
  return `${linhas.map(dobrar).join('\r\n')}\r\n`;
}

/** Nome do arquivo baixado: `acelera-no-campo-vilhena.ics`. */
export function nomeDoArquivoIcs(cidade: string): string {
  const limpo = cidade
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `acelera-no-campo-${limpo || 'palestra'}.ics`;
}
