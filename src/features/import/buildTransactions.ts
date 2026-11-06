import type { Transaction, TransactionKind } from '../../db/types';
import { hash } from '../../lib/hash';
import { normalizeDescription, normalizeText } from '../classify/normalize';
import type { RawTransaction } from './parsers/types';

export function detectKind(raw: RawTransaction): TransactionKind {
  const text = normalizeText(raw.description);
  if (/\b(ESTORNO|DEVOLVIDO)\b/.test(text)) return 'estorno';
  if (/\bPAGAMENTO\b.*\bFATURA\b/.test(text)) return 'pagamento_fatura';
  if (/\bPIX\b/.test(text)) return raw.amount > 0 ? 'pix_recebido' : 'pix_enviado';
  if (/\b(TARIFA|ANUIDADE|IOF)\b/.test(text)) return 'tarifa';
  return raw.amount > 0 ? 'outro' : 'compra';
}

/** Transforma as linhas do parser em transações ainda não classificadas. */
export function buildTransactions(
  rows: RawTransaction[],
  sourceFileId: string,
  bank: string,
): Transaction[] {
  const seen = new Map<string, number>();
  return rows.map((row, index) => {
    // Sem a descrição: ela muda entre o PDF e o CSV do mesmo extrato.
    const key = `${bank}|${row.date}|${row.amount}`;
    // Duas passagens de R$ 4,30 no mesmo dia são legítimas: a ocorrência as diferencia.
    const occurrence = seen.get(key) ?? 0;
    seen.set(key, occurrence + 1);
    return {
      id: hash(`${row.date}|${row.description}|${row.amount}|${sourceFileId}|${index}`),
      fingerprint: hash(`${key}|${occurrence}`),
      date: row.date,
      rawDescription: row.description,
      amount: row.amount,
      kind: detectKind(row),
      categoryId: null,
      classifiedBy: null,
      sourceFileId,
      bank,
      ...normalizeDescription(row.description),
    };
  });
}
