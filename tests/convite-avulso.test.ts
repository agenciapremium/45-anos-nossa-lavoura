import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { convite, loja, user } from '@/lib/db/schema';
import {
  confirmacoesNoEscopo,
  conviteNoEscopo,
  convitesNoEscopo,
  dadosParaExportacaoCsv,
  listaDeImpressao,
  loteAvulsoNoEscopo,
  lotesAvulsosDaPalestra,
  ORIGEM_AVULSA,
  resumoAvulso,
  resumoNoEscopo,
  resumoPorColaborador,
  resumoPorLoja,
  resumoPorRegional,
  restricao,
} from '@/lib/palestras/dados';
import { permitido, type Escopo, type Recurso } from '@/lib/palestras/escopo';
import {
  origemDoConvite,
  origemEmUmaLinha,
  ROTULO_AVULSO_PADRAO,
} from '@/lib/palestras/origem';
import { pode } from '@/lib/palestras/papeis';

/* =========================================================
   Convite avulso e o escopo (D1, D2 e D3 do design de `convites-avulsos`)

   Convite avulso é o convite sem colaborador. No escopo, ele é um recurso
   com `colaboradorId`, `lojaId` e `regionalId` todos nulos, porque os três
   vêm do colaborador que não existe (D2). A trava tem duas metades, e cada
   uma é testada no seu próprio nível, sem tocar o banco:

   1. A autorização (`permitido`/`restricao`), pura: o Admin alcança o
      recurso sem colaborador porque o alcance dele é "todos" e não
      depende de vínculo; os demais papéis dependem de um vínculo que o
      avulso não tem, então a igualdade nunca casa.
   2. A implementação da consulta (`convitesNoEscopo` e companhia): o
      avulso só sobrevive à leitura se o join com `user` for `leftJoin`,
      não `innerJoin`. Testado pelo CÓDIGO da função
      (`Function.prototype.toString`), no mesmo espírito de
      `tests/copy.test.ts`: sem `DATABASE_URL`, e ainda assim uma prova
      sobre o que o código faz, não sobre o que a intenção diz que ele faz.
      É a regressão que D3 do design aponta como a mais provável desta
      change: um `innerJoin` esquecido faz o avulso desaparecer em
      silêncio, sem erro nenhum.
   ========================================================= */

const RECURSO_AVULSO: Recurso = {
  colaboradorId: null,
  lojaId: null,
  regionalId: null,
};

const admin: Escopo = {
  usuarioId: 'u-admin',
  papel: 'admin',
  regionalId: null,
  lojaId: null,
};
const gerenteRegional: Escopo = {
  usuarioId: 'u-greg',
  papel: 'gerente_regional',
  regionalId: 'reg-1',
  lojaId: null,
};
const gerenteDeLoja: Escopo = {
  usuarioId: 'u-gloja',
  papel: 'gerente_loja',
  regionalId: null,
  lojaId: 'loja-1',
};
const colaborador: Escopo = {
  usuarioId: 'u-colab',
  papel: 'colaborador',
  regionalId: null,
  lojaId: 'loja-1',
};

describe('convite avulso no escopo (D2 do design)', () => {
  it('Admin alcança o avulso: o alcance "todos" não depende de vínculo', () => {
    assert.equal(
      permitido(admin, 'verConvitesEConfirmacoes', RECURSO_AVULSO),
      true,
    );
  });

  it('colaborador não alcança o avulso: não há colaboradorId para casar', () => {
    assert.equal(
      permitido(colaborador, 'verConvitesEConfirmacoes', RECURSO_AVULSO),
      false,
    );
  });

  it('gerente de loja não alcança o avulso: não há lojaId para casar', () => {
    assert.equal(
      permitido(gerenteDeLoja, 'verConvitesEConfirmacoes', RECURSO_AVULSO),
      false,
    );
  });

  it('gerente regional não alcança o avulso: não há regionalId para casar', () => {
    assert.equal(
      permitido(gerenteRegional, 'verConvitesEConfirmacoes', RECURSO_AVULSO),
      false,
    );
  });

  it('recepção não alcança o avulso: nem chega a avaliar o recurso, o papel já recusa a ação', () => {
    assert.equal(pode('recepcao', 'verConvitesEConfirmacoes'), false);
  });

  it('restricao() do Admin é undefined: sem filtro, o avulso passa por omissão', () => {
    const colunas = {
      colaboradorId: convite.colaboradorId,
      lojaId: user.lojaId,
      regionalId: loja.regionalId,
    };
    assert.equal(restricao(admin, colunas), undefined);
  });
});

