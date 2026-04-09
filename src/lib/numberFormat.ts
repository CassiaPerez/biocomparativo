import Decimal from 'decimal.js';

Decimal.set({
  precision: 30,
  rounding: Decimal.ROUND_HALF_UP,
});

export function toDecimal(value: Decimal.Value): Decimal {
  try {
    return new Decimal(value || 0);
  } catch {
    return new Decimal(0);
  }
}

/**
 * Formata números pequenos sem transformar em 0.
 * - >= 1: até 4 casas, removendo zeros finais
 * - < 1 e >= 0.0001: até 8 casas, removendo zeros finais
 * - < 0.0001: notação científica
 */
export function formatSmallNumber(value: Decimal.Value): string {
  const val = toDecimal(value);

  if (!val.isFinite()) return '0';
  if (val.isZero()) return '0';

  const abs = val.abs();

  if (abs.lessThan('0.0001')) {
    return val.toExponential(6).replace('+', '');
  }

  if (abs.lessThan(1)) {
    return val.toFixed(8).replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '').replace(/\.$/, '');
  }

  return val.toFixed(4).replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '').replace(/\.$/, '');
}

/**
 * Cálculo de UFC/mm² a partir de UFC/ha
 * 1 ha = 10^10 mm²
 */
export function calcularUfcPorMm2(ufcHa: Decimal.Value): Decimal {
  return toDecimal(ufcHa).div(new Decimal(10).pow(10));
}