import { isExpense, isIncome, type Transaction } from '../../db/types';
import { monthOf, shiftMonth } from '../../lib/dates';

/** Chave de "Não classificado" nos totais por categoria. */
export const NO_CATEGORY = '';

export const spent = (transactions: Transaction[]): number =>
  transactions.filter(isExpense).reduce((total, tx) => total - tx.amount, 0);

export const received = (transactions: Transaction[]): number =>
  transactions.filter(isIncome).reduce((total, tx) => total + tx.amount, 0);

export const inMonth = (transactions: Transaction[], month: string): Transaction[] =>
  transactions.filter((tx) => monthOf(tx.date) === month);

/** Gasto em centavos, positivo, por categoria. */
export function spentByCategory(transactions: Transaction[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const tx of transactions.filter(isExpense)) {
    const key = tx.categoryId ?? NO_CATEGORY;
    totals.set(key, (totals.get(key) ?? 0) - tx.amount);
  }
  return totals;
}

export function topMerchants(
  transactions: Transaction[],
  limit = 5,
): { name: string; total: number; categoryId: string | null }[] {
  const merchants = new Map<string, { name: string; total: number; categoryId: string | null }>();
  for (const tx of transactions.filter(isExpense)) {
    const entry = merchants.get(tx.name) ?? { name: tx.name, total: 0, categoryId: tx.categoryId };
    entry.total -= tx.amount;
    merchants.set(tx.name, entry);
  }
  return [...merchants.values()].sort((a, b) => b.total - a.total).slice(0, limit);
}

/** Do mais antigo ao mês informado. */
export const lastMonths = (month: string, count: number): string[] =>
  Array.from({ length: count }, (_, index) => shiftMonth(month, index - count + 1));
