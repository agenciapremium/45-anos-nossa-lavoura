import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  aplicarZoom,
  caixaJanela,
  centroJanela,
  dentroDaJanela,
  enquadrar,
  fatorDeReducao,
  FORMATOS,
  LADO_MAX,
  QUALIDADE_JPEG,
  SANGRIA,
  ZOOM_MAX,
  ZOOM_MIN,
} from '@/components/foto-comemorativa/geometria';

/**
 * Trava de regressão da foto comemorativa.
 *
 * Os valores esperados saem da versão ESTÁTICA (`foto-comemorativa.js`),
 * conferidos por comparação pixel a pixel das imagens geradas pelas duas
 * implementações com a mesma foto de origem — `pasto-2400.webp`, 2400×1600 —
 * nos dois formatos e em seis cenários de zoom e arrasto: zero pixels
 * diferentes e JPEGs byte a byte iguais.
 *
 * Se algum número aqui mudar sem que a arte da moldura tenha mudado, a foto
 * das pessoas vai sair enquadrada diferente da que elas já baixaram.
 */
describe('constantes da moldura', () => {
  it('não mudaram na migração', () => {
    assert.equal(SANGRIA, 6);
    assert.equal(LADO_MAX, 2400);
    assert.equal(ZOOM_MIN, 0.1);
    assert.equal(ZOOM_MAX, 10);
    assert.equal(QUALIDADE_JPEG, 0.92);
  });

  it('a geometria das janelas é a medida na arte', () => {
    assert.deepEqual(FORMATOS.perfil.janela, {
      tipo: 'circulo',
      cx: 526,
      cy: 564,
      r: 507.5,
    });
    assert.deepEqual(FORMATOS.story.janela, {
      tipo: 'retangulo',
      x: 68,
      y: 80,
      w: 944,
      h: 1759,
    });
    assert.deepEqual(
      [FORMATOS.perfil.w, FORMATOS.perfil.h],
      [1080, 1080],
    );
    assert.deepEqual([FORMATOS.story.w, FORMATOS.story.h], [1080, 1920]);
  });
});

describe('caixa e centro da janela', () => {
  it('perfil: quadrado de 1027 em volta do círculo', () => {
    assert.deepEqual(caixaJanela(FORMATOS.perfil), {
      x: 12.5,
      y: 50.5,
      w: 1027,
      h: 1027,
    });
    assert.deepEqual(centroJanela(FORMATOS.perfil), { x: 526, y: 564 });
  });

  it('story: retângulo de 956 × 1771', () => {
    assert.deepEqual(caixaJanela(FORMATOS.story), {
      x: 62,
      y: 74,
      w: 956,
      h: 1771,
    });
    assert.deepEqual(centroJanela(FORMATOS.story), { x: 540, y: 959.5 });
  });
});

describe('teste de toque na janela', () => {
  it('perfil: dentro do círculo com sangria, fora depois dele', () => {
    assert.equal(dentroDaJanela(FORMATOS.perfil, 526, 564), true);
    assert.equal(dentroDaJanela(FORMATOS.perfil, 526, 564 + 513), true);
    assert.equal(dentroDaJanela(FORMATOS.perfil, 526, 564 + 514), false);
    assert.equal(dentroDaJanela(FORMATOS.perfil, 0, 0), false);
  });

  it('story: dentro do retângulo com sangria', () => {
    assert.equal(dentroDaJanela(FORMATOS.story, 62, 74), true);
    assert.equal(dentroDaJanela(FORMATOS.story, 61, 74), false);
    assert.equal(dentroDaJanela(FORMATOS.story, 1018, 1845), true);
    assert.equal(dentroDaJanela(FORMATOS.story, 1019, 1845), false);
  });
});

describe('enquadramento inicial', () => {
  const foto = { width: 2400, height: 1600 };

  it('perfil cobre a janela e centraliza', () => {
    const e = enquadrar(FORMATOS.perfil, foto);
    assert.equal(e.escala, 0.641875);
    assert.equal(e.offset.x, -244.25);
    assert.equal(e.offset.y, 50.5);
  });

  it('story cobre a janela e centraliza', () => {
    const e = enquadrar(FORMATOS.story, foto);
    assert.equal(e.escala, 1.106875);
    assert.equal(e.offset.x, -788.25);
    assert.equal(e.offset.y, 74);
  });

  it('a foto sempre cobre a caixa inteira, em qualquer proporção', () => {
    const proporcoes = [
      { width: 3000, height: 4000 },
      { width: 4000, height: 3000 },
      { width: 1000, height: 1000 },
      { width: 2400, height: 400 },
    ];
    for (const f of [FORMATOS.perfil, FORMATOS.story]) {
      const b = caixaJanela(f);
      for (const p of proporcoes) {
        const e = enquadrar(f, p);
        assert.ok(p.width * e.escala >= b.w - 1e-9, 'cobre a largura');
        assert.ok(p.height * e.escala >= b.h - 1e-9, 'cobre a altura');
      }
    }
  });
});

describe('zoom', () => {
  it('mantém fixo o ponto sob o dedo', () => {
    const inicio = { escala: 1, offset: { x: 0, y: 0 } };
    const depois = aplicarZoom(inicio, 2, 300, 220);
    // O ponto (300,220) da tela continua apontando para o mesmo pixel da foto.
    const antes = { x: (300 - 0) / 1, y: (220 - 0) / 1 };
    const agora = {
      x: (300 - depois.offset.x) / depois.escala,
      y: (220 - depois.offset.y) / depois.escala,
    };
    assert.ok(Math.abs(antes.x - agora.x) < 1e-9);
    assert.ok(Math.abs(antes.y - agora.y) < 1e-9);
  });

  it('respeita o teto e o piso', () => {
    let e = { escala: 1, offset: { x: 0, y: 0 } };
    for (let i = 0; i < 40; i++) e = aplicarZoom(e, 1.3, 526, 564);
    assert.equal(e.escala, ZOOM_MAX);

    e = { escala: 1, offset: { x: 0, y: 0 } };
    for (let i = 0; i < 60; i++) e = aplicarZoom(e, 1 / 1.3, 526, 564);
    assert.equal(e.escala, ZOOM_MIN);
  });

  it('dois cliques em aproximar, a partir do enquadramento inicial', () => {
    const c = centroJanela(FORMATOS.perfil);
    let e = enquadrar(FORMATOS.perfil, { width: 2400, height: 1600 });
    e = aplicarZoom(e, 1.1, c.x, c.y);
    e = aplicarZoom(e, 1.1, c.x, c.y);
    assert.equal(Number(e.escala.toFixed(6)), 0.776669);
    assert.equal(Number(e.offset.x.toFixed(3)), -406.003);
    assert.equal(Number(e.offset.y.toFixed(3)), -57.335);
  });
});

describe('redução da foto de origem', () => {
  it('não amplia foto pequena', () => {
    assert.equal(fatorDeReducao(800, 600), 1);
  });

  it('limita o lado maior a 2400', () => {
    assert.equal(fatorDeReducao(4800, 3200), 0.5);
    assert.equal(fatorDeReducao(3000, 4000), 0.6);
  });
});
