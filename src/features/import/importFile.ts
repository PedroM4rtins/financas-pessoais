import { db } from '../../db';
import type { ImportedFile, Transaction } from '../../db/types';
import { dayMonth } from '../../lib/dates';
import { hashBytes } from '../../lib/hash';
import { buildTransactions } from './buildTransactions';
import { detectParser } from './parsers';
import { decodeText } from './readErrors';

export type ImportPreview = {
  file: ImportedFile;
  /** Só as transações novas: as repetidas já saem daqui. */
  transactions: Transaction[];
  duplicates: number;
  alreadyImported: boolean;
};

const period = (transactions: Transaction[]): string => {
  const dates = transactions.map((tx) => tx.date).sort();
  const first = dates[0];
  const last = dates[dates.length - 1];
  return first && last ? `${dayMonth(first)} a ${dayMonth(last)}` : 'sem transações';
};

export async function readImportFile(
  source: File,
  data: ArrayBuffer,
  password?: string,
): Promise<ImportPreview> {
  const isPdf = source.name.toLowerCase().endsWith('.pdf');
  // O pdf.js tem mais de 1 MB: só é baixado quando aparece um PDF.
  const text = isPdf
    ? await import('./pdfText').then(({ extractPdfText }) => extractPdfText(data, password))
    : decodeText(data);
  const parser = detectParser(text);
  const id = await hashBytes(data);
  const all = buildTransactions(parser.parse(text), id, parser.name);

  const known = await db.transactions
    .where('fingerprint')
    .anyOf(all.map((tx) => tx.fingerprint))
    .toArray();
  const seen = new Set(known.map((tx) => tx.fingerprint));
  const transactions = all.filter((tx) => !seen.has(tx.fingerprint));

  return {
    file: {
      id,
      fileName: source.name,
      bank: parser.name,
      period: period(all),
      importedAt: new Date().toISOString(),
      count: transactions.length,
    },
    transactions,
    duplicates: all.length - transactions.length,
    alreadyImported: (await db.files.get(id)) !== undefined,
  };
}
