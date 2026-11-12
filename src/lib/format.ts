const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Formata centavos como R$ 1.234,56. */
export function formatBRL(cents: number): string {
  return brl.format(cents / 100).replace(/\u00a0/g, ' ');
}

/** Converte "1.234,56" em centavos, sem passar por ponto flutuante. */
export function parseBRL(text: string): number {
  const cents = Number(text.replace(/\D/g, ''));
  return text.includes('-') ? -cents : cents;
}

/**
 * Valor digitado por uma pessoa, em centavos: aceita "1.500", "1.500,50", "R$ 15,5" e
 * "1500.5". Ponto seguido de três dígitos é separador de milhar, como no Brasil.
 * Devolve null quando o texto não é um valor.
 */
export function parseMoneyInput(text: string): number | null {
  const clean = text.replace(/R\$|\s/g, '');
  if (!/^\d[\d.,]*$/.test(clean)) return null;
  let integer: string;
  let decimals = '';
  if (clean.includes(',')) {
    const [whole = '', fraction = '', ...rest] = clean.split(',');
    if (rest.length > 0 || !/^\d{1,3}(\.\d{3})*$|^\d+$/.test(whole)) return null;
    integer = whole.replace(/\./g, '');
    decimals = fraction;
  } else if (/^\d{1,3}(\.\d{3})+$/.test(clean)) {
    integer = clean.replace(/\./g, '');
  } else {
    const [whole = '', fraction = '', ...rest] = clean.split('.');
    if (rest.length > 0) return null;
    integer = whole;
    decimals = fraction;
  }
  if (!/^\d*$/.test(decimals) || decimals.length > 2) return null;
  return Number(integer) * 100 + Number(decimals.padEnd(2, '0'));
}

export function formatDocument(document: string): string {
  if (document.length === 14) {
    return document.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }
  if (document.length === 11) {
    return document.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  }
  if (document.length === 6) {
    return document.replace(/^(\d{3})(\d{3})$/, '***.$1.$2-**');
  }
  return document;
}

export const documentLabel = (document: string): string =>
  document.length === 14 ? 'CNPJ' : 'CPF';

export const transactionCount = (count: number): string =>
  `${count} ${count === 1 ? 'transação' : 'transações'}`;