/* =========================================================
   O join que decide se o avulso sobrevive à leitura (D3 do design)
   ========================================================= */

/**
 * `[^,]*\.user\s*,` casa tanto `.leftJoin(user, ...)` quanto a forma que o
 * empacotador de teste (`tsx`/esbuild) produz em tempo de execução,
 * `.leftJoin(import_schema.user, ...)`: o que importa é o método chamado e
 * a tabela do outro lado, não o nome que o módulo recebeu ao ser
 * importado.
 */
const LEFT_JOIN_USER = /\.leftJoin\([^,]*\.user\s*,/;
const INNER_JOIN_USER = /\.innerJoin\([^,]*\.user\s*,/;

/**
 * `isNull(convite.colaboradorId)` como o transpilador o escreve. O `\)?`
 * cobre a forma `(0, mod.isNull)(...)` que o esbuild produz para preservar
 * a semântica de `this` em chamada indireta: sem ele, a regressão que este
 * teste existe para pegar passaria batida por uma questão de sintaxe do
 * bundle, não de comportamento do código.
 */
const ISNULL_COLABORADOR = /isNull\)?\([^)]*colaboradorId\)/;

describe('leftJoin em user nas leituras do Admin (D3 do design)', () => {
  it('convitesNoEscopo usa leftJoin em user, não innerJoin', () => {
    const codigo = convitesNoEscopo.toString();
    assert.equal(LEFT_JOIN_USER.test(codigo), true, 'esperava leftJoin(user)');
    assert.equal(
      INNER_JOIN_USER.test(codigo),
      false,
      'innerJoin(user) descartaria o convite avulso em silêncio',
    );
  });

  it('conviteNoEscopo (o detalhe) usa leftJoin em user, pelo mesmo motivo', () => {
    const codigo = conviteNoEscopo.toString();
    assert.equal(LEFT_JOIN_USER.test(codigo), true, 'esperava leftJoin(user)');
    assert.equal(
      INNER_JOIN_USER.test(codigo),
      false,
      'innerJoin(user) devolveria 404 para o Admin abrir o próprio convite avulso',
    );
  });

  it('confirmacoesNoEscopo usa leftJoin em user, não innerJoin', () => {
    const codigo = confirmacoesNoEscopo.toString();
    assert.equal(LEFT_JOIN_USER.test(codigo), true, 'esperava leftJoin(user)');
    assert.equal(
      INNER_JOIN_USER.test(codigo),
      false,
      'innerJoin(user) tiraria a confirmação avulsa do funil e do resumo',
    );
  });

  it('resumoNoEscopo reaproveita convitesNoEscopo, herdando o mesmo leftJoin', () => {
    assert.match(resumoNoEscopo.toString(), /convitesNoEscopo/);
  });
});

describe('innerJoin em user nos recortes por origem (D3 e D8 do design)', () => {
  it('resumoPorRegional continua com innerJoin: o avulso fica fora por construção', () => {
    const codigo = resumoPorRegional.toString();
    assert.equal(INNER_JOIN_USER.test(codigo), true, 'esperava innerJoin(user)');
    assert.equal(LEFT_JOIN_USER.test(codigo), false);
  });

  it('resumoPorLoja continua com innerJoin: o avulso fica fora por construção', () => {
    const codigo = resumoPorLoja.toString();
    assert.equal(INNER_JOIN_USER.test(codigo), true, 'esperava innerJoin(user)');
    assert.equal(LEFT_JOIN_USER.test(codigo), false);
  });

  it('resumoPorColaborador continua com innerJoin: o avulso fica fora por construção', () => {
    const codigo = resumoPorColaborador.toString();
    assert.equal(INNER_JOIN_USER.test(codigo), true, 'esperava innerJoin(user)');
    assert.equal(LEFT_JOIN_USER.test(codigo), false);
  });
});

