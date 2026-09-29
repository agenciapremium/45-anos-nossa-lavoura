import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

/* =========================================================
   Copy sem travessão (D8 do design, tarefa 8.1)

   Regra de copy: `—` (travessão) e `–` (meia-risca) não aparecem em texto
   de interface. Em vez de confiar em disciplina de revisão, este teste
   varre `app/`, `components/` e `lib/palestras/` (as mesmas três pastas da
   spec `sistema-visual`) procurando os dois caracteres.

   A parte que importa: a varredura acontece pela ÁRVORE SINTÁTICA de cada
   arquivo (via `typescript`, já uma dependência do projeto para o
   `tsc --noEmit`), não pelo texto bruto. Um literal de string, de
   template ou de texto JSX vira nó da árvore; um comentário de linha, de
   bloco ou dentro de JSX nunca vira nó, é só "trivia" entre dois nós
   (`ts.forEachChild` nem o enxerga). Por isso um travessão dentro de um
   comentário jamais chega a ser avaliado aqui: não é regra escrita à mão
   para reconhecer comentário, é a própria árvore que já os deixa de fora.

   O teste falha nomeando arquivo, linha e o trecho do literal — o
   suficiente para achar o ponto exato sem adivinhar.
   ========================================================= */

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PASTAS_VARRIDAS = ['app', 'components', 'lib/palestras'];
const TRAVESSAO_OU_MEIA_RISCA = /[–—]/;

type Violacao = {
  arquivo: string;
  linha: number;
  trecho: string;
};

/**
 * Casos já conhecidos (tarefa 8.2) em que o caractere é valor de SAÍDA DE
 * DADOS — um arquivo que a pessoa baixa e mantém — e não texto de
 * interface. A varredura de 8.2 listou estes pontos para decisão humana
 * em vez de mudar sozinha: alterar o texto alteraria o arquivo que a
 * pessoa já recebeu. Este teste respeita a mesma decisão, com a lista
 * documentada aqui em vez de espalhada em `eslint-disable`.
 *
 * Chave: `<caminho relativo à raiz do repo>:<linha 1-based>`.
 */
const EXCECOES_DE_SAIDA_DE_DADOS = new Set<string>([
  // LEIA-ME.txt do lote de PDFs de distribuição: texto explicativo dentro
  // do próprio arquivo ZIP que o Admin baixa — não é tela.
  'app/palestras/(interno)/admin/distribuir/lote/route.tsx:114',
]);

function listarArquivosDeCodigo(dir: string, saida: string[]): void {
  if (!fs.existsSync(dir)) return;
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entrada.name === 'node_modules') continue;
    const caminho = path.join(dir, entrada.name);
    if (entrada.isDirectory()) {
      listarArquivosDeCodigo(caminho, saida);
    } else if (
      (entrada.name.endsWith('.ts') || entrada.name.endsWith('.tsx')) &&
      !entrada.name.endsWith('.d.ts')
    ) {
      saida.push(caminho);
    }
  }
}

/** O texto "de conteúdo" de um nó, quando ele é literal de string, de
 *  template ou texto JSX — os três jeitos de um travessão aparecer em
 *  texto de interface. Qualquer outro nó devolve `null` e é só descido. */
function textoDeConteudo(no: ts.Node): string | null {
  if (ts.isStringLiteral(no) || ts.isNoSubstitutionTemplateLiteral(no)) return no.text;
  if (ts.isTemplateLiteralToken(no)) return no.text;
  if (ts.isJsxText(no)) return no.text;
  return null;
}

/**
 * Varre uma árvore já parseada e devolve as ocorrências de travessão ou
 * meia-risca nos literais de conteúdo, sem aplicar a lista de exceções
 * (isso é responsabilidade de quem chama, na varredura real de arquivos).
 * Separado da leitura de disco para o próprio mecanismo ser testável com
 * uma fonte inline (segunda descrição abaixo).
 */
