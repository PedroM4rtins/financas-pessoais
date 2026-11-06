import { normalizeText } from '../../classify/normalize';
import { genericParser } from './generic';
import type { BankParser } from './types';

/** Ainda sem validação em documento real: usa as linhas dd/mm do parser genérico. */
export const itauParser: BankParser = {
  id: 'itau',
  name: 'Itaú',
  detect: (text) => /\bITAU\b/.test(normalizeText(text)),
  parse: genericParser.parse,
};
