import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  analisarCsv,
  CABECALHOS,
  LINHA_DE_CABECALHO,
  modeloCsv,
  relatorioDeErrosCsv,
} from '@/lib/palestras/importacao';

const CABECALHO = LINHA_DE_CABECALHO;

const linha = (campos: Partial<Record<(typeof CABECALHOS)[number], string>>) =>
  CABECALHOS.map((c) => campos[c] ?? '').join(',');

const COLABORADOR = {
  regional: 'Regional Centro',
  loja_codigo: 'JPR01',
  loja_nome: 'Nossa Lavoura 2 de Abril',
  loja_cidade: 'Ji-Paraná',
  nome: 'João da Silva',
  cpf: '529.982.247-25',
  data_nascimento: '15/03/1985',
  email: 'joao@exemplo.test',
  whatsapp: '(69) 99999-0000',
  papel: 'colaborador',
} as const;

function csv(...linhas: string[]) {
  return [CABECALHO, ...linhas].join('\n');
}

describe('modelo de CSV', () => {
  it('a primeira linha é o cabeçalho exato da spec', () => {
    assert.equal(
      modeloCsv().split('\n')[0],
      'regional,loja_codigo,loja_nome,loja_cidade,nome,cpf,data_nascimento,email,whatsapp,papel',
    );
  });

  it('traz um exemplo por papel que exige escopo', () => {
    const texto = modeloCsv();
    for (const papel of ['colaborador', 'gerente_loja', 'gerente_regional']) {
      assert.ok(texto.includes(`,${papel}`), `falta exemplo de ${papel}`);
    }
  });

  it('avisa sobre a coluna de CPF como texto', () => {
    assert.ok(/coluna inteira como texto/i.test(modeloCsv()));
  });

  it('o próprio modelo é aceito sem edição do cabeçalho', () => {
    const r = analisarCsv(modeloCsv());
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.erros.length, 0, JSON.stringify(r.erros, null, 2));
    assert.equal(r.validas.length, 4);
  });
});

describe('cabeçalho', () => {
  it('recusa o arquivo inteiro quando falta coluna', () => {
    const r = analisarCsv('regional,nome,cpf\nRegional,João,529.982.247-25');
    assert.equal(r.ok, false);
    if (r.ok) return;
    if (r.motivo !== 'cabecalho') assert.fail('motivo errado');
    assert.ok(r.faltando.includes('papel'));
    assert.ok(r.mensagem.includes('nenhuma linha foi processada'));
  });

  it('recusa coluna inesperada', () => {
    const r = analisarCsv(`${CABECALHO},setor\n`);
    assert.equal(r.ok, false);
    if (r.ok || r.motivo !== 'cabecalho') {
      assert.fail('deveria recusar pelo cabeçalho');
    }
    assert.deepEqual(r.inesperadas, ['setor']);
  });

  it('engole o BOM do Excel', () => {
    const r = analisarCsv(`﻿${csv(linha(COLABORADOR))}`);
    assert.equal(r.ok, true);
  });

  it('aceita quebra de linha do Windows', () => {
    const r = analisarCsv(
      [CABECALHO, linha(COLABORADOR)].join('\r\n'),
    );
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.validas.length, 1);
  });

  it('recusa arquivo vazio', () => {
    const r = analisarCsv('');
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.motivo, 'vazio');
  });
});

