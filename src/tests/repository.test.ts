import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import {
  addRule,
  clearAllData,
  deleteCategory,
  deleteRule,
  exportBackup,
  parseBackup,
  restoreBackup,
  saveImport,
  setManualCategory,
} from '../db/repository';
import type { ImportedFile, Transaction } from '../db/types';
import { buildTransactions } from '../features/import/buildTransactions';

const file: ImportedFile = {
  id: 'arquivo',
  fileName: 'extrato.pdf',
  bank: 'Inter',
  period: '01/11 a 02/11',
  importedAt: '2026-11-06T00:00:00.000Z',
  count: 3,
};

const sample = (): Transaction[] =>
  buildTransactions(
    [
      { date: '2026-11-01', description: 'PIX ENVIADO JORGE DA SILVA', amount: -1000 },
      { date: '2026-11-02', description: 'PIX ENVIADO JORGE DA SILVA', amount: -1800 },
      { date: '2026-11-02', description: 'UBER TRIP', amount: -2000 },
    ],
    file.id,
    file.bank,
  );

const jorgeRule = {
  field: 'name',
  operator: 'equals',
  value: 'JORGE DA SILVA',
  categoryId: 'alimentacao',
  priority: 0,
} as const;

beforeEach(async () => {
  await clearAllData();
  await saveImport(file, sample());
});

describe('repository', () => {
  it('classifica ao importar e conta o que ficou pendente', async () => {
    await clearAllData();
    expect(await saveImport(file, sample())).toEqual({ classified: 1, pending: 2 });
  });

  it('não conta entrada nem pagamento de fatura como pendência', async () => {
    await clearAllData();
    const rows = buildTransactions(
      [
        { date: '2026-11-01', description: 'PIX RECEBIDO MARIA', amount: 5000 },
        { date: '2026-11-01', description: 'PAGAMENTO FATURA INTER', amount: -9000 },
      ],
      file.id,
      file.bank,
    );
    expect(await saveImport(file, rows)).toEqual({ classified: 0, pending: 0 });
  });

  it('nova regra vale para transações antigas e informa quantas', async () => {
    expect(await addRule(jorgeRule)).toBe(2);
    const pending = await db.transactions.filter((tx) => tx.categoryId === null).count();
    expect(pending).toBe(0);
  });

  it('regra também vale para importações futuras', async () => {
    await addRule(jorgeRule);
    const [next] = buildTransactions(
      [{ date: '2026-12-01', description: 'PIX ENVIADO JORGE DA SILVA', amount: -500 }],
      'outro',
      'Inter',
    );
    expect(next && (await saveImport(file, [next]))).toEqual({ classified: 1, pending: 0 });
  });

  it('excluir regra devolve as transações para não classificado', async () => {
    await addRule(jorgeRule);
    const rule = await db.rules.toCollection().first();
    await deleteRule(rule?.id ?? '');
    expect(await db.transactions.filter((tx) => tx.categoryId === null).count()).toBe(2);
  });

  it('regra não altera classificação manual', async () => {
    const [first] = await db.transactions.filter((tx) => tx.name === 'JORGE DA SILVA').toArray();
    await setManualCategory([first?.id ?? ''], 'saude');
    expect(await addRule(jorgeRule)).toBe(1);
    expect((await db.transactions.get(first?.id ?? ''))?.categoryId).toBe('saude');
  });

  it('excluir categoria remove regras e não deixa palavra-chave apontando para ela', async () => {
    await addRule(jorgeRule);
    await deleteCategory('alimentacao');
    await deleteCategory('transporte');
    expect(await db.rules.count()).toBe(0);
    expect(await db.transactions.filter((tx) => tx.categoryId !== null).count()).toBe(0);
  });

  it('restaura o backup substituindo tudo', async () => {
    await addRule(jorgeRule);
    const backup = parseBackup(JSON.stringify(await exportBackup()));
    await clearAllData();
    expect(await db.transactions.count()).toBe(0);
    await restoreBackup(backup);
    expect(await db.transactions.count()).toBe(3);
    expect(await db.rules.count()).toBe(1);
  });

  it('recusa backup inválido', () => {
    expect(() => parseBackup('{"version":2}')).toThrow('inválido');
    expect(() => parseBackup('isto não é json')).toThrow('inválido');
  });

  it('recusa backup com registro incompleto, antes de apagar qualquer coisa', async () => {
    const backup = await exportBackup();
    const broken = {
      ...backup,
      transactions: [...backup.transactions, { id: 'sem-valor', date: '2026-11-01' }],
    };
    expect(() => parseBackup(JSON.stringify(broken))).toThrow('inválido');
    expect(await db.transactions.count()).toBe(3);
  });
});
