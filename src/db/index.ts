import Dexie, { type EntityTable } from 'dexie';
import { DEFAULT_CATEGORIES } from './seed';
import type { Category, ImportedFile, MediaItem, Note, Rule, Transaction } from './types';

export const db = new Dexie('financas-pessoais') as Dexie & {
  transactions: EntityTable<Transaction, 'id'>;
  rules: EntityTable<Rule, 'id'>;
  categories: EntityTable<Category, 'id'>;
  files: EntityTable<ImportedFile, 'id'>;
  notes: EntityTable<Note, 'id'>;
  media: EntityTable<MediaItem, 'id'>;
};

db.version(1).stores({
  transactions: 'id, fingerprint, date, categoryId, sourceFileId, bank',
  rules: 'id',
  categories: 'id',
  files: 'id',
});

db.version(2).stores({
  notes: 'id, date, kind',
});

db.version(3).stores({
  media: 'id, type, status',
});

db.on('populate', (tx) => {
  void tx.table('categories').bulkAdd(DEFAULT_CATEGORIES);
});
