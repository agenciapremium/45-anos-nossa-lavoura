import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ESTADOS_DE_CONVITE, type EstadoDeConvite } from '@/lib/db/schema';
import {
  estadoEfetivo,
  podeTransicionar,
  TRANSICOES_PERMITIDAS,
} from '@/lib/palestras/estado-do-convite';
import { deHoraLocal } from '@/lib/tempo';

const PRAZO = deHoraLocal('2026-10-12T23:59');
const ANTES = new Date('2026-10-13T03:58:00.000Z'); // 23h58 local
const DEPOIS = new Date('2026-10-13T04:01:00.000Z'); // 00h01 local do dia seguinte

describe('máquina de estados do convite', () => {
  it('cobre os cinco estados do domínio', () => {
    assert.deepEqual(
      Object.keys(TRANSICOES_PERMITIDAS).sort(),
      [...ESTADOS_DE_CONVITE].sort(),
    );
  });

  it('nada volta para disponível', () => {
    for (const de of ESTADOS_DE_CONVITE) {
      assert.equal(
        podeTransicionar(de, 'disponivel'),
        false,
        `${de} -> disponivel deveria ser recusado`,
      );
    }
  });

  it('cancelado e expirado são terminais', () => {
    for (const de of ['cancelado', 'expirado'] as EstadoDeConvite[]) {
      for (const para of ESTADOS_DE_CONVITE) {
        assert.equal(
          podeTransicionar(de, para),
          false,
          `${de} -> ${para} deveria ser recusado`,
        );
      }
    }
  });

  it('presente é terminal', () => {
    for (const para of ESTADOS_DE_CONVITE) {
      assert.equal(podeTransicionar('presente', para), false);
    }
  });

  it('disponível pode confirmar, expirar e cancelar', () => {
    assert.equal(podeTransicionar('disponivel', 'confirmado'), true);
    assert.equal(podeTransicionar('disponivel', 'expirado'), true);
    assert.equal(podeTransicionar('disponivel', 'cancelado'), true);
    assert.equal(podeTransicionar('disponivel', 'presente'), false);
  });

  it('confirmado vai a presente ou cancelado, e NUNCA a expirado', () => {
    assert.equal(podeTransicionar('confirmado', 'presente'), true);
    assert.equal(podeTransicionar('confirmado', 'cancelado'), true);
    assert.equal(
      podeTransicionar('confirmado', 'expirado'),
      false,
      'quem confirmou dentro do prazo continua confirmado depois dele',
    );
  });
});

describe('expiração avaliada na leitura', () => {
  it('disponível vira expirado depois do prazo, sem o cron rodar', () => {
    assert.equal(estadoEfetivo('disponivel', PRAZO, ANTES), 'disponivel');
    assert.equal(estadoEfetivo('disponivel', PRAZO, DEPOIS), 'expirado');
  });

  it('não mexe em nenhum outro estado', () => {
    for (const estado of ['confirmado', 'presente', 'cancelado', 'expirado'] as const) {
      assert.equal(
        estadoEfetivo(estado, PRAZO, DEPOIS),
        estado,
        `${estado} foi alterado pela leitura`,
      );
    }
  });

  it('exatamente no instante do prazo o convite ainda vale', () => {
    assert.equal(estadoEfetivo('disponivel', PRAZO, PRAZO), 'disponivel');
    assert.equal(
      estadoEfetivo('disponivel', PRAZO, new Date(PRAZO.getTime() + 1)),
      'expirado',
    );
  });
});
