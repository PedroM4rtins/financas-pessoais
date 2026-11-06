import { needsReview, type Transaction } from '../../db/types';

export type ReviewGroup = {
  key: string;
  name: string;
  document?: string;
  items: Transaction[];
  /** Gasto em centavos, positivo. */
  total: number;
};

export function reviewGroups(transactions: Transaction[]): ReviewGroup[] {
  const groups = new Map<string, ReviewGroup>();
  for (const tx of transactions.filter(needsReview)) {
    const key = tx.document ?? tx.name;
    const group = groups.get(key) ?? {
      key,
      name: tx.name,
      ...(tx.document ? { document: tx.document } : {}),
      items: [],
      total: 0,
    };
    group.items.push(tx);
    group.total -= tx.amount;
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => b.total - a.total);
}

/** Regra que representa "sempre classificar esta pessoa ou loja assim". */
export function ruleFor(
  source: Pick<Transaction, 'name' | 'document'>,
  categoryId: string,
): {
  field: 'name' | 'document';
  operator: 'equals';
  value: string;
  categoryId: string;
  priority: number;
} {
  return source.document
    ? { field: 'document', operator: 'equals', value: source.document, categoryId, priority: 0 }
    : { field: 'name', operator: 'equals', value: source.name, categoryId, priority: 0 };
}
