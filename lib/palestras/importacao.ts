import Papa from 'papaparse';

import { PAPEIS, type Papel } from '@/lib/db/schema';
import { cpfValido, somenteDigitos } from '@/lib/palestras/cpf';
import { dataBrParaISO } from '@/lib/tempo';

/* =========================================================
   Importação de colaboradores por CSV

   Este módulo é puro: recebe texto, devolve o que seria gravado e os erros.
   Não toca no banco. Isso permite testar a validação inteira sem Postgres, e
   é o que sustenta a etapa de pré-visualização — que, por definição, não
   grava nada.
   ========================================================= */

export const CABECALHOS = [
  'regional',
  'loja_codigo',
  'loja_nome',
  'loja_cidade',
  'nome',
  'cpf',
  'data_nascimento',
  'email',
  'whatsapp',
  'papel',
] as const;

export type Coluna = (typeof CABECALHOS)[number];

export const LINHA_DE_CABECALHO = CABECALHOS.join(',');

const PAPEIS_QUE_EXIGEM_LOJA: Papel[] = ['colaborador', 'gerente_loja'];

/**
 * Modelo baixável, com uma linha de exemplo por papel que exige escopo.
 *
 * A primeira linha de exemplo é `colaborador` de propósito: é o papel de
 * ~390 das ~400 linhas da planilha real, e serve de gabarito para o resto.
 */
export function modeloCsv(): string {
  const exemplos = [
    'Regional Centro,NL-014,Loja Jaru,Jaru,Maria Aparecida de Souza,529.982.247-25,07/09/1984,maria.souza@exemplo.com.br,(69) 99999-0001,colaborador',
    'Regional Centro,NL-014,Loja Jaru,Jaru,João Batista Ferreira,111.444.777-35,22/03/1979,,(69) 99999-0002,gerente_loja',
    'Regional Centro,,,,Ana Paula Rocha,877.482.488-00,15/11/1988,ana.rocha@exemplo.com.br,(69) 99999-0003,gerente_regional',
    'Regional Centro,NL-014,Loja Jaru,Jaru,Recepção Vilhena,031.180.140-40,01/01/1990,,,recepcao',
  ];
  return [
    LINHA_DE_CABECALHO,
    ...exemplos,
    '',
    '# Como preencher:',
    '# - Arquivo em UTF-8, separado por vírgula. Não altere a linha de cabeçalho.',
    '# - cpf: formate a COLUNA INTEIRA como TEXTO antes de digitar. Formatada como',
    '#   número, o Excel come o zero à esquerda e o CPF chega com 10 dígitos.',
    '# - data_nascimento: DD/MM/AAAA.',
    `# - papel: ${PAPEIS.join(', ')}.`,
    '# - loja_codigo, loja_nome e loja_cidade: obrigatórios para colaborador e',
    '#   gerente_loja. Para os demais papéis, deixe em branco.',
    '# - email: opcional. Quando informado, precisa ser único.',
    '# - Apague estas linhas de comentário e as de exemplo antes de enviar.',
  ].join('\n');
}

/* ---------------------------------------------------------
   Erros
   --------------------------------------------------------- */

export type ErroDeLinha = {
  /** Número da linha no arquivo, contando o cabeçalho como linha 1. */
  linha: number;
  campo: Coluna | null;
  motivo: string;
  original: string;
};

export type LinhaValida = {
  linha: number;
  regional: string;
  lojaCodigo: string | null;
  lojaNome: string | null;
  lojaCidade: string | null;
  nome: string;
  cpf: string;
  dataNascimento: string; // AAAA-MM-DD
  email: string | null;
  whatsapp: string | null;
  papel: Papel;
};

export type ResultadoDaAnalise =
  | {
      ok: false;
      motivo: 'cabecalho';
      faltando: string[];
      inesperadas: string[];
      mensagem: string;
    }
  | {
      ok: false;
      motivo: 'vazio';
      mensagem: string;
    }
  | {
      ok: true;
      validas: LinhaValida[];
      erros: ErroDeLinha[];
      /** Regionais e lojas distintas citadas pelas linhas válidas. */
      regionais: string[];
      lojas: { codigo: string; nome: string; cidade: string | null; regional: string }[];
    };

