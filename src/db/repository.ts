import { classify, reclassify, sortRules } from '../features/classify/rules';
import { db } from '.';
import { DEFAULT_CATEGORIES } from './seed';
import {
  needsReview,
  type Category,
  type ImportedFile,
  type Note,
  type Rule,
  type Transaction,
} from './types';

type NewRule = Omit<Rule, 'id' | 'createdAt'>;

async function categoryIds(): Promise<Set<string>> {
  return new Set((await db.categories.toArray()).map((category) => category.id));
}

async function reapplyRules(): Promise<void> {
  const [transactions, rules, valid] = await Promise.all([
    db.transactions.toArray(),
    db.rules.toArray(),
    categoryIds(),
  ]);
  await db.transactions.bulkPut(reclassify(transactions, rules, valid));
}

const countByRule = (ruleId: string): Promise<number> =>
  db.transactions.filter((tx) => tx.ruleId === ruleId).count();

/** Devolve quantas transações a regra classifica depois de aplicada. */
export async function addRule(rule: NewRule): Promise<number> {
  const id = crypto.randomUUID();
  await db.rules.add({ ...rule, id, createdAt: new Date().toISOString() });
  await reapplyRules();
  return countByRule(id);
}

export async function updateRule(rule: Rule): Promise<number> {
  await db.rules.put(rule);
  await reapplyRules();
  return countByRule(rule.id);
}

export async function deleteRule(id: string): Promise<void> {
  await db.rules.delete(id);
  await reapplyRules();
}

export async function setManualCategory(ids: string[], categoryId: string): Promise<void> {
  await db.transactions
    .where('id')
    .anyOf(ids)
    .modify((tx) => {
      tx.categoryId = categoryId;
      tx.classifiedBy = 'manual';
      delete tx.ruleId;
    });
}

export async function ignoreInReview(ids: string[]): Promise<void> {
  await db.transactions.where('id').anyOf(ids).modify({ reviewIgnored: true });
}

export async function saveImport(
  file: ImportedFile,
  transactions: Transaction[],
): Promise<{ classified: number; pending: number }> {
  const [rules, valid] = await Promise.all([db.rules.toArray(), categoryIds()]);
  const sorted = sortRules(rules);
  const classified = transactions.map((tx) => ({ ...tx, ...classify(tx, sorted, valid) }));
  await db.transaction('rw', db.transactions, db.files, async () => {
    await db.transactions.bulkPut(classified);
    await db.files.put(file);
  });
  return {
    classified: classified.filter((tx) => tx.categoryId !== null).length,
    pending: classified.filter(needsReview).length,
  };
}

export async function saveCategory(category: Category): Promise<void> {
  await db.categories.put(category);
}

/** Regras da categoria somem; as transações dela voltam a ser classificadas do zero. */
export async function deleteCategory(id: string): Promise<void> {
  await db.categories.delete(id);
  await db.rules.filter((rule) => rule.categoryId === id).delete();
  await db.transactions
    .filter((tx) => tx.categoryId === id)
    .modify((tx) => {
      tx.categoryId = null;
      tx.classifiedBy = null;
      delete tx.ruleId;
    });
  await reapplyRules();
}

type NewNote = Omit<Note, 'id' | 'createdAt' | 'updatedAt'>;

export async function addNote(note: NewNote): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.notes.add({ ...note, id, createdAt: now, updatedAt: now });
  return id;
}

export async function updateNote(note: Note): Promise<void> {
  await db.notes.put({ ...note, updatedAt: new Date().toISOString() });
}

export async function deleteNote(id: string): Promise<void> {
  await db.notes.delete(id);
}

/** Versão 1 não tinha anotações; ela continua sendo aceita na restauração. */
export type Backup = {
  version: 2;
  exportedAt: string;
  transactions: Transaction[];
  rules: Rule[];
  categories: Category[];
  files: ImportedFile[];
  notes: Note[];
};

export async function exportBackup(): Promise<Backup> {
  const [transactions, rules, categories, files, notes] = await Promise.all([
    db.transactions.toArray(),
    db.rules.toArray(),
    db.categories.toArray(),
    db.files.toArray(),
    db.notes.toArray(),
  ]);
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    transactions,
    rules,
    categories,
    files,
    notes,
  };
}

type Shape = Record<string, 'string' | 'number'>;

const SHAPES = {
  transactions: {
    id: 'string',
    fingerprint: 'string',
    date: 'string',
    name: 'string',
    amount: 'number',
  },
  rules: {
    id: 'string',
    field: 'string',
    operator: 'string',
    value: 'string',
    categoryId: 'string',
  },
  categories: { id: 'string', name: 'string', color: 'string', icon: 'string' },
  files: { id: 'string', fileName: 'string' },
  notes: { id: 'string', kind: 'string', title: 'string', body: 'string', date: 'string' },
} satisfies Record<string, Shape>;

const hasShape = (items: unknown, shape: Shape): boolean =>
  Array.isArray(items) &&
  items.every(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      Object.entries(shape).every(
        ([key, type]) => typeof (item as Record<string, unknown>)[key] === type,
      ),
  );

/**
 * Restaurar apaga o que existe, então o arquivo é conferido registro a registro antes:
 * um JSON qualquer não pode deixar o banco pela metade.
 */
export function parseBackup(json: string): Backup {
  let data: Partial<Omit<Backup, 'version'>> & { version?: unknown };
  try {
    data = JSON.parse(json) as typeof data;
  } catch {
    throw new Error('Arquivo de backup inválido');
  }
  if (data.version === 1) data = { ...data, notes: [] };
  const valid =
    (data.version === 1 || data.version === 2) &&
    typeof data.exportedAt === 'string' &&
    Object.entries(SHAPES).every(([table, shape]) =>
      hasShape(data[table as keyof typeof SHAPES], shape),
    );
  if (!valid) throw new Error('Arquivo de backup inválido');
  return { ...data, version: 2 } as Backup;
}

const allTables = [db.transactions, db.rules, db.categories, db.files, db.notes];

/** Substitui tudo o que existe pelos dados do backup. */
export async function restoreBackup(backup: Backup): Promise<void> {
  await db.transaction('rw', allTables, async () => {
    await Promise.all(allTables.map((table) => table.clear()));
    await db.transactions.bulkAdd(backup.transactions);
    await db.rules.bulkAdd(backup.rules);
    await db.categories.bulkAdd(backup.categories);
    await db.files.bulkAdd(backup.files);
    await db.notes.bulkAdd(backup.notes);
  });
}

export async function clearAllData(): Promise<void> {
  await db.transaction('rw', allTables, async () => {
    await Promise.all(allTables.map((table) => table.clear()));
    await db.categories.bulkAdd(DEFAULT_CATEGORIES);
  });
}