describe('validação linha a linha', () => {
  it('aceita a linha limpa e normaliza o CPF', () => {
    const r = analisarCsv(csv(linha(COLABORADOR)));
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.deepEqual(r.erros, []);
    assert.equal(r.validas[0]?.cpf, '52998224725');
    assert.equal(r.validas[0]?.dataNascimento, '1985-03-15');
    assert.equal(r.validas[0]?.linha, 2);
  });

  it('aponta campo obrigatório ausente, com a linha', () => {
    const r = analisarCsv(csv(linha({ ...COLABORADOR, nome: '' })));
    assert.equal(r.ok, true);
    if (!r.ok) return;
    const erro = r.erros.find((e) => e.campo === 'nome');
    assert.ok(erro, 'não apontou o campo nome');
    assert.equal(erro.linha, 2);
    assert.match(erro.motivo, /obrigatóri/i);
  });

  it('exige loja_codigo para colaborador e gerente_loja', () => {
    for (const papel of ['colaborador', 'gerente_loja']) {
      const r = analisarCsv(
        csv(linha({ ...COLABORADOR, papel, loja_codigo: '' })),
      );
      assert.equal(r.ok, true);
      if (!r.ok) return;
      const erro = r.erros.find((e) => e.campo === 'loja_codigo');
      assert.ok(erro, `${papel} passou sem loja`);
      assert.match(erro.motivo, new RegExp(papel));
    }
  });

  it('não exige loja para gerente_regional, admin e recepção', () => {
    for (const papel of ['gerente_regional', 'admin', 'recepcao']) {
      const r = analisarCsv(
        csv(
          linha({
            ...COLABORADOR,
            papel,
            loja_codigo: '',
            loja_nome: '',
            loja_cidade: '',
          }),
        ),
      );
      assert.equal(r.ok, true);
      if (!r.ok) return;
      assert.deepEqual(r.erros, [], `${papel} foi recusado`);
    }
  });

  it('lista os papéis aceitos quando o papel não existe', () => {
    const r = analisarCsv(csv(linha({ ...COLABORADOR, papel: 'vendedor' })));
    assert.equal(r.ok, true);
    if (!r.ok) return;
    const erro = r.erros.find((e) => e.campo === 'papel');
    assert.ok(erro);
    assert.match(erro.motivo, /colaborador/);
    assert.match(erro.motivo, /gerente_regional/);
  });

  it('recusa CPF com dígito verificador errado e aceita com máscara', () => {
    const ruim = analisarCsv(csv(linha({ ...COLABORADOR, cpf: '123.456.789-00' })));
    assert.equal(ruim.ok, true);
    if (!ruim.ok) return;
    assert.ok(ruim.erros.some((e) => e.campo === 'cpf'));

    const bom = analisarCsv(csv(linha({ ...COLABORADOR, cpf: '52998224725' })));
    assert.equal(bom.ok, true);
    if (!bom.ok) return;
    assert.deepEqual(bom.erros, []);
  });

  it('reconhece o zero perdido pelo Excel e explica', () => {
    // 031.180.140-40 formatado como número vira 3118014040.
    const r = analisarCsv(csv(linha({ ...COLABORADOR, cpf: '3118014040' })));
    assert.equal(r.ok, true);
    if (!r.ok) return;
    const erro = r.erros.find((e) => e.campo === 'cpf');
    assert.ok(erro);
    assert.match(erro.motivo, /10 dígitos/);
    assert.match(erro.motivo, /TEXTO/);
  });

  it('recusa data fora do formato ou inexistente', () => {
    for (const data of ['1985-03-15', '31/02/1985', '15/3/1985']) {
      const r = analisarCsv(
        csv(linha({ ...COLABORADOR, data_nascimento: data })),
      );
      assert.equal(r.ok, true);
      if (!r.ok) return;
      assert.ok(
        r.erros.some((e) => e.campo === 'data_nascimento'),
        `aceitou ${data}`,
      );
    }
  });

  it('aponta CPF repetido no arquivo, citando a linha anterior', () => {
    const r = analisarCsv(
      csv(
        linha(COLABORADOR),
        linha({ ...COLABORADOR, nome: 'Outro Nome', email: 'outro@exemplo.test' }),
      ),
    );
    assert.equal(r.ok, true);
    if (!r.ok) return;
    const erro = r.erros.find((e) => e.campo === 'cpf');
    assert.ok(erro);
    assert.equal(erro.linha, 3);
    assert.match(erro.motivo, /linha 2/);
    assert.equal(r.validas.length, 1, 'a primeira ocorrência continua válida');
  });

  it('aponta e-mail repetido com CPF diferente', () => {
    const r = analisarCsv(
      csv(
        linha(COLABORADOR),
        linha({
          ...COLABORADOR,
          nome: 'Maria Souza',
          cpf: '111.444.777-35',
        }),
      ),
    );
    assert.equal(r.ok, true);
    if (!r.ok) return;
    const erro = r.erros.find((e) => e.campo === 'email');
    assert.ok(erro);
    assert.equal(erro.linha, 3);
  });

  it('e-mail em branco não colide com outro em branco', () => {
    const r = analisarCsv(
      csv(
        linha({ ...COLABORADOR, email: '' }),
        linha({
          ...COLABORADOR,
          nome: 'Maria Souza',
          cpf: '111.444.777-35',
          email: '',
        }),
      ),
    );
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.deepEqual(r.erros, []);
    assert.equal(r.validas.length, 2);
  });

  it('reúne regionais e lojas distintas das linhas válidas', () => {
    const r = analisarCsv(
      csv(
        linha(COLABORADOR),
        linha({
          ...COLABORADOR,
          nome: 'Maria Souza',
          cpf: '111.444.777-35',
          email: 'maria@exemplo.test',
        }),
        linha({
          ...COLABORADOR,
          regional: 'Regional Sul',
          loja_codigo: 'VLH02',
          loja_nome: 'Nossa Lavoura Vilhena',
          loja_cidade: 'Vilhena',
          nome: 'Ana Rocha',
          cpf: '877.482.488-00',
          email: 'ana@exemplo.test',
        }),
      ),
    );
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.deepEqual(r.regionais.sort(), ['Regional Centro', 'Regional Sul']);
    assert.equal(r.lojas.length, 2);
  });

  it('uma linha com vários problemas gera vários erros e não é importada', () => {
    const r = analisarCsv(
      csv(linha({ regional: '', nome: '', cpf: 'abc', data_nascimento: 'x', papel: '' })),
    );
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.ok(r.erros.length >= 4);
    assert.equal(r.validas.length, 0);
  });
});