/* ---------------------------------------------------------
   Análise
   --------------------------------------------------------- */

/** Remove o BOM que o Excel grava no começo do arquivo. */
function semBom(texto: string): string {
  return texto.charCodeAt(0) === 0xfeff ? texto.slice(1) : texto;
}

/** Linhas de comentário e linhas em branco do modelo não são dados. */
function ehLinhaDescartavel(bruta: string): boolean {
  const t = bruta.trim();
  return t === '' || t.startsWith('#') || /^,+$/.test(t);
}

export function analisarCsv(conteudo: string): ResultadoDaAnalise {
  const texto = semBom(conteudo).replace(/\r\n/g, '\n');

  const analisado = Papa.parse<string[]>(texto, {
    delimiter: ',',
    skipEmptyLines: false,
  });

  const linhasBrutas = texto.split('\n');
  const matriz = analisado.data;

  const cabecalho = (matriz[0] ?? []).map((c) => c.trim().toLowerCase());
  if (cabecalho.length === 0 || cabecalho.every((c) => c === '')) {
    return {
      ok: false,
      motivo: 'vazio',
      mensagem: 'O arquivo está vazio.',
    };
  }

  const esperadas = new Set<string>(CABECALHOS);
  const recebidas = new Set(cabecalho.filter(Boolean));
  const faltando = [...esperadas].filter((c) => !recebidas.has(c));
  const inesperadas = [...recebidas].filter((c) => !esperadas.has(c));

  if (faltando.length || inesperadas.length) {
    const partes: string[] = [];
    if (faltando.length) partes.push(`faltam: ${faltando.join(', ')}`);
    if (inesperadas.length) {
      partes.push(`não reconhecidas: ${inesperadas.join(', ')}`);
    }
    return {
      ok: false,
      motivo: 'cabecalho',
      faltando,
      inesperadas,
      mensagem:
        'A linha de cabeçalho não confere com o modelo: nenhuma linha foi processada. ' +
        `Colunas ${partes.join('; ')}. ` +
        `O cabeçalho esperado é: ${LINHA_DE_CABECALHO}`,
    };
  }

  const indice = new Map(cabecalho.map((c, i) => [c, i]));
  const pegar = (linha: string[], coluna: Coluna) =>
    (linha[indice.get(coluna) ?? -1] ?? '').trim();

  const validas: LinhaValida[] = [];
  const erros: ErroDeLinha[] = [];

  // Duplicidade dentro do próprio arquivo.
  const cpfsVistos = new Map<string, number>();
  const emailsVistos = new Map<string, { linha: number; cpf: string }>();
  const lojasPorCodigo = new Map<
    string,
    { codigo: string; nome: string; cidade: string | null; regional: string }
  >();
  const regionais = new Set<string>();

  for (let i = 1; i < matriz.length; i++) {
    const linha = matriz[i] ?? [];
    const numero = i + 1; // cabeçalho é a linha 1
    const original = linhasBrutas[i] ?? linha.join(',');

    if (ehLinhaDescartavel(original)) continue;

    const erro = (campo: Coluna | null, motivo: string) => {
      erros.push({ linha: numero, campo, motivo, original });
    };
    const antes = erros.length;

    const regionalNome = pegar(linha, 'regional');
    const lojaCodigo = pegar(linha, 'loja_codigo');
    const lojaNome = pegar(linha, 'loja_nome');
    const lojaCidade = pegar(linha, 'loja_cidade');
    const nome = pegar(linha, 'nome');
    const cpfBruto = pegar(linha, 'cpf');
    const nascimento = pegar(linha, 'data_nascimento');
    const email = pegar(linha, 'email').toLowerCase();
    const whatsapp = pegar(linha, 'whatsapp');
    const papelBruto = pegar(linha, 'papel').toLowerCase();

    if (!regionalNome) erro('regional', 'A coluna regional é obrigatória.');
    if (!nome) erro('nome', 'A coluna nome é obrigatória.');
    if (!cpfBruto) erro('cpf', 'A coluna cpf é obrigatória.');
    if (!nascimento) {
      erro('data_nascimento', 'A coluna data_nascimento é obrigatória.');
    }
    if (!papelBruto) erro('papel', 'A coluna papel é obrigatória.');

    let papel: Papel | null = null;
    if (papelBruto) {
      if ((PAPEIS as readonly string[]).includes(papelBruto)) {
        papel = papelBruto as Papel;
      } else {
        erro(
          'papel',
          `Papel "${papelBruto}" não existe. Os aceitos são: ${PAPEIS.join(', ')}.`,
        );
      }
    }

    if (papel && PAPEIS_QUE_EXIGEM_LOJA.includes(papel) && !lojaCodigo) {
      erro(
        'loja_codigo',
        `loja_codigo é obrigatório para o papel ${papel}.`,
      );
    }

    let cpf = '';
    if (cpfBruto) {
      const digitos = somenteDigitos(cpfBruto);
      if (digitos.length > 0 && digitos.length < 11) {
        // Sintoma clássico de coluna formatada como número no Excel.
        erro(
          'cpf',
          `CPF com ${digitos.length} dígitos. Formate a coluna como TEXTO na planilha: ` +
            'como número, o zero à esquerda se perde.',
        );
      } else if (!cpfValido(digitos)) {
        erro('cpf', 'CPF inválido: o dígito verificador não confere.');
      } else {
        cpf = digitos;
      }
    }

    let dataIso: string | null = null;
    if (nascimento) {
      dataIso = dataBrParaISO(nascimento);
      if (!dataIso) {
        erro(
          'data_nascimento',
          `Data "${nascimento}" inválida. Use DD/MM/AAAA, com dia existente no calendário.`,
        );
      }
    }

    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      erro('email', `E-mail "${email}" inválido.`);
    }

    // Duplicidades internas: só fazem sentido com o valor já validado.
    if (cpf) {
      const anterior = cpfsVistos.get(cpf);
      if (anterior !== undefined) {
        erro(
          'cpf',
          `CPF repetido no arquivo: já aparece na linha ${anterior}.`,
        );
      } else {
        cpfsVistos.set(cpf, numero);
      }
    }
    if (email) {
      const anterior = emailsVistos.get(email);
      if (anterior && anterior.cpf !== cpf) {
        erro(
          'email',
          `E-mail repetido no arquivo, com CPF diferente: já aparece na linha ${anterior.linha}.`,
        );
      } else if (!anterior) {
        emailsVistos.set(email, { linha: numero, cpf });
      }
    }

    if (erros.length > antes) continue;

    validas.push({
      linha: numero,
      regional: regionalNome,
      lojaCodigo: lojaCodigo || null,
      lojaNome: lojaNome || null,
      lojaCidade: lojaCidade || null,
      nome,
      cpf,
      dataNascimento: dataIso as string,
      email: email || null,
      whatsapp: whatsapp || null,
      papel: papel as Papel,
    });

    regionais.add(regionalNome);
    if (lojaCodigo) {
      lojasPorCodigo.set(lojaCodigo, {
        codigo: lojaCodigo,
        nome: lojaNome || lojaCodigo,
        cidade: lojaCidade || null,
        regional: regionalNome,
      });
    }
  }

  return {
    ok: true,
    validas,
    erros,
    regionais: [...regionais],
    lojas: [...lojasPorCodigo.values()],
  };
}

/* ---------------------------------------------------------
   Relatório de erros
   --------------------------------------------------------- */

export function relatorioDeErrosCsv(erros: ErroDeLinha[]): string {
  const linhas = [
    ['linha', 'campo', 'motivo', 'conteudo_original'],
    ...erros.map((e) => [
      String(e.linha),
      e.campo ?? '',
      e.motivo,
      e.original,
    ]),
  ];
  return Papa.unparse(linhas, { delimiter: ',', newline: '\n' });
}
