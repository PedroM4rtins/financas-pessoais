import {
  VALUE,
  isCardInvoice,
  isSummaryLine,
  referenceDate,
  signedAmount,
  toIsoDate,
} from './shared';
import type { BankParser, RawTransaction } from './types';

const LINE = new RegExp(
  String.raw`^(\d{2})\/(\d{2})(?:\/(\d{4}|\d{2}))?\s+(.+?)\s+(${VALUE})(?:\s*([DC])\b)?(?:\s.*)?$`,
);

export const genericParser: BankParser = {
  id: 'generico',
  name: 'Genérico',
  detect: () => true,
  parse(text) {
    const reference = referenceDate(text);
    const card = isCardInvoice(text);
    const transactions: RawTransaction[] = [];
    for (const rawLine of text.split('\n')) {
      const line = rawLine.trim();
      const match = line.match(LINE);
      if (!match || isSummaryLine(line)) continue;
      const [, day = '', month = '', year, description = '', value = '', marker] = match;
      const date = toIsoDate(day, month, year, reference);
      if (!date) continue;
      transactions.push({
        date,
        description: description.trim(),
        amount: signedAmount(value, description, card, marker),
      });
    }
    return transactions;
  },
};
