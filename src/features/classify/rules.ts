import type { ClassifiedBy, Rule, Transaction } from '../../db/types';
import { DEFAULT_KEYWORDS } from './defaultKeywords';
import { normalizeText } from './normalize';

type Keyword = { pattern: RegExp; length: number; categoryId: string };

function compileKeyword(term: string, categoryId: string): Keyword {
  const word = term.replace(/^\^/, '').replace(/\*$/, '');
  const start = term.startsWith('^') ? '^' : '(?<![A-Z0-9])';
  const end = term.endsWith('*') ? '' : '(?![A-Z0-9])';
  return { pattern: new RegExp(`${start}${word}${end}`), length: word.length, categoryId };
}

// O termo mais longo vence: AMAZON PRIME antes de AMAZON, MERCADOLIVRE antes de MERCADO.
const KEYWORDS = Object.entries(DEFAULT_KEYWORDS)
  .flatMap(([categoryId, terms]) => terms.map((term) => compileKeyword(term, categoryId)))
  .sort((a, b) => b.length - a.length);

export function matchKeyword(text: string): string | null {
  // "MERCADO PAGO" é meio de pagamento, não supermercado.
  const clean = normalizeText(text).replace(/MERCADO ?PAGO/g, ' ');
  return KEYWORDS.find((keyword) => keyword.pattern.test(clean))?.categoryId ?? null;
}

export function normalizeRuleValue(
  field: Rule['field'],
  operator: Rule['operator'],
  value: string,
): string {
  if (field === 'document') return value.replace(/\D/g, '');
  return operator === 'regex' ? value.trim() : normalizeText(value);
}

export function ruleMatches(rule: Rule, tx: Pick<Transaction, 'name' | 'document'>): boolean {
  const target = rule.field === 'document' ? tx.document : tx.name;
  if (!target) return false;
  switch (rule.operator) {
    case 'equals':
      return target === rule.value;
    case 'contains':
      return target.includes(rule.value);
    case 'startsWith':
      return target.startsWith(rule.value);
    case 'regex':
      try {
        return new RegExp(rule.value, 'i').test(target);
      } catch {
        return false;
      }
  }
}

/** CNPJ/CPF antes de nome; dentro de cada campo, maior prioridade e depois a regra mais nova. */
export function sortRules(rules: Rule[]): Rule[] {
  return [...rules].sort(
    (a, b) =>
      Number(b.field === 'document') - Number(a.field === 'document') ||
      b.priority - a.priority ||
      b.createdAt.localeCompare(a.createdAt),
  );
}

export type Classification = {
  categoryId: string | null;
  classifiedBy: ClassifiedBy;
  ruleId?: string;
};

type Classifiable = Pick<
  Transaction,
  'name' | 'document' | 'rawDescription' | 'categoryId' | 'classifiedBy'
>;

/** `sortedRules` deve vir de sortRules(). */
export function classify(tx: Classifiable, sortedRules: Rule[]): Classification {
  if (tx.classifiedBy === 'manual') {
    return { categoryId: tx.categoryId, classifiedBy: 'manual' };
  }
  const rule = sortedRules.find((candidate) => ruleMatches(candidate, tx));
  if (rule) {
    return { categoryId: rule.categoryId, classifiedBy: 'regra_usuario', ruleId: rule.id };
  }
  // A descrição original guarda pistas que a normalização remove, como IFD*.
  const categoryId = matchKeyword(tx.name) ?? matchKeyword(tx.rawDescription);
  return categoryId
    ? { categoryId, classifiedBy: 'palavra_chave' }
    : { categoryId: null, classifiedBy: null };
}

/** Devolve só as transações cuja classificação mudou. */
export function reclassify(transactions: Transaction[], rules: Rule[]): Transaction[] {
  const sorted = sortRules(rules);
  const changed: Transaction[] = [];
  for (const tx of transactions) {
    const next = classify(tx, sorted);
    if (
      next.categoryId !== tx.categoryId ||
      next.classifiedBy !== tx.classifiedBy ||
      next.ruleId !== tx.ruleId
    ) {
      const { ruleId: _previous, ...rest } = tx;
      changed.push({ ...rest, ...next });
    }
  }
  return changed;
}
