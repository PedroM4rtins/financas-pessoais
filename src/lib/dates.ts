export const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

/** yyyy-mm de uma data ISO. */
export const monthOf = (date: string): string => date.slice(0, 7);

export function shiftMonth(month: string, delta: number): string {
  const [year = 0, mon = 1] = month.split('-').map(Number);
  const index = year * 12 + (mon - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
}

export function monthLabel(month: string): string {
  const [year, mon = 1] = month.split('-').map(Number);
  return `${MONTHS[mon - 1]} ${year}`;
}

export const monthShort = (month: string): string =>
  (MONTHS[Number(month.slice(5, 7)) - 1] ?? '').slice(0, 3);

/** dd/mm de uma data ISO. */
export const dayMonth = (date: string): string => `${date.slice(8, 10)}/${date.slice(5, 7)}`;

export function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
