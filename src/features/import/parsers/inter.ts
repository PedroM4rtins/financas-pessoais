import { MONTHS } from '../../../lib/dates';
import { parseBRL } from '../../../lib/format';
import { normalizeText } from '../../classify/normalize';
import type { BankParser, RawTransaction } from './types';

const CSV_HEADER = /^DATA LANCAMENTO;HISTORICO;DESCRICAO;VALOR;SALDO/;
const MONTH_NAMES = MONTHS.map(normalizeText);

// "9 de Agosto de 2026 Saldo do dia: R$ 884,77". As linhas seguintes herdam essa data,
// mesmo depois de uma quebra de página.
const DAY_HEADER = /^(\d{1,2}) DE ([A-Z]+) DE (\d{4}) SALDO DO DIA/;
const MONEY = String.raw`-?\s*R\$\s*[\d.]+,\d{2}`;
const PDF_ROW = new RegExp(`^(.+?)\\s+(${MONEY})\\s+(${MONEY})$`);

function parsePdf(text: string): RawTransaction[] {
  const transactions: RawTransaction[] = [];
  let date: string | null = null;
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    const header = normalizeText(line).match(DAY_HEADER);
    if (header) {
      const month = MONTH_NAMES.indexOf(header[2] ?? '') + 1;
      date = `${header[3]}-${String(month).padStart(2, '0')}-${(header[1] ?? '').padStart(2, '0')}`;
      continue;
    }
    const row = line.match(PDF_ROW);
    if (!row || !date) continue;
    transactions.push({ date, description: row[1] ?? '', amount: parseBRL(row[2] ?? '') });
  }
  return transactions;
}

/** O CSV guarda estabelecimento e cidade em colunas fixas: 22 caracteres, cidade e "Bra". */
function merchantFromFixedWidth(description: string): string {
  return /\sBra$/.test(description) ? description.slice(0, 22).trim() : description.trim();
}

function parseCsv(text: string): RawTransaction[] {
  const transactions: RawTransaction[] = [];
  for (const line of text.split(/\r?\n/)) {
    const [date = '', history = '', description = '', value = ''] = line.split(';');
    const parts = date.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!parts) continue;
    transactions.push({
      date: `${parts[3]}-${parts[2]}-${parts[1]}`,
      description: `${history.trim()} ${merchantFromFixedWidth(description)}`.trim(),
      amount: parseBRL(value),
    });
  }
  return transactions;
}

const isCsv = (text: string): boolean =>
  text.split(/\r?\n/).some((line) => CSV_HEADER.test(normalizeText(line)));

export const interParser: BankParser = {
  id: 'inter',
  name: 'Inter',
  detect: (text) => isCsv(text) || /BANCO INTER|SALDO POR TRANSACAO/.test(normalizeText(text)),
  parse: (text) => (isCsv(text) ? parseCsv(text) : parsePdf(text)),
};
