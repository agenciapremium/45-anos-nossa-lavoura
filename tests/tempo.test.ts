import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  dataBrParaISO,
  deHoraLocal,
  fimDoDia,
  formatarCarimbo,
  formatarData,
  formatarDataHora,
  formatarHorario,
  inicioDoDia,
  isoParaDataBr,
  mesmoDiaCivil,
  paraCampoDataHora,
  prazoPadrao,
  venceu,
} from '@/lib/tempo';

describe('fuso America/Porto_Velho', () => {
  it('converte hora local do evento em instante UTC (UTC-4)', () => {
    // Vilhena, 13/10/2026 às 19h00 locais = 23h00 UTC do mesmo dia.
    assert.equal(
      deHoraLocal('2026-10-13T19:00').toISOString(),
      '2026-10-13T23:00:00.000Z',
    );
  });

  it('formata no fuso do evento, não no do servidor', () => {
    const instante = new Date('2026-10-13T23:00:00.000Z');
    assert.equal(formatarData(instante), '13/10/2026');
    assert.equal(formatarHorario(instante), '19h00');
    assert.equal(formatarDataHora(instante), '13/10/2026 às 19h00');
    assert.equal(formatarCarimbo(instante), '13/10/2026 19:00');
    assert.equal(paraCampoDataHora(instante), '2026-10-13T19:00');
  });

  it('02h00 UTC de 13/10 ainda são 22h00 de 12/10 em Porto Velho', () => {
    // Cenário literal da spec `plataforma-palestras`.
    const prazo = deHoraLocal('2026-10-12T23:59');
    const doisDaManhaUTC = new Date('2026-10-13T02:00:00.000Z');
    assert.equal(formatarData(doisDaManhaUTC), '12/10/2026');
    assert.equal(formatarHorario(doisDaManhaUTC), '22h00');
    assert.equal(venceu(prazo, doisDaManhaUTC), false);
  });

  it('o prazo vence mesmo, um minuto depois das 23h59 locais', () => {
    const prazo = deHoraLocal('2026-10-12T23:59');
    assert.equal(venceu(prazo, new Date('2026-10-13T03:58:59.000Z')), false);
    assert.equal(venceu(prazo, new Date('2026-10-13T03:59:00.000Z')), false);
    assert.equal(venceu(prazo, new Date('2026-10-13T04:00:00.000Z')), true);
  });
});

describe('prazo padrão: véspera às 23h59', () => {
  it('13/10/2026 19h00 -> 12/10/2026 23h59', () => {
    const prazo = prazoPadrao(deHoraLocal('2026-10-13T19:00'));
    assert.equal(formatarDataHora(prazo), '12/10/2026 às 23h59');
    assert.equal(prazo.toISOString(), '2026-10-13T03:59:00.000Z');
  });

  it('as quatro palestras do circuito', () => {
    const circuito: Array<[string, string]> = [
      ['2026-10-13T19:00', '12/10/2026 às 23h59'], // Vilhena
      ['2026-10-14T19:00', '13/10/2026 às 23h59'], // Espigão d'Oeste
      ['2026-10-15T19:00', '14/10/2026 às 23h59'], // Ji-Paraná
      ['2026-10-17T10:30', '16/10/2026 às 23h59'], // Porto Velho
    ];
    for (const [local, esperado] of circuito) {
      assert.equal(formatarDataHora(prazoPadrao(deHoraLocal(local))), esperado);
    }
  });

  it('atravessa a virada de mês e de ano', () => {
    assert.equal(
      formatarDataHora(prazoPadrao(deHoraLocal('2026-11-01T09:00'))),
      '31/10/2026 às 23h59',
    );
    assert.equal(
      formatarDataHora(prazoPadrao(deHoraLocal('2027-01-01T09:00'))),
      '31/12/2026 às 23h59',
    );
    assert.equal(
      formatarDataHora(prazoPadrao(deHoraLocal('2028-03-01T09:00'))),
      '29/02/2028 às 23h59',
    );
  });

  it('palestra logo depois da meia-noite local ainda usa a véspera civil', () => {
    // 00h30 de 14/10 local = 04h30 UTC de 14/10. A véspera é 13/10.
    assert.equal(
      formatarDataHora(prazoPadrao(deHoraLocal('2026-10-14T00:30'))),
      '13/10/2026 às 23h59',
    );
  });
});

describe('início e fim do dia', () => {
  it('recortam o dia civil do fuso do evento', () => {
    const instante = new Date('2026-10-13T23:00:00.000Z'); // 19h00 local
    assert.equal(inicioDoDia(instante).toISOString(), '2026-10-13T04:00:00.000Z');
    assert.equal(fimDoDia(instante).toISOString(), '2026-10-14T03:59:59.999Z');
  });

  it('02h UTC pertence ao dia civil anterior', () => {
    const instante = new Date('2026-10-13T02:00:00.000Z'); // 22h de 12/10
    assert.equal(inicioDoDia(instante).toISOString(), '2026-10-12T04:00:00.000Z');
  });
});

describe('mesmo dia civil (D4 de `operacao-evento`: "dia da palestra")', () => {
  it('dois instantes do mesmo dia civil em Porto Velho', () => {
    // 08h e 23h de 13/10 local — mesmo dia civil, apesar de datas UTC
    // diferentes (12h e 03h UTC do dia seguinte).
    const manha = deHoraLocal('2026-10-13T08:00');
    const noite = deHoraLocal('2026-10-13T23:00');
    assert.equal(mesmoDiaCivil(manha, noite), true);
  });

  it('um minuto antes e um minuto depois da virada do dia civil', () => {
    const antesDaMeiaNoite = deHoraLocal('2026-10-13T23:59');
    const depoisDaMeiaNoite = deHoraLocal('2026-10-14T00:01');
    assert.equal(mesmoDiaCivil(antesDaMeiaNoite, depoisDaMeiaNoite), false);
  });

  it('mesmo instante UTC pode cair em dias civis diferentes conforme o fuso do parâmetro', () => {
    // A palestra de Vilhena é às 19h de 13/10 (23h UTC); um check-in às
    // 21h UTC (17h locais) é do MESMO dia civil, ainda que a diferença de
    // fuso pudesse sugerir o contrário a quem pensa em UTC puro.
    const palestra = deHoraLocal('2026-10-13T19:00');
    const checkin = new Date('2026-10-13T21:00:00.000Z');
    assert.equal(mesmoDiaCivil(checkin, palestra), true);
  });
});

describe('data de nascimento em DD/MM/AAAA', () => {
  it('aceita data válida', () => {
    assert.equal(dataBrParaISO('07/09/1984'), '1984-09-07');
    assert.equal(dataBrParaISO('29/02/2024'), '2024-02-29');
  });

  it('recusa formato errado', () => {
    assert.equal(dataBrParaISO('1984-09-07'), null);
    assert.equal(dataBrParaISO('7/9/1984'), null);
    assert.equal(dataBrParaISO(''), null);
  });

  it('recusa data inexistente no calendário', () => {
    assert.equal(dataBrParaISO('31/02/2026'), null);
    assert.equal(dataBrParaISO('29/02/2026'), null);
    assert.equal(dataBrParaISO('31/04/2026'), null);
    assert.equal(dataBrParaISO('00/01/2026'), null);
    assert.equal(dataBrParaISO('01/13/2026'), null);
  });

  it('volta para DD/MM/AAAA', () => {
    assert.equal(isoParaDataBr('1984-09-07'), '07/09/1984');
  });
});
