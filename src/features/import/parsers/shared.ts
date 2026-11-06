import { parseBRL } from '../../../lib/format';
import { normalizeText } from '../../classify/normalize';

export const VALUE = String.raw`[-+]?\s*(?:R\$\s*)?[-+]?\s*\d{1,3}(?:\.?\d{3})*,\d{2}`;

/** Linhas de resumo que parecem transação, mas não são. */
const NOT_A_TRANSACTION =
  /\b(SALDO|TOTAL|SUBTOTAL|LIMITE|ENCARGOS|VENCIMENTO|PAGAMENTO MINIMO|PAGAMENTO RECEBIDO)\b/;

export const isSummaryLine = (line: string): boolean => NOT_A_TRANSACTION.test(normalizeText(line));

export const isCardInvoice = (text: string): boolean => /\bFATURA\b/.test(normalizeText(text));

const INCOME = /\b(PIX RECEBIDO|TRANSFERENCIA RECEBIDA|ESTORNO|DEPOSITO|SALARIO|RENDIMENTO)\b/;

/**
 * Na fatura, a compra vem sem sinal e o crédito vem negativo. No extrato, a saída
 * vem negativa. Sem sinal no extrato, a descrição decide.
 */
export function signedAmount(
  value: string,
  description: string,
  card: boolean,
  marker?: string,
): number {
  const cents = Math.abs(parseBRL(value));
  const minus = value.includes('-');
  if (card) return minus ? cents : -cents;
  if (marker === 'D' || minus) return -cents;
  if (marker === 'C' || value.includes('+')) return cents;
  return INCOME.test(normalizeText(description)) ? cents : -cents;
}

export type ReferenceDate = { year: number; month: number };

/** Data mais recente citada por completo no documento. */
export function referenceDate(text: string): ReferenceDate {
  const dates = [...text.matchAll(/\b\d{2}\/(\d{2})\/(\d{4})\b/g)]
    .map((match) => ({ month: Number(match[1]), year: Number(match[2]) }))
    .filter((date) => date.month >= 1 && date.month <= 12);
  const latest = dates.sort((a, b) => b.year - a.year || b.month - a.month)[0];
  if (latest) return latest;
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/** Monta a data ISO. Sem ano, mês depois do de referência pertence ao ano anterior. */
export function toIsoDate(
  day: string | number,
  month: string | number,
  year: string | undefined,
  reference: ReferenceDate,
): string | null {
  const d = Number(day);
  const m = Number(month);
  if (d < 1 || d > 31 || m < 1 || m > 12) return null;
  let y = reference.month < m ? reference.year - 1 : reference.year;
  if (year) y = year.length === 2 ? 2000 + Number(year) : Number(year);
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