describe('relatório de erros', () => {
  it('traz linha, motivo e conteúdo original', () => {
    const r = analisarCsv(csv(linha({ ...COLABORADOR, cpf: '123.456.789-00' })));
    assert.equal(r.ok, true);
    if (!r.ok) return;

    const relatorio = relatorioDeErrosCsv(r.erros);
    const linhas = relatorio.split('\n');
    assert.equal(linhas[0], 'linha,campo,motivo,conteudo_original');
    assert.match(linhas[1] ?? '', /^2,cpf,/);
    assert.ok(relatorio.includes('123.456.789-00'));
  });

  it('escapa vírgula e aspas do conteúdo original', () => {
    const relatorio = relatorioDeErrosCsv([
      {
        linha: 7,
        campo: 'nome',
        motivo: 'Motivo, com vírgula',
        original: 'a,b,"c"',
      },
    ]);
    // Papaparse envolve o campo em aspas e dobra as internas.
    assert.ok(relatorio.includes('"Motivo, com vírgula"'));
    assert.ok(relatorio.includes('"a,b,""c"""'));
  });
});

describe('idempotência da análise', () => {
  it('analisar o mesmo arquivo duas vezes dá exatamente o mesmo resultado', () => {
    const arquivo = csv(
      linha(COLABORADOR),
      linha({
        ...COLABORADOR,
        nome: 'Maria Souza',
        cpf: '111.444.777-35',
        email: 'maria@exemplo.test',
        papel: 'gerente_loja',
      }),
    );
    const a = analisarCsv(arquivo);
    const b = analisarCsv(arquivo);
    assert.deepEqual(a, b);
  });
});
