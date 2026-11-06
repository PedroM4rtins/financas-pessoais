import type { Category, Transaction } from '../db/types';

const HEADERS = [
  'Data',
  'Nome',
  'Descrição original',
  'CNPJ/CPF',
  'Banco',
  'Tipo',
  'Categoria',
  'Valor',
];

type Row = (string | number)[];

function toRows(transactions: Transaction[], categoryOf: (id: string | null) => Category): Row[] {
  return transactions.map((tx) => [
    tx.date,
    tx.name,
    tx.rawDescription,
    tx.document ?? '',
    tx.bank,
    tx.kind,
    categoryOf(tx.categoryId).name,
    tx.amount / 100,
  ]);
}

export function download(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

/** Planilhas executam células que começam com estes sinais: descrições vêm de arquivos externos. */
const csvCell = (value: string | number): string => {
  if (typeof value === 'number') return value.toFixed(2).replace('.', ',');
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[;"\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export function exportCsv(
  transactions: Transaction[],
  categoryOf: (id: string | null) => Category,
  fileName: string,
): void {
  const lines = [HEADERS, ...toRows(transactions, categoryOf)].map((row) =>
    row.map(csvCell).join(';'),
  );
  // O BOM faz o Excel abrir os acentos corretamente.
  download(new Blob([`\ufeff${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' }), fileName);
}

export async function exportXlsx(
  transactions: Transaction[],
  categoryOf: (id: string | null) => Category,
  fileName: string,
): Promise<void> {
  const XLSX = await import('xlsx');
  const sheet = XLSX.utils.aoa_to_sheet([HEADERS, ...toRows(transactions, categoryOf)]);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Transações');
  XLSX.writeFile(book, fileName);
}
