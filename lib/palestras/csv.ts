/* =========================================================
   CSV compatível com Excel em português (D7 do design de `operacao-evento`)

   Módulo puro: sem banco, sem `server-only`. A montagem do texto é
   testável sem infraestrutura nenhuma — só a leitura dos dados é que
   precisa do banco, e fica em `lib/palestras/dados.ts`.

   Duas escolhas, as duas por causa do Excel em pt-BR:

   - **Separador `;`, não `,`.** O Excel em português usa vírgula como
     separador decimal, então o CSV "internacional" (RFC 4180, separador
     vírgula) abre com tudo numa coluna só — é a reclamação mais comum de
     quem recebe um CSV gerado por uma ferramenta americana.
   - **BOM UTF-8.** Sem ele, o Excel abre o arquivo como se fosse
     Windows-1252, e "Espigão d'Oeste" vira "EspigÃ£o d'Oeste". Com o BOM,
     abre certo com duplo clique, sem passar pelo assistente de importação.
   ========================================================= */

export const SEPARADOR_CSV = ';';

/** Caractere de marca de ordem de byte, no início do arquivo. */
export const BOM_UTF8 = '﻿';

/** Uma célula precisa de aspas quando carrega o separador, aspas ou quebra de linha. */
function precisaDeAspas(valor: string): boolean {
  return /[;"\r\n]/.test(valor);
}

/**
 * Escapa uma célula pela regra do CSV: aspas duplicadas dentro de aspas,
 * só quando o conteúdo exige — um `titular_nome` comum sai sem aspas, um
 * endereço com `;`, com quebra de linha ou com `"` sai entre aspas e com
 * cada `"` interna dobrada.
 */
export function celulaCsv(valor: string | number | null | undefined): string {
  const texto = valor === null || valor === undefined ? '' : String(valor);
  if (!precisaDeAspas(texto)) return texto;
  return `"${texto.replace(/"/g, '""')}"`;
}

/**
 * Força o Excel a tratar o valor como **texto**, mesmo que pareça um
 * número — é o que preserva o zero à esquerda do CPF (D7: "para o Excel
 * não tratar como número e comer o zero à esquerda").
 *
 * Aspas sozinhas ao redor da célula **não bastam**: o Excel decide o tipo
 * de cada célula pelo conteúdo depois de tirar as aspas de escape do CSV,
 * não pela presença delas — um CPF entre aspas simples ainda vira número e
 * ainda perde o zero à esquerda ao abrir com duplo clique. O prefixo
 * `="…"` é o truque padrão para isso: o Excel avalia como fórmula de texto
 * ao abrir o arquivo.
 *
 * Devolve o valor **cru** (`="01234567890"`), não escapado — quem chama
 * passa isto para `linhaCsv`/`montarCsv` como qualquer outro campo, e o
 * escape do CSV (aspas + duplicação de aspas internas) acontece uma vez
 * só, no mesmo lugar de sempre. Escapar aqui e de novo em `celulaCsv`
 * duplicaria as aspas e corromperia o valor.
 */
export function valorDeTextoForcado(valor: string): string {
  return `="${valor}"`;
}

/** Uma linha do CSV, com os campos já escapados e unidos pelo separador. */
export function linhaCsv(campos: (string | number | null | undefined)[]): string {
  return campos.map(celulaCsv).join(SEPARADOR_CSV);
}

/**
 * Monta o arquivo inteiro: BOM, cabeçalho, linhas, tudo separado por
 * `\r\n` — a quebra de linha que o Excel do Windows espera.
 */
export function montarCsv(
  cabecalhos: string[],
  linhas: (string | number | null | undefined)[][],
): string {
  const todas = [cabecalhos.map(celulaCsv).join(SEPARADOR_CSV), ...linhas.map(linhaCsv)];
  return BOM_UTF8 + todas.join('\r\n') + '\r\n';
}
