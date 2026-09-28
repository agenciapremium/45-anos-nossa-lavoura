import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { conteudoProibido } from '@/lib/palestras/email/conteudo-proibido';
import {
  CODIGOS_INEXISTENTES_POR_IP,
  ENVIO_POR_IDENTIFICADOR,
  ENVIO_POR_IP,
  INTERVALO_MINIMO_DE_ENVIO_SEGUNDOS,
  LOGIN_POR_CPF,
  LOGIN_POR_IP,
  QUINZE_MINUTOS,
  TENTATIVAS_POR_CODIGO,
  VALIDADE_DO_CODIGO_SEGUNDOS,
  VALIDADE_DO_LINK_MAGICO_SEGUNDOS,
  avaliar,
  minutosAte,
} from '@/lib/palestras/limite-politicas';

/* =========================================================
   Políticas de limite

   A implementação do banco (`lib/palestras/limite.ts`) faz esta mesma
   conta em SQL. `avaliar` é a especificação executável dela: se as duas
   discordarem, é o SQL que está errado.
   ========================================================= */

const T0 = new Date('2026-10-13T19:00:00Z');
const emSegundos = (s: number) => new Date(T0.getTime() + s * 1000);

describe('políticas do PRD', () => {
  it('5 tentativas e 15 minutos de bloqueio por CPF', () => {
    assert.equal(LOGIN_POR_CPF.maximo, 5);
    assert.equal(LOGIN_POR_CPF.janelaSegundos, QUINZE_MINUTOS);
    assert.equal(QUINZE_MINUTOS, 900);
  });

  it('o limiar por IP é MAIOR que o por CPF', () => {
    // Uma loja inteira sai pelo mesmo IP (Risks do design). Com o mesmo
    // teto, três colegas errando uma vez cada bloqueariam a loja toda.
    assert.ok(
      LOGIN_POR_IP.maximo > LOGIN_POR_CPF.maximo,
      `IP (${LOGIN_POR_IP.maximo}) precisa ser maior que CPF (${LOGIN_POR_CPF.maximo})`,
    );
    assert.ok(ENVIO_POR_IP.maximo > ENVIO_POR_IDENTIFICADOR.maximo);
  });

  it('código vale 10 minutos e aceita 5 tentativas', () => {
    assert.equal(VALIDADE_DO_CODIGO_SEGUNDOS, 600);
    assert.equal(TENTATIVAS_POR_CODIGO, 5);
  });

  it('link mágico vale 15 minutos', () => {
    assert.equal(VALIDADE_DO_LINK_MAGICO_SEGUNDOS, 900);
  });

  it('há intervalo mínimo entre envios, além do limite por janela', () => {
    assert.ok(INTERVALO_MINIMO_DE_ENVIO_SEGUNDOS > 0);
    assert.ok(
      INTERVALO_MINIMO_DE_ENVIO_SEGUNDOS <
        ENVIO_POR_IDENTIFICADOR.janelaSegundos,
    );
  });

  it('varredura de códigos de convite tem política própria por IP', () => {
    assert.ok(CODIGOS_INEXISTENTES_POR_IP.maximo > 0);
    assert.equal(CODIGOS_INEXISTENTES_POR_IP.janelaSegundos, QUINZE_MINUTOS);
  });
});