/* =========================================================
   As duas leituras que o D3 do design não tinha nomeado

   O design listava três funções para virar `leftJoin` e três para
   continuar `innerJoin`. Eram cinco `innerJoin` em `user`, e as duas
   que faltavam são leitura, não recorte: a folha da porta e o CSV.
   Com join interno, quem confirmasse por convite avulso chegaria no
   evento com ingresso válido e não estaria na lista de contingência.
   ========================================================= */

describe('leitura da operação inclui o convite avulso', () => {
  it('listaDeImpressao usa leftJoin em user: a folha da porta não perde ninguém', () => {
    const codigo = listaDeImpressao.toString();
    assert.equal(LEFT_JOIN_USER.test(codigo), true, 'esperava leftJoin(user)');
    assert.equal(
      INNER_JOIN_USER.test(codigo),
      false,
      'innerJoin(user) apagaria da folha impressa quem confirmou por convite avulso',
    );
  });

  it('dadosParaExportacaoCsv usa leftJoin em user', () => {
    const codigo = dadosParaExportacaoCsv.toString();
    assert.equal(LEFT_JOIN_USER.test(codigo), true, 'esperava leftJoin(user)');
    assert.equal(
      INNER_JOIN_USER.test(codigo),
      false,
      'innerJoin(user) tiraria o convite avulso da planilha sem nenhum sinal',
    );
  });

  it('as duas trocam origem vazia por Administração, nunca deixam em branco', () => {
    assert.equal(ORIGEM_AVULSA, 'Administração');
    for (const fonte of [listaDeImpressao.toString(), dadosParaExportacaoCsv.toString()]) {
      assert.match(fonte, /ORIGEM_AVULSA|Administração/);
    }
  });
});

/* =========================================================
   Filtro por origem avulsa (tarefa 2.4)
   ========================================================= */

describe('filtro semColaborador em convitesNoEscopo (tarefa 2.4)', () => {
  it('o filtro existe e aciona isNull sobre colaboradorId', () => {
    const codigo = convitesNoEscopo.toString();
    assert.match(codigo, /filtro\.semColaborador/);
    assert.match(codigo, /isNull\)?\([^)]*colaboradorId/);
  });
});

/* =========================================================
   Origem do convite · o texto que nenhuma tela reinventa
   ========================================================= */

describe('origemDoConvite (D7 do design)', () => {
  it('convite de colaborador: o nome dele em cima, a loja embaixo', () => {
    const origem = origemDoConvite({
      colaboradorNome: 'Juliana Prado',
      lojaNome: 'NL-014 · Centro',
      loteRotulo: null,
    });
    assert.deepEqual(origem, {
      titulo: 'Juliana Prado',
      detalhe: 'NL-014 · Centro',
      avulso: false,
    });
  });

  it('convite avulso com rótulo: "Administração" em cima, o rótulo embaixo', () => {
    const origem = origemDoConvite({
      colaboradorNome: null,
      lojaNome: null,
      loteRotulo: 'Imprensa',
    });
    assert.deepEqual(origem, {
      titulo: ORIGEM_AVULSA,
      detalhe: 'Imprensa',
      avulso: true,
    });
  });

  it('convite avulso sem rótulo: o detalhe nunca fica vazio', () => {
    const origem = origemDoConvite({
      colaboradorNome: null,
      lojaNome: null,
      loteRotulo: null,
    });
    assert.equal(origem.titulo, ORIGEM_AVULSA);
    assert.equal(origem.detalhe, ROTULO_AVULSO_PADRAO);
    assert.notEqual(origem.detalhe, '');
    assert.notEqual(origem.detalhe, null);
  });

  it('quem manda é a ausência do colaborador, não a presença do rótulo', () => {
    // `palestra_convite.lote_id` é `on delete set null`: um convite avulso
    // pode perder o lote e ficar sem rótulo. Continua avulso.
    const semLote = origemDoConvite({
      colaboradorNome: null,
      lojaNome: null,
      loteRotulo: null,
    });
    assert.equal(semLote.avulso, true);

    // E um convite COM colaborador nunca é avulso, mesmo que por algum
    // motivo o lote dele tivesse rótulo.
    const comColaborador = origemDoConvite({
      colaboradorNome: 'Juliana Prado',
      lojaNome: 'NL-014 · Centro',
      loteRotulo: 'Imprensa',
    });
    assert.equal(comColaborador.avulso, false);
    assert.equal(comColaborador.titulo, 'Juliana Prado');
  });

  it('origemEmUmaLinha junta os dois com o ponto medial', () => {
    assert.equal(
      origemEmUmaLinha({ colaboradorNome: null, lojaNome: null, loteRotulo: 'Imprensa' }),
      'Administração · Imprensa',
    );
  });
});

