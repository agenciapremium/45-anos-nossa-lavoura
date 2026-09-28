import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  gerarCodigo,
  iguaisEmTempoConstante,
  lerValor,
  montarValor,
  expiracaoDaSessao,
} from '@/lib/palestras/auth-plugins/comum';
import { destinoSeguro } from '@/lib/palestras/destino';
import {
  EXPRESSOES_QUE_VAZAM,
  MENSAGENS,
  mensagemDeBloqueio,
} from '@/lib/palestras/mensagens-de-acesso';
import {
  DOZE_HORAS_EM_SEGUNDOS,
  SETE_DIAS_EM_SEGUNDOS,
} from '@/lib/palestras/papeis';

/* =========================================================
   Respostas neutras

   D3 do design: CPF inexistente, CPF sem e-mail, senha errada, e-mail não
   cadastrado e usuário desativado produzem a MESMA resposta. A base é uma
   lista nominal de funcionários — confirmar a existência de um cadastro é
   vazamento, não conveniência.
   ========================================================= */

describe('mensagens neutras', () => {
  const todas = Object.entries(MENSAGENS);

  it('nenhuma mensagem afirma ou nega a existência de um cadastro', () => {
    for (const [nome, texto] of todas) {
      const minuscula = texto.toLowerCase();
      for (const expressao of EXPRESSOES_QUE_VAZAM) {
        assert.ok(
          !minuscula.includes(expressao),
          `MENSAGENS.${nome} contém "${expressao}"`,
        );
      }
    }
  });

  it('a mensagem de credencial serve aos cinco casos de recusa', () => {
    // Senha errada, CPF inexistente, usuário sem senha definida, usuário
    // desativado e papel de gestão no método fraco: uma frase só, que
    // oferece saída sem dizer qual foi o problema.
    assert.ok(/outro método de acesso/i.test(MENSAGENS.credencial));
    assert.ok(/administração/i.test(MENSAGENS.credencial));
    // E não nomeia campo nenhum: dizer "senha" já diria que o
    // identificador existe.
    assert.ok(!/\bsenha\b/i.test(MENSAGENS.credencial));
    assert.ok(!/\bcpf\b/i.test(MENSAGENS.credencial));
  });

  it('a resposta de envio é condicional e não confirma nada', () => {
    assert.ok(/^se houver/i.test(MENSAGENS.envio));
  });

  it('a mensagem de CPF sem e-mail aponta a saída sem confirmar o CPF', () => {
    assert.ok(/CPF e nascimento/i.test(MENSAGENS.semEmail));
    assert.ok(!/não (existe|encontrad)/i.test(MENSAGENS.semEmail));
  });

  it('a mensagem de bloqueio diz o tempo e nada mais', () => {
    const uma = mensagemDeBloqueio(1);
    const quinze = mensagemDeBloqueio(15);
    assert.ok(uma.includes('1 minuto') && !uma.includes('1 minutos'));
    assert.ok(quinze.includes('15 minutos'));
    for (const expressao of EXPRESSOES_QUE_VAZAM) {
      assert.ok(!quinze.toLowerCase().includes(expressao));
    }
  });
});

/* =========================================================
   Código de 6 dígitos
   ========================================================= */
describe('código de acesso', () => {
  it('tem sempre 6 dígitos, inclusive com zeros à esquerda', () => {
    for (let i = 0; i < 300; i++) {
      const codigo = gerarCodigo();
      assert.match(codigo, /^\d{6}$/, codigo);
    }
  });

  it('não repete o mesmo valor a cada chamada', () => {
    const vistos = new Set(Array.from({ length: 50 }, () => gerarCodigo()));
    assert.ok(vistos.size > 40, `variedade baixa: ${vistos.size}/50`);
  });

  it('o contador de tentativas vai e volta junto da impressão', () => {
    const impressao = 'abc.def.ghi';
    const valor = montarValor(impressao, 3);
    const lido = lerValor(valor);
    assert.equal(lido.impressao, impressao);
    assert.equal(lido.tentativas, 3);
  });

  it('valor sem contador é lido como zero tentativas', () => {
    assert.deepEqual(lerValor('abcdef'), {
      impressao: 'abcdef',
      tentativas: 0,
    });
  });

  it('o contador sobe sem perder a impressão', () => {
    let valor = montarValor('impressao-base64url_-', 0);
    for (let i = 1; i <= 5; i++) {
      const { impressao, tentativas } = lerValor(valor);
      valor = montarValor(impressao, tentativas + 1);
      assert.equal(lerValor(valor).tentativas, i);
      assert.equal(lerValor(valor).impressao, 'impressao-base64url_-');
    }
  });
});

