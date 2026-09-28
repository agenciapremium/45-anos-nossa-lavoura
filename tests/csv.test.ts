import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  BOM_UTF8,
  celulaCsv,
  linhaCsv,
  montarCsv,
  SEPARADOR_CSV,
  valorDeTextoForcado,
} from '@/lib/palestras/csv';

/* =========================================================
   CSV compatível com Excel em pt-BR · spec `exportacao-csv` (D7 do design)
   ========================================================= */

describe('separador e BOM', () => {
  it('usa ponto e vírgula como separador', () => {
    assert.equal(SEPARADOR_CSV, ';');
  });

  it('o arquivo monta com o BOM UTF-8 no início', () => {
    const csv = montarCsv(['a', 'b'], [['1', '2']]);
    assert.equal(csv.startsWith(BOM_UTF8), true);
    assert.equal(csv.charCodeAt(0), 0xfeff);
  });

  it('cada linha termina com \\r\\n (quebra de linha do Windows)', () => {
    const csv = montarCsv(['a'], [['1'], ['2']]);
    const semBom = csv.slice(1);
    assert.equal(semBom, 'a\r\n1\r\n2\r\n');
  });
});

describe('escape de valores', () => {
  it('valor simples não ganha aspas', () => {
    assert.equal(celulaCsv('Vilhena'), 'Vilhena');
  });

  it('valor com o separador ganha aspas', () => {
    assert.equal(celulaCsv('Rua A; Sala 2'), '"Rua A; Sala 2"');
  });

  it('valor com aspas duplica as aspas internas e envolve com aspas', () => {
    assert.equal(celulaCsv('Fazenda "Boa Vista"'), '"Fazenda ""Boa Vista"""');
  });

  it('valor com quebra de linha ganha aspas', () => {
    assert.equal(celulaCsv('linha 1\nlinha 2'), '"linha 1\nlinha 2"');
  });

  it('null e undefined viram célula vazia', () => {
    assert.equal(celulaCsv(null), '');
    assert.equal(celulaCsv(undefined), '');
  });

  it('uma linha inteira, com um campo que precisa de escape no meio', () => {
    assert.equal(
      linhaCsv(['Vilhena', 'Fazenda "Boa Vista"', 'corte']),
      'Vilhena;"Fazenda ""Boa Vista""";corte',
    );
  });
});

describe('CPF preservado como texto (D7)', () => {
  it('o valor forçado carrega o prefixo de fórmula do Excel', () => {
    assert.equal(valorDeTextoForcado('01234567890'), '="01234567890"');
  });

  it('depois de escapado numa linha, o zero à esquerda continua no texto', () => {
    const linha = linhaCsv(['convite-1', valorDeTextoForcado('01234567890')]);
    assert.equal(linha, 'convite-1;"=""01234567890"""');
    // A célula inteira, ainda entre aspas (D7: "CPF exportado com
    // aspas") — e com o dígito zero preservado dentro do texto.
    assert.match(linha, /"=""01234567890"""$/);
    assert.equal(linha.includes('01234567890'), true);
  });

  it('CPF ausente (convite sem confirmação) não vira "=""""" — a coluna fica vazia', () => {
    // A rota de exportação só chama `valorDeTextoForcado` quando há CPF;
    // sem ele, o campo é `null`, que `celulaCsv` transforma em string vazia.
    assert.equal(celulaCsv(null), '');
  });

  it('mascarado ou completo, o formato de força de texto é o mesmo', () => {
    assert.equal(
      linhaCsv([valorDeTextoForcado('***.456.789-**')]),
      '"=""***.456.789-**"""',
    );
  });
});
