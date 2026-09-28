import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  calcularTaxas,
  formatarTaxa,
  somarResumos,
  totalConfirmados,
  totalGerados,
} from '@/lib/palestras/taxas';

/* =========================================================
   Taxas de confirmação e comparecimento · spec `visao-gerencial`

   Os dois primeiros testes são os cenários exatos da spec, com os mesmos
   números.
   ========================================================= */

describe('taxa de confirmação e comparecimento', () => {
  it('100 gerados e 40 confirmados: taxa de confirmação 40%', () => {
    const taxas = calcularTaxas({
      disponivel: 60,
      confirmado: 40,
      presente: 0,
      expirado: 0,
      cancelado: 0,
    });
    assert.equal(taxas.confirmacao, 0.4);
    assert.equal(formatarTaxa(taxas.confirmacao), '40%');
  });

  it('40 confirmados e 30 com check-in: taxa de comparecimento 75%', () => {
    // 40 "confirmados" no enunciado é o total que já passou pela
    // confirmação — 10 ainda no estado `confirmado`, 30 já `presente`.
    const taxas = calcularTaxas({
      disponivel: 0,
      confirmado: 10,
      presente: 30,
      expirado: 0,
      cancelado: 0,
    });
    assert.equal(totalConfirmados({ confirmado: 10, presente: 30 }), 40);
    assert.equal(taxas.comparecimento, 0.75);
    assert.equal(formatarTaxa(taxas.comparecimento), '75%');
  });

  it('divisor zero: nenhum convite gerado -> indisponível, sem erro', () => {
    const taxas = calcularTaxas({
      disponivel: 0,
      confirmado: 0,
      presente: 0,
      expirado: 0,
      cancelado: 0,
    });
    assert.equal(taxas.confirmacao, null);
    assert.equal(taxas.comparecimento, null);
    assert.equal(formatarTaxa(taxas.confirmacao), '—');
  });

  it('divisor zero: convites gerados mas nenhum confirmado -> comparecimento indisponível', () => {
    const taxas = calcularTaxas({
      disponivel: 10,
      confirmado: 0,
      presente: 0,
      expirado: 0,
      cancelado: 0,
    });
    assert.equal(taxas.confirmacao, 0);
    assert.equal(taxas.comparecimento, null);
  });

  it('cancelados permanecem no denominador de gerados', () => {
    const semCancelados = totalGerados({ disponivel: 5, confirmado: 5 });
    const comCancelados = totalGerados({
      disponivel: 5,
      confirmado: 5,
      cancelado: 3,
    });
    assert.equal(semCancelados, 10);
    assert.equal(comCancelados, 13);

    const taxas = calcularTaxas({ disponivel: 5, confirmado: 5, cancelado: 10 });
    // 5 confirmados / 20 gerados (inclui os 10 cancelados) = 25%.
    assert.equal(taxas.confirmacao, 0.25);
  });

  it('presente conta como confirmado para a taxa de confirmação', () => {
    const taxas = calcularTaxas({
      disponivel: 0,
      confirmado: 0,
      presente: 20,
      expirado: 0,
      cancelado: 0,
    });
    assert.equal(taxas.confirmacao, 1);
  });
});

describe('somarResumos', () => {
  it('soma vários resumos estado a estado', () => {
    const total = somarResumos([
      { disponivel: 1, confirmado: 2 },
      { disponivel: 3, cancelado: 4 },
    ]);
    assert.deepEqual(total, {
      disponivel: 4,
      confirmado: 2,
      presente: 0,
      expirado: 0,
      cancelado: 4,
    });
  });

  it('lista vazia soma para zero em todos os estados', () => {
    const total = somarResumos([]);
    assert.deepEqual(total, {
      disponivel: 0,
      confirmado: 0,
      presente: 0,
      expirado: 0,
      cancelado: 0,
    });
  });
});