describe('comparação em tempo constante', () => {
  it('aceita valores iguais', () => {
    assert.equal(iguaisEmTempoConstante('482193', '482193'), true);
  });

  it('recusa valores diferentes do mesmo tamanho', () => {
    assert.equal(iguaisEmTempoConstante('482193', '482194'), false);
  });

  it('recusa valores de tamanhos diferentes sem estourar', () => {
    assert.equal(iguaisEmTempoConstante('482193', '4821'), false);
    assert.equal(iguaisEmTempoConstante('', 'x'), false);
    assert.equal(iguaisEmTempoConstante('', ''), true);
  });
});

/* =========================================================
   Expiração de sessão
   ========================================================= */
describe('expiração calculada da sessão', () => {
  const agora = new Date('2026-10-13T19:00:00Z');

  it('colaborador: 12 horas à frente', () => {
    assert.equal(
      expiracaoDaSessao('colaborador', agora).getTime() - agora.getTime(),
      DOZE_HORAS_EM_SEGUNDOS * 1000,
    );
  });

  it('gerente regional: 7 dias à frente', () => {
    assert.equal(
      expiracaoDaSessao('gerente_regional', agora).getTime() - agora.getTime(),
      SETE_DIAS_EM_SEGUNDOS * 1000,
    );
  });
});

/* =========================================================
   Destino pós-login · redirecionamento aberto
   ========================================================= */
describe('destino pós-login', () => {
  const PADRAO = '/palestras/painel';

  it('aceita caminho interno do módulo', () => {
    assert.equal(
      destinoSeguro('/palestras/admin/gerar', PADRAO),
      '/palestras/admin/gerar',
    );
    assert.equal(
      destinoSeguro('/palestras/painel?palestra=1', PADRAO),
      '/palestras/painel?palestra=1',
    );
  });

  it('recusa URL absoluta para outro domínio', () => {
    assert.equal(destinoSeguro('https://site-falso.com', PADRAO), PADRAO);
    assert.equal(destinoSeguro('http://site-falso.com', PADRAO), PADRAO);
  });

  it('recusa a barra dupla, que o navegador lê como outro domínio', () => {
    assert.equal(destinoSeguro('//site-falso.com', PADRAO), PADRAO);
    assert.equal(destinoSeguro('/\\site-falso.com', PADRAO), PADRAO);
  });

  it('recusa caminho fora do módulo', () => {
    assert.equal(destinoSeguro('/foto-comemorativa', PADRAO), PADRAO);
    assert.equal(destinoSeguro('/', PADRAO), PADRAO);
  });

  it('recusa voltar para a própria tela de acesso', () => {
    assert.equal(destinoSeguro('/palestras/entrar', PADRAO), PADRAO);
    assert.equal(destinoSeguro('/palestras/entrar/codigo', PADRAO), PADRAO);
  });

  it('recusa caractere de controle, que injetaria cabeçalho', () => {
    assert.equal(destinoSeguro('/palestras/painel\nSet-Cookie: x', PADRAO), PADRAO);
  });

  it('sem destino, usa o padrão do papel', () => {
    assert.equal(destinoSeguro('', PADRAO), PADRAO);
    assert.equal(destinoSeguro('   ', PADRAO), PADRAO);
  });
});
