import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAllData, saveImport } from '../db/repository';
import { readImportFile } from '../features/import/importFile';
import { decodeText } from '../features/import/readErrors';

// Se o caminho do CSV carregar o pdf.js, este mock falha o teste.
vi.mock('../features/import/pdfText', () => {
  throw new Error('o pdf.js não deveria ser carregado para CSV');
});

const csv = readFileSync(new URL('./fixtures/inter.csv', import.meta.url));
const bytes = (): ArrayBuffer => new Uint8Array(csv).buffer;
const source = new File([bytes()], 'extrato.csv');

beforeEach(async () => {
  await clearAllData();
});

describe('readImportFile', () => {
  it('lê CSV sem carregar o leitor de PDF', async () => {
    const preview = await readImportFile(source, bytes());
    expect(preview.file.bank).toBe('Inter');
    expect(preview.transactions.length).toBeGreaterThan(0);
    expect(preview.duplicates).toBe(0);
  });

  it('reimportar o mesmo CSV não traz transações novas', async () => {
    const first = await readImportFile(source, bytes());
    await saveImport(first.file, first.transactions);
    const again = await readImportFile(source, bytes());
    expect(again.alreadyImported).toBe(true);
    expect(again.transactions).toHaveLength(0);
    expect(again.duplicates).toBe(first.transactions.length);
  });
});

describe('decodeText', () => {
  it('lê UTF-8 e remove o BOM', () => {
    const data = new TextEncoder().encode('﻿Descrição').buffer;
    expect(decodeText(data)).toBe('Descrição');
  });

  it('cai para Windows-1252 quando não é UTF-8 válido', () => {
    // "Descrição" em Windows-1252: ç = 0xE7, ã = 0xE3.
    const data = new Uint8Array([0x44, 0x65, 0x73, 0x63, 0x72, 0x69, 0xe7, 0xe3, 0x6f]).buffer;
    expect(decodeText(data)).toBe('Descrição');
  });
});
