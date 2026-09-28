/**
 * Um módulo `'use server'` só pode exportar **funções async**.
 *
 * Exportar qualquer outro valor de lá derruba a rota em tempo de execução
 * com "A `use server` file can only export async functions, found object"
 * — e nem `next build` nem `tsc` pegam. Foi assim que a tela de acesso
 * quebrou em produção: sete arquivos de Server Actions exportavam o
 * objeto de estado inicial do `useActionState`.
 *
 * O estado inicial vive em `estado.ts`, ao lado. Este teste existe para
 * que ninguém o traga de volta sem perceber.
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

function arquivosTs(raiz: string): string[] {
  const achados: string[] = [];
  for (const entrada of readdirSync(raiz)) {
    if (entrada === 'node_modules' || entrada === '.next') continue;
    const caminho = join(raiz, entrada);
    if (statSync(caminho).isDirectory()) achados.push(...arquivosTs(caminho));
    else if (/\.tsx?$/.test(entrada)) achados.push(caminho);
  }
  return achados;
}

/** Declarações de valor exportadas: tipos e interfaces são apagados na compilação. */
const EXPORTA_VALOR =
  /^export\s+(const|let|var|class|enum|default)\b|^export\s+function\s+(?!.*\basync\b)/gm;

const DIRETIVA = /^\s*['"]use server['"]\s*;/;

test('módulo com "use server" exporta apenas funções async', () => {
  const arquivos = [...arquivosTs('app'), ...arquivosTs('lib')];
  const comDiretiva = arquivos.filter((f) =>
    DIRETIVA.test(readFileSync(f, 'utf8')),
  );

  // Se a busca parar de encontrar os arquivos, o teste vira decoração.
  assert.ok(
    comDiretiva.length > 0,
    'nenhum módulo "use server" encontrado — a varredura quebrou',
  );

  const problemas: string[] = [];
  for (const arquivo of comDiretiva) {
    const conteudo = readFileSync(arquivo, 'utf8');
    for (const m of conteudo.matchAll(EXPORTA_VALOR)) {
      const linha = conteudo.slice(0, m.index).split('\n').length;
      problemas.push(`${arquivo}:${linha} → ${m[0].trim()}`);
    }
  }

  assert.deepEqual(
    problemas,
    [],
    'valores exportados de módulo "use server" (mova para um módulo ao lado):\n' +
      problemas.join('\n'),
  );
});

test('exportar uma função não-async seria detectado', () => {
  // Guarda do próprio padrão: se ele parar de casar, o teste acima passa à toa.
  assert.match('export function sincrona() {}', new RegExp(EXPORTA_VALOR.source, 'm'));
  assert.match('export const X = 1;', new RegExp(EXPORTA_VALOR.source, 'm'));
  assert.doesNotMatch(
    'export async function ok() {}',
    new RegExp(EXPORTA_VALOR.source, 'm'),
  );
  assert.doesNotMatch('export type X = { a: 1 };', new RegExp(EXPORTA_VALOR.source, 'm'));
});
