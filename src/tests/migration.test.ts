import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { expect, it } from 'vitest';
import type { Category } from '../db/types';

// Arquivo próprio: o banco precisa existir na versão 3 antes de o app abri-lo.
it('a versão 4 troca só as cores padrão que ninguém mudou', async () => {
  const old = new Dexie('financas-pessoais');
  old.version(3).stores({
    transactions: 'id, fingerprint, date, categoryId, sourceFileId, bank',
    rules: 'id',
    categories: 'id',
    files: 'id',
    notes: 'id, date, kind',
    media: 'id, type, status',
  });
  await old.table<Category>('categories').bulkAdd([
    { id: 'transporte', name: 'Transporte', color: '#3a7bd5', icon: '🚗' },
    { id: 'lazer', name: 'Lazer', color: '#123456', icon: '🎬' },
    { id: 'minha', name: 'Pets', color: '#E07A3F', icon: '🐶' },
  ]);
  old.close();

  const { db } = await import('../db');
  const byId = new Map((await db.categories.toArray()).map((item) => [item.id, item.color]));
  expect(byId.get('transporte')).toBe('#3366A8');
  expect(byId.get('lazer')).toBe('#123456');
  expect(byId.get('minha')).toBe('#E07A3F');
});