function encontrarTravessoes(sourceFile: ts.SourceFile): Violacao[] {
  const violacoes: Violacao[] = [];

  function visitar(no: ts.Node): void {
    const texto = textoDeConteudo(no);
    if (texto !== null && TRAVESSAO_OU_MEIA_RISCA.test(texto)) {
      const { line } = sourceFile.getLineAndCharacterOfPosition(no.getStart(sourceFile));
      violacoes.push({
        arquivo: sourceFile.fileName,
        linha: line + 1,
        trecho: texto.trim().slice(0, 120),
      });
    }
    ts.forEachChild(no, visitar);
  }

  visitar(sourceFile);
  return violacoes;
}

function parsear(nomeDoArquivo: string, codigoFonte: string): ts.SourceFile {
  const scriptKind = nomeDoArquivo.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(
    nomeDoArquivo,
    codigoFonte,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    scriptKind,
  );
}

describe('copy sem travessão (D8 do design, tarefa 8.1)', () => {
  it('nenhum literal de interface em app/, components/ ou lib/palestras/ contém — ou –', () => {
    const arquivos: string[] = [];
    for (const pasta of PASTAS_VARRIDAS) {
      listarArquivosDeCodigo(path.join(RAIZ, pasta), arquivos);
    }
    assert.ok(arquivos.length > 100, 'a varredura deveria alcançar centenas de arquivos');

    const violacoes: Violacao[] = [];
    for (const caminhoAbsoluto of arquivos) {
      const codigoFonte = fs.readFileSync(caminhoAbsoluto, 'utf8');
      const sourceFile = parsear(caminhoAbsoluto, codigoFonte);
      for (const v of encontrarTravessoes(sourceFile)) {
        const relativo = path.relative(RAIZ, caminhoAbsoluto).split(path.sep).join('/');
        const chave = `${relativo}:${v.linha}`;
        if (EXCECOES_DE_SAIDA_DE_DADOS.has(chave)) continue;
        violacoes.push({ ...v, arquivo: relativo });
      }
    }

    if (violacoes.length > 0) {
      const relatorio = violacoes
        .map((v) => `  ${v.arquivo}:${v.linha}  "${v.trecho}"`)
        .join('\n');
      assert.fail(
        `${violacoes.length} travessão(ões) em texto de interface (— ou –). ` +
          'Troque por " · " para separar, dois-pontos para explicar, vírgula ' +
          'para apor, parênteses para definir, ou "de X a Y" para intervalo:\n' +
          relatorio,
      );
    }
  });

  it('não reprova travessão dentro de comentário de código (//, /* */, {/* */})', () => {
    const fonte = `
      // um comentário de linha com travessão — não deveria contar
      /* um comentário de bloco com travessão — também não deveria contar */
      function Exemplo() {
        return (
          <div>
            {/* comentário JSX com travessão — idem */}
            <p>Texto de interface sem problema</p>
          </div>
        );
      }
    `;
    const violacoes = encontrarTravessoes(parsear('exemplo.tsx', fonte));
    assert.deepEqual(violacoes, []);
  });

  it('reprova travessão em texto de interface (JSX, string e template literal)', () => {
    const fonteComJsx = `const x = <p>Confirmado — presente</p>;`;
    const fonteComString = `const rotulo = 'Confirmado — presente';`;
    const fonteComTemplate = `const rotulo = \`Confirmado \${estado} — presente\`;`;

    for (const fonte of [fonteComJsx, fonteComString, fonteComTemplate]) {
      const violacoes = encontrarTravessoes(parsear('exemplo.tsx', fonte));
      assert.equal(violacoes.length, 1, `deveria achar 1 travessão em: ${fonte}`);
    }
  });

  it('a lista de exceções de saída de dados só cobre o que já foi decidido (8.2)', () => {
    // Documenta o tamanho esperado: crescer aqui exige justificativa no
    // relatório da change, não é um ajuste silencioso para o teste passar.
    assert.equal(EXCECOES_DE_SAIDA_DE_DADOS.size, 1);
  });
});
