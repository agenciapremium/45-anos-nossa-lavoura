import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  SemAcesso,
  decidir,
  escopoCompleto,
  exigir,
  permitido,
  veCpfCompleto,
  type Escopo,
} from '@/lib/palestras/escopo';
import {
  mascararCpfParaRecepcao,
  mascararEmail,
} from '@/lib/palestras/mascaras';
import { mascararCpfParaExibicao } from '@/lib/palestras/cpf';

/* =========================================================
   Escopo por vínculo e recusa fora do escopo

   Os cenários aqui são os da spec `controle-de-acesso`, com nomes que
   permitem localizar o requisito correspondente.
   ========================================================= */

const REGIONAL_CENTRO = 'reg-centro';
const REGIONAL_SUL = 'reg-sul';
const LOJA_JPR01 = 'loja-jpr01';
const LOJA_VLH02 = 'loja-vlh02';

const admin: Escopo = {
  usuarioId: 'u-admin',
  papel: 'admin',
  regionalId: null,
  lojaId: null,
};
const gerenteRegional: Escopo = {
  usuarioId: 'u-greg',
  papel: 'gerente_regional',
  regionalId: REGIONAL_CENTRO,
  lojaId: null,
};
const gerenteDeLoja: Escopo = {
  usuarioId: 'u-gloja',
  papel: 'gerente_loja',
  regionalId: null,
  lojaId: LOJA_JPR01,
};
const colaborador: Escopo = {
  usuarioId: 'u-colab',
  papel: 'colaborador',
  regionalId: null,
  lojaId: LOJA_JPR01,
};
const recepcao: Escopo = {
  usuarioId: 'u-recep',
  papel: 'recepcao',
  regionalId: null,
  lojaId: null,
};

describe('escopo por vínculo', () => {
  it('gerente regional vê os convites das lojas da sua regional', () => {
    assert.equal(
      permitido(gerenteRegional, 'verConvitesEConfirmacoes', {
        regionalId: REGIONAL_CENTRO,
        lojaId: LOJA_JPR01,
      }),
      true,
    );
  });

  it('gerente regional NÃO vê os de outra regional', () => {
    assert.equal(
      permitido(gerenteRegional, 'verConvitesEConfirmacoes', {
        regionalId: REGIONAL_SUL,
        lojaId: LOJA_VLH02,
      }),
      false,
    );
  });

  it('gerente de loja vê só os da sua loja', () => {
    assert.equal(
      permitido(gerenteDeLoja, 'verConvitesEConfirmacoes', {
        lojaId: LOJA_JPR01,
      }),
      true,
    );
    assert.equal(
      permitido(gerenteDeLoja, 'verConvitesEConfirmacoes', {
        lojaId: LOJA_VLH02,
      }),
      false,
    );
  });

  it('colaborador vê só os convites gerados para ele', () => {
    assert.equal(
      permitido(colaborador, 'verConvitesEConfirmacoes', {
        colaboradorId: 'u-colab',
        lojaId: LOJA_JPR01,
      }),
      true,
    );
  });

  it('colaborador NÃO vê convite de colega da mesma loja', () => {
    // Mesma loja, mesma regional: o que separa é a autoria do convite.
    assert.equal(
      permitido(colaborador, 'verConvitesEConfirmacoes', {
        colaboradorId: 'u-outro',
        lojaId: LOJA_JPR01,
      }),
      false,
    );
  });

  it('Admin vê os de todas as regionais e lojas', () => {
    assert.equal(
      permitido(admin, 'verConvitesEConfirmacoes', {
        regionalId: REGIONAL_SUL,
        lojaId: LOJA_VLH02,
        colaboradorId: 'u-qualquer',
      }),
      true,
    );
  });
});