/* =========================================================
   O check-in do convidado avulso

   A regressão mais grave possível desta change, e a razão de ela ter um
   teste próprio: o `select` que monta o resultado verde do check-in fazia
   `innerJoin` em `user` para trazer o colaborador de origem. Com convite
   avulso (sem colaborador), a consulta não devolvia linha, o serviço
   lançava `RecusaDeCheckin('invalido')`, a transação inteira era desfeita
   e a portaria via TELA VERMELHA para um convidado com ingresso válido.
   Não é campo em branco: é entrada negada.

   Aqui a prova é sobre o TEXTO do módulo, e não sobre uma função
   exportada, porque `executarCheckin` é interna ao serviço — no mesmo
   espírito de `tests/copy.test.ts`, que também lê o código como dado.
   ========================================================= */

const FONTE_DO_CHECKIN = fs.readFileSync(
  path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../lib/palestras/servicos/checkin.ts',
  ),
  'utf8',
);

describe('check-in do convidado avulso (requisito "Check-in de convidado avulso")', () => {
  it('o serviço usa leftJoin em user, nunca innerJoin', () => {
    assert.equal(
      /\.leftJoin\(tabelaUser\s*,/.test(FONTE_DO_CHECKIN),
      true,
      'esperava leftJoin(tabelaUser) no select do resultado do check-in',
    );
    assert.equal(
      /\.innerJoin\(tabelaUser\s*,/.test(FONTE_DO_CHECKIN),
      false,
      'innerJoin(tabelaUser) nega a entrada de quem confirmou por convite avulso',
    );
  });

  it('o resultado passa pela origem compartilhada, em vez de montar o texto à mão', () => {
    assert.match(FONTE_DO_CHECKIN, /origemDoConvite\(/);
    assert.match(FONTE_DO_CHECKIN, /ORIGEM_AVULSA/);
  });

  it('o resultado carrega o rótulo do lote, para a portaria saber de onde veio', () => {
    assert.match(FONTE_DO_CHECKIN, /rotuloDoLote/);
  });
});

/* =========================================================
   O recorte que fecha a conta
   ========================================================= */

describe('resumoAvulso (tarefa 6.5)', () => {
  it('conta só convite sem colaborador', () => {
    const codigo = resumoAvulso.toString();
    assert.match(codigo, ISNULL_COLABORADOR);
  });

  it('não faz join em user: não há colaborador para juntar', () => {
    const codigo = resumoAvulso.toString();
    assert.equal(LEFT_JOIN_USER.test(codigo), false);
    assert.equal(INNER_JOIN_USER.test(codigo), false);
  });

  it('recusa quem não é Admin, em vez de devolver zeros', async () => {
    // A recusa é síncrona na função async: o `throw` viaja na promessa.
    for (const escopo of [gerenteRegional, gerenteDeLoja, colaborador]) {
      await assert.rejects(
        () => resumoAvulso(escopo, {}),
        /verConvitesEConfirmacoes|acesso/i,
      );
    }
  });
});

describe('lotes avulsos só do Admin e só avulsos', () => {
  it('lotesAvulsosDaPalestra filtra por colaboradorId nulo', () => {
    const codigo = lotesAvulsosDaPalestra.toString();
    assert.match(codigo, ISNULL_COLABORADOR);
  });

  it('loteAvulsoNoEscopo filtra por colaboradorId nulo: lote de colaborador não abre aqui', () => {
    const codigo = loteAvulsoNoEscopo.toString();
    assert.match(codigo, ISNULL_COLABORADOR);
  });

  it('as duas recusam quem não é Admin', async () => {
    await assert.rejects(
      () => lotesAvulsosDaPalestra(gerenteRegional, 'ev-1'),
      /gerarLotes|acesso/i,
    );
    await assert.rejects(
      () => loteAvulsoNoEscopo(gerenteRegional, 'lote-1'),
      /gerarLotes|acesso/i,
    );
  });
});
