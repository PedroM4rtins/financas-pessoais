import { normalizeText } from '../../classify/normalize';
import { VALUE, isSummaryLine, referenceDate, signedAmount, toIsoDate } from './shared';
import type { BankParser, RawTransaction } from './types';

const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const LINE = new RegExp(String.raw`^(\d{2}) (${MONTHS.join('|')})\s+(.+?)\s+(${VALUE})$`, 'i');

/** Ainda sem validação em fatura real: linhas no formato "05 NOV Descrição R$ 12,34". */
export const nubankParser: BankParser = {
  id: 'nubank',
  name: 'Nubank',
  detect: (text) => /\bNU ?PAGAMENTOS\b|\bNUBANK\b/.test(normalizeText(text)),
  parse(text) {
    const reference = referenceDate(text);
    const transactions: RawTransaction[] = [];
    for (const rawLine of text.split('\n')) {
      const line = rawLine.trim();
      const match = line.match(LINE);
      if (!match || isSummaryLine(line)) continue;
      const [, day = '', monthName = '', description = '', value = ''] = match;
      const month = MONTHS.indexOf(monthName.toUpperCase()) + 1;
      const date = toIsoDate(day, month, undefined, reference);
      if (!date) continue;
      transactions.push({
        date,
        description: description.trim(),
        amount: signedAmount(value, description, true),
      });
    }
    return transactions;
  },
};
