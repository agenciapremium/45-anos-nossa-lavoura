import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { convite, loja, user } from '@/lib/db/schema';
import {
  confirmacoesNoEscopo,
  conviteNoEscopo,
  convitesNoEscopo,
  dadosParaExportacaoCsv,
  listaDeImpressao,
  ORIGEM_AVULSA,
  resumoNoEscopo,
  resumoPorColaborador,
  resumoPorLoja,
  resumoPorRegional,
  restricao,
} from '@/lib/palestras/dados';
import { permitido, type Escopo, type Recurso } from '@/lib/palestras/escopo';
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
