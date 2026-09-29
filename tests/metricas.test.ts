import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  agruparConfirmacoesPorDia,
  calcularFunil,
  percentual,
} from '@/lib/palestras/metricas';
import { dataCivil, deHoraLocal } from '@/lib/tempo';

/* =========================================================
   Métricas do circuito · partes sem banco (tarefa 4.2)

   `agruparConfirmacoesPorDia` e `calcularFunil` são puras: a agregação e o
   cálculo das taxas não dependem de Postgres, então são testados aqui sem
   nenhuma infraestrutura, no mesmo estilo de `tests/taxas.test.ts`.
   ========================================================= */

describe('agruparConfirmacoesPorDia', () => {
  it('agrupa confirmações do mesmo dia civil e soma o total', () => {
    const referencia = deHoraLocal('2026-10-13T12:00');
    const serie = agruparConfirmacoesPorDia(
      [
        { confirmadoEm: deHoraLocal('2026-10-13T08:00') },
        { confirmadoEm: deHoraLocal('2026-10-13T19:00') },
        { confirmadoEm: deHoraLocal('2026-10-12T10:00') },
      ],
      { dias: 3, referencia },
    );

    assert.equal(serie.pontos.length, 3);
    assert.deepEqual(
      serie.pontos.map((p) => p.data),
      ['2026-10-11', '2026-10-12', '2026-10-13'],
    );
    assert.equal(serie.pontos[1]?.total, 1);
    assert.equal(serie.pontos[2]?.total, 2);
    assert.equal(serie.totalNoPeriodo, 3);
  });

  it('dia sem confirmação aparece na série com valor zero, e não é omitido', () => {
    const referencia = deHoraLocal('2026-10-13T12:00');
    const serie = agruparConfirmacoesPorDia(
      [{ confirmadoEm: deHoraLocal('2026-10-11T09:00') }],
      { dias: 3, referencia },
    );

    assert.equal(serie.pontos.length, 3);
    assert.equal(serie.pontos[0]?.data, '2026-10-11');
    assert.equal(serie.pontos[0]?.total, 1);
    // 12/10 e 13/10 não tiveram confirmação nenhuma, e continuam na série.
    assert.equal(serie.pontos[1]?.data, '2026-10-12');
    assert.equal(serie.pontos[1]?.total, 0);
    assert.equal(serie.pontos[2]?.data, '2026-10-13');
    assert.equal(serie.pontos[2]?.total, 0);
  });

  it('corte de dia segue o fuso do evento: 23h30 de 12/10 em Porto Velho conta no dia 12/10', () => {
    // 23h30 em Porto Velho (UTC-4) é 03h30 UTC do dia seguinte: se o
    // agrupamento usasse o dia civil em UTC por engano, cairia em 13/10.
    const confirmadoEm = deHoraLocal('2026-10-12T23:30');
    assert.equal(confirmadoEm.getUTCDate(), 13, 'a instante é 13/10 em UTC');

    const referencia = deHoraLocal('2026-10-13T12:00');
    const serie = agruparConfirmacoesPorDia([{ confirmadoEm }], {
      dias: 2,
      referencia,
    });

    const dia12 = serie.pontos.find((p) => p.data === '2026-10-12');
    const dia13 = serie.pontos.find((p) => p.data === '2026-10-13');
    assert.equal(dia12?.total, 1);
    assert.equal(dia13?.total, 0);
  });

  it('usa 14 dias por padrão, terminando no dia da referência', () => {
    const referencia = deHoraLocal('2026-10-13T12:00');
    const serie = agruparConfirmacoesPorDia([], { referencia });

    assert.equal(serie.pontos.length, 14);
    assert.equal(serie.pontos[13]?.data, dataCivil(referencia));
    assert.equal(serie.pontos[0]?.data, '2026-09-30');
  });

  it('confirmação fora da janela dos últimos dias não entra no total do período', () => {
    const referencia = deHoraLocal('2026-10-13T12:00');
    const serie = agruparConfirmacoesPorDia(
      [
        { confirmadoEm: deHoraLocal('2026-10-13T08:00') },
        // Fora da janela de 2 dias (11/10 e 12/10 não, começa em 12/10).
        { confirmadoEm: deHoraLocal('2026-09-01T08:00') },
      ],
      { dias: 2, referencia },
    );

    assert.equal(serie.totalNoPeriodo, 1);
  });

  it('rótulo do dia é curto (DD/MM)', () => {
    const referencia = deHoraLocal('2026-10-13T12:00');
    const serie = agruparConfirmacoesPorDia([], { dias: 1, referencia });
    assert.equal(serie.pontos[0]?.rotulo, '13/10');
  });
});

describe('percentual', () => {
  it('divide numerador por denominador', () => {
    assert.equal(percentual(40, 100), 0.4);
  });

  it('denominador zero é indisponível, não erro', () => {
    assert.equal(percentual(0, 0), null);
    assert.equal(percentual(5, 0), null);
  });
});

describe('calcularFunil', () => {
  it('percentual de cada etapa é sobre a etapa anterior, não sobre gerados', () => {
    const funil = calcularFunil({
      gerados: 3900,
      enviados: 3412,
      confirmados: 1898,
      presentes: 612,
    });

    assert.equal(funil.taxaEnviadosSobreGerados, 3412 / 3900);
    assert.equal(funil.taxaConfirmadosSobreEnviados, 1898 / 3412);
    assert.equal(funil.taxaPresentesSobreConfirmados, 612 / 1898);
  });

  it('sem gerados, todas as taxas do funil ficam indisponíveis', () => {
    const funil = calcularFunil({ gerados: 0, enviados: 0, confirmados: 0, presentes: 0 });
    assert.equal(funil.taxaEnviadosSobreGerados, null);
    assert.equal(funil.taxaConfirmadosSobreEnviados, null);
    assert.equal(funil.taxaPresentesSobreConfirmados, null);
  });

  it('gerados sem nenhum enviado ainda: só a primeira taxa é zero, as demais ficam indisponíveis', () => {
    const funil = calcularFunil({ gerados: 100, enviados: 0, confirmados: 0, presentes: 0 });
    assert.equal(funil.taxaEnviadosSobreGerados, 0);
    assert.equal(funil.taxaConfirmadosSobreEnviados, null);
    assert.equal(funil.taxaPresentesSobreConfirmados, null);
  });
});
