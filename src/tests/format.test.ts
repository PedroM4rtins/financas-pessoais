import { describe, expect, it } from 'vitest';
import { formatBRL, parseMoneyInput } from '../lib/format';

describe('parseMoneyInput', () => {
  it.each([
    ['1.500', 150000],
    ['1.500,00', 150000],
    ['1.500,5', 150050],
    ['R$ 1.234.567,89', 123456789],
    ['15,5', 1550],
    ['600', 60000],
    ['1500.5', 150050],
    ['0,99', 99],
  ])('lê "%s" como %i centavos', (text, cents) => {
    expect(parseMoneyInput(text)).toBe(cents);
  });

  it.each(['', 'abc', '1,2,3', '1.50.0,00', '12,345', '-10', '1.5.0'])('recusa "%s"', (text) => {
    expect(parseMoneyInput(text)).toBeNull();
  });

  it('lê de volta o que formatBRL escreve', () => {
    const shown = formatBRL(123456).replace(/^R\$\s*/, '');
    expect(parseMoneyInput(shown)).toBe(123456);
  });
});
