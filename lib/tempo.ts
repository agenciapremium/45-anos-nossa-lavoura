import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';

/**
 * Fuso do circuito. Rondônia é UTC-4 e não adota horário de verão, mas o
 * identificador IANA é usado em vez do offset fixo: se a regra mudar, o
 * sistema acompanha sem alteração de código (D8 do design).
 */
export const FUSO = 'America/Porto_Velho';

/**
 * Todo instante é gravado em `timestamptz` (UTC). A conversão para o fuso
 * do evento acontece só na borda: aqui.
 */

/** Data e hora "agora", como instante UTC. */
export function agora(): Date {
  return new Date();
}

/** `13/10/2026` */
export function formatarData(instante: Date): string {
  return formatInTimeZone(instante, FUSO, 'dd/MM/yyyy', { locale: ptBR });
}

/** `19h00` — o formato que aparece nas peças da campanha. */
export function formatarHorario(instante: Date): string {
  return formatInTimeZone(instante, FUSO, "HH'h'mm", { locale: ptBR });
}

/** `13/10/2026 às 19h00` */
export function formatarDataHora(instante: Date): string {
  return `${formatarData(instante)} às ${formatarHorario(instante)}`;
}

/** `13/10/2026 19:59` — carimbos e telas administrativas. */
export function formatarCarimbo(instante: Date): string {
  return formatInTimeZone(instante, FUSO, 'dd/MM/yyyy HH:mm', { locale: ptBR });
}

/** `terça-feira, 13 de outubro de 2026` */
export function formatarDataPorExtenso(instante: Date): string {
  return formatInTimeZone(instante, FUSO, "EEEE, d 'de' MMMM 'de' yyyy", {
    locale: ptBR,
  });
}

/** Valor para `<input type="datetime-local">`, já no fuso do evento. */
export function paraCampoDataHora(instante: Date): string {
  return formatInTimeZone(instante, FUSO, "yyyy-MM-dd'T'HH:mm");
}

/** Valor para `<input type="date">`, já no fuso do evento. */
export function paraCampoData(instante: Date): string {
  return formatInTimeZone(instante, FUSO, 'yyyy-MM-dd');
}

/**
 * Converte uma data e hora escrita no fuso do evento (`2026-10-13T19:00`,
 * como vem de um `<input type="datetime-local">`) no instante UTC
 * correspondente.
 */
export function deHoraLocal(dataHoraLocal: string): Date {
  const texto = dataHoraLocal.trim();
  const completo = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(texto)
    ? `${texto}:00`
    : texto;
  const instante = fromZonedTime(completo, FUSO);
  if (Number.isNaN(instante.getTime())) {
    throw new RangeError(`Data e hora inválidas: ${dataHoraLocal}`);
  }
  return instante;
}

/** Início do dia (00h00) no fuso do evento, como instante UTC. */
export function inicioDoDia(instante: Date): Date {
  return deHoraLocal(`${paraCampoData(instante)}T00:00:00`);
}

/** Fim do dia (23h59:59.999) no fuso do evento, como instante UTC. */
export function fimDoDia(instante: Date): Date {
  return new Date(inicioDoDia(instante).getTime() + 86_400_000 - 1);
}

/**
 * Prazo padrão de confirmação: **23h59 da véspera**, no fuso do evento.
 *
 * A conta é feita sobre a data civil em Porto Velho, não sobre o instante
 * UTC: uma palestra às 19h00 de 13/10 acontece às 23h00 UTC de 13/10, e a
 * véspera precisa ser 12/10 nos dois casos.
 */
export function prazoPadrao(dataHoraPalestra: Date): Date {
  const dataLocal = paraCampoData(dataHoraPalestra);
  return deHoraLocal(`${vesperaDe(dataLocal)}T23:59:00`);
}

/** `2026-10-13` -> `2026-10-12`, sem passar por fuso nenhum. */
function vesperaDe(dataLocal: string): string {
  const [ano, mes, dia] = dataLocal.split('-').map(Number);
  // Meio-dia UTC: longe o bastante das bordas para a subtração de um dia
  // nunca cair no dia errado por arredondamento.
  const anterior = new Date(
    Date.UTC(ano as number, (mes as number) - 1, dia as number, 12) -
      86_400_000,
  );
  const aa = anterior.getUTCFullYear();
  const mm = String(anterior.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(anterior.getUTCDate()).padStart(2, '0');
  return `${aa}-${mm}-${dd}`;
}

/** A data civil, no fuso do evento, do instante informado. */
export function dataCivil(instante: Date): string {
  return paraCampoData(instante);
}

/** Verdadeiro quando o prazo já venceu na referência informada. */
export function venceu(prazo: Date, referencia: Date = agora()): boolean {
  return referencia.getTime() > prazo.getTime();
}

/**
 * Dois instantes caem no mesmo dia civil, no fuso do evento? (`operacao-evento`, D4)
 *
 * "Dia da palestra" é o dia civil em America/Porto_Velho, de 00h00 a 23h59 —
 * não uma janela relativa ao horário do evento. Uma palestra às 19h aceita
 * check-in às 8h do mesmo dia civil; a mesma comparação, feita só com
 * `paraCampoData`, evita reimplementar o cálculo em cada lugar que precisa
 * saber se "hoje" é o dia de uma palestra.
 */
export function mesmoDiaCivil(a: Date, b: Date): boolean {
  return paraCampoData(a) === paraCampoData(b);
}

/** Objeto `Date` deslocado para o fuso do evento — só para cálculo de partes. */
export function noFusoDoEvento(instante: Date): Date {
  return toZonedTime(instante, FUSO);
}

/** Valida uma data no formato DD/MM/AAAA e devolve `AAAA-MM-DD`. */
export function dataBrParaISO(valor: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valor.trim());
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = Number(m[2]);
  const ano = Number(m[3]);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  if (ano < 1900 || ano > 2200) return null;
  // Existe no calendário? (31/02 e 29/02 de ano comum caem aqui.)
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  if (
    d.getUTCFullYear() !== ano ||
    d.getUTCMonth() !== mes - 1 ||
    d.getUTCDate() !== dia
  ) {
    return null;
  }
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/** `AAAA-MM-DD` -> `DD/MM/AAAA`. */
export function isoParaDataBr(valor: string): string {
  const [ano, mes, dia] = valor.split('-');
  return `${dia}/${mes}/${ano}`;
}