describe('bloqueio por tentativas', () => {
  it('libera enquanto há folga e conta quantas sobram', () => {
    const r = avaliar(
      { tentativas: 2, ultimaTentativaEm: emSegundos(10) },
      LOGIN_POR_CPF,
      emSegundos(20),
    );
    assert.equal(r.permitido, true);
    assert.equal(r.tentativasRestantes, 3);
    assert.equal(r.liberadoEm, null);
  });

  it('a quinta tentativa errada fecha a porta', () => {
    const r = avaliar(
      { tentativas: 5, ultimaTentativaEm: emSegundos(100) },
      LOGIN_POR_CPF,
      emSegundos(101),
    );
    assert.equal(r.permitido, false);
    assert.equal(r.tentativasRestantes, 0);
  });

  it('bloqueado recusa mesmo com a credencial correta', () => {
    // A trava é consultada ANTES de conferir a credencial: quem está
    // bloqueado não tem a senha examinada.
    const r = avaliar(
      { tentativas: 9, ultimaTentativaEm: emSegundos(100) },
      LOGIN_POR_CPF,
      emSegundos(120),
    );
    assert.equal(r.permitido, false);
  });

  it('o bloqueio conta 15 minutos da ÚLTIMA tentativa, não da primeira', () => {
    // Uma tentativa no minuto 0 e quatro no minuto 14: com a primeira como
    // âncora, liberaria 60 segundos depois.
    const ultima = emSegundos(14 * 60);
    const r = avaliar(
      { tentativas: 5, ultimaTentativaEm: ultima },
      LOGIN_POR_CPF,
      emSegundos(14 * 60 + 1),
    );
    assert.equal(r.permitido, false);
    assert.equal(
      r.liberadoEm?.getTime(),
      ultima.getTime() + QUINZE_MINUTOS * 1000,
    );
  });

  it('o bloqueio expira sozinho, sem intervenção do Admin', () => {
    const r = avaliar(
      { tentativas: 5, ultimaTentativaEm: T0 },
      LOGIN_POR_CPF,
      emSegundos(QUINZE_MINUTOS + 1),
    );
    assert.equal(r.permitido, true);
    assert.equal(r.tentativasRestantes, LOGIN_POR_CPF.maximo);
    assert.equal(r.liberadoEm, null);
  });

  it('exatamente no fim da janela já está liberado', () => {
    const r = avaliar(
      { tentativas: 5, ultimaTentativaEm: T0 },
      LOGIN_POR_CPF,
      emSegundos(QUINZE_MINUTOS),
    );
    assert.equal(r.permitido, true);
  });

  it('sem tentativa nenhuma, a janela está inteira disponível', () => {
    const r = avaliar({ tentativas: 0, ultimaTentativaEm: null }, LOGIN_POR_CPF, T0);
    assert.equal(r.permitido, true);
    assert.equal(r.tentativasRestantes, 5);
  });

  it('o IP aguenta mais que o CPF antes de fechar', () => {
    const seisPorIp = avaliar(
      { tentativas: 6, ultimaTentativaEm: T0 },
      LOGIN_POR_IP,
      emSegundos(1),
    );
    const seisPorCpf = avaliar(
      { tentativas: 6, ultimaTentativaEm: T0 },
      LOGIN_POR_CPF,
      emSegundos(1),
    );
    assert.equal(seisPorIp.permitido, true, 'seis tentativas do IP ainda passam');
    assert.equal(seisPorCpf.permitido, false, 'seis tentativas do CPF já não');
  });
});

describe('mensagem de espera', () => {
  it('arredonda para cima e nunca diz “espere 0 minutos”', () => {
    assert.equal(minutosAte(emSegundos(1), T0), 1);
    assert.equal(minutosAte(emSegundos(61), T0), 2);
    assert.equal(minutosAte(emSegundos(900), T0), 15);
  });

  it('sem bloqueio, não há espera', () => {
    assert.equal(minutosAte(null, T0), 0);
    assert.equal(minutosAte(emSegundos(-10), T0), 0);
  });
});

/* =========================================================
   Conteúdo proibido em e-mail transacional
   ========================================================= */
describe('guarda de conteúdo dos e-mails', () => {
  it('reprova CPF com máscara no corpo', () => {
    const achado = conteudoProibido('<p>Seu CPF 123.456.789-09 foi usado.</p>');
    assert.equal(achado?.tipo, 'cpf');
  });

  it('reprova CPF só com dígitos', () => {
    assert.equal(
      conteudoProibido('<p>Confirme 12345678909 agora</p>')?.tipo,
      'cpf',
    );
  });

  it('reprova frase que entrega senha', () => {
    assert.equal(
      conteudoProibido('<p>Sua senha é abacaxi-roxo-2026</p>')?.tipo,
      'senha',
    );
    assert.equal(conteudoProibido('<p>senha: trocar123</p>')?.tipo, 'senha');
  });

  it('aprova o código de 6 dígitos, que é o conteúdo legítimo', () => {
    assert.equal(
      conteudoProibido('<p>Seu código é <b>482193</b>, vale 10 minutos.</p>'),
      null,
    );
  });

  it('aprova link de acesso com token longo', () => {
    assert.equal(
      conteudoProibido(
        '<a href="https://exemplo.com/palestras/entrar/link?t=abc123DEF456ghi">Entrar</a>',
      ),
      null,
    );
  });

  it('não confunde número dentro de atributo de estilo com CPF', () => {
    assert.equal(
      conteudoProibido('<td style="padding:12345678909px">Olá</td>'),
      null,
    );
  });
});