describe('acesso fora do escopo é recusado', () => {
  it('por URL: gerente abre a loja de outra regional e recebe recusa', () => {
    const decisao = decidir(gerenteRegional, 'verConvitesEConfirmacoes', {
      regionalId: REGIONAL_SUL,
    });
    assert.equal(decisao.permitido, false);
    assert.equal(decisao.permitido === false && decisao.motivo, 'escopo');
  });

  it('por identificador em requisição: colaborador pede o PDF de outro', () => {
    // A interface não oferece a ação; o identificador chega pela query.
    const decisao = decidir(colaborador, 'baixarPdfDeColaborador', {
      colaboradorId: 'u-outro',
    });
    assert.equal(decisao.permitido, false);
    assert.equal(decisao.permitido === false && decisao.motivo, 'escopo');
  });

  it('a recusa por papel e a recusa por escopo são erros do mesmo tipo', () => {
    // Quem chama não consegue produzir mensagens diferentes para as duas:
    // é a mesma classe, e a página de 403 não recebe o motivo.
    assert.throws(
      () => exigir(gerenteDeLoja, 'gerarLotes'),
      (erro: unknown) => erro instanceof SemAcesso && erro.motivo === 'papel',
    );
    assert.throws(
      () =>
        exigir(gerenteDeLoja, 'verConvitesEConfirmacoes', {
          lojaId: LOJA_VLH02,
        }),
      (erro: unknown) => erro instanceof SemAcesso && erro.motivo === 'escopo',
    );
  });

  it('o erro não carrega nenhum dado do recurso', () => {
    try {
      exigir(colaborador, 'baixarPdfDeColaborador', {
        colaboradorId: 'u-secreto',
        lojaId: 'loja-secreta',
      });
      assert.fail('deveria ter recusado');
    } catch (erro) {
      assert.ok(erro instanceof SemAcesso);
      const serializado = JSON.stringify({
        message: erro.message,
        acao: erro.acao,
        motivo: erro.motivo,
      });
      assert.ok(!serializado.includes('u-secreto'));
      assert.ok(!serializado.includes('loja-secreta'));
    }
  });

  it('recurso sem vínculo nenhum não passa por omissão', () => {
    // Um recurso com todos os campos nulos não pode "casar" com um escopo.
    assert.equal(
      permitido(gerenteDeLoja, 'verConvitesEConfirmacoes', {}),
      false,
    );
    assert.equal(
      permitido(colaborador, 'verConvitesEConfirmacoes', {
        colaboradorId: null,
      }),
      false,
    );
  });
});

describe('escopo incompleto não enxerga nada', () => {
  it('gerente de loja sem loja vinculada é escopo incompleto', () => {
    const quebrado: Escopo = { ...gerenteDeLoja, lojaId: null };
    assert.equal(escopoCompleto(quebrado), false);
    assert.equal(
      permitido(quebrado, 'verConvitesEConfirmacoes', { lojaId: LOJA_JPR01 }),
      false,
    );
  });

  it('gerente regional sem regional vinculada é escopo incompleto', () => {
    const quebrado: Escopo = { ...gerenteRegional, regionalId: null };
    assert.equal(escopoCompleto(quebrado), false);
  });

  it('Admin e recepção não exigem vínculo', () => {
    assert.equal(escopoCompleto(admin), true);
    assert.equal(escopoCompleto(recepcao), true);
  });
});

/* =========================================================
   CPF mascarado fora do papel de Admin
   ========================================================= */
describe('CPF completo só para o Admin', () => {
  it('só o Admin enxerga o valor completo', () => {
    assert.equal(veCpfCompleto(admin), true);
    for (const escopo of [gerenteRegional, gerenteDeLoja, colaborador, recepcao]) {
      assert.equal(veCpfCompleto(escopo), false, escopo.papel);
    }
  });

  it('a máscara da recepção é a do PRD: ***.456.789-**', () => {
    assert.equal(mascararCpfParaRecepcao('12345678909'), '***.456.789-**');
    assert.equal(mascararCpfParaRecepcao('123.456.789-09'), '***.456.789-**');
  });

  it('nenhuma máscara deixa passar os 11 dígitos seguidos', () => {
    const cpf = '12345678909';
    for (const mascarado of [
      mascararCpfParaRecepcao(cpf),
      mascararCpfParaExibicao(cpf),
    ]) {
      assert.ok(
        !/\d{11}/.test(mascarado.replace(/\D/g, '').padEnd(11, 'x')) ||
          mascarado.replace(/\D/g, '').length < 11,
        `máscara ${mascarado} ainda tem 11 dígitos`,
      );
    }
  });

  it('entrada inválida vira máscara, nunca o valor cru', () => {
    assert.equal(mascararCpfParaRecepcao('123'), '***.***.***-**');
    assert.equal(mascararCpfParaRecepcao(''), '***.***.***-**');
  });
});

/* =========================================================
   Máscara de e-mail · a única exceção deliberada à neutralidade
   ========================================================= */
describe('e-mail mascarado do fluxo de código', () => {
  it('usa o formato do PRD: m*****@gmail.com', () => {
    assert.equal(mascararEmail('maria@gmail.com'), 'm*****@gmail.com');
  });

  it('o número de asteriscos não denuncia o comprimento', () => {
    const curto = mascararEmail('ab@x.com');
    const longo = mascararEmail('abcdefghijklmno@x.com');
    assert.equal(curto.split('@')[0], longo.split('@')[0]);
  });

  it('normaliza maiúsculas', () => {
    assert.equal(mascararEmail('  Maria@GMail.COM '), 'm*****@gmail.com');
  });

  it('e-mail com arroba no domínio usa o último arroba', () => {
    assert.equal(mascararEmail('a@b@c.com'), 'a*****@c.com');
  });

  it('valor sem arroba não vaza nada', () => {
    assert.equal(mascararEmail('sem-arroba'), '*****');
    assert.equal(mascararEmail('@sodominio.com'), '*****');
  });
});
