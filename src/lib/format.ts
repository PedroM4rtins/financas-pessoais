const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Formata centavos como R$ 1.234,56. */
export function formatBRL(cents: number): string {
  return brl.format(cents / 100).replace(/ /g, ' ');
}

/** Converte "1.234,56" em centavos, sem passar por ponto flutuante. */
export function parseBRL(text: string): number {
  const cents = Number(text.replace(/\D/g, ''));
  return text.includes('-') ? -cents : cents;
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
