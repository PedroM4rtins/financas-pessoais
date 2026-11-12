import { describe, expect, it } from 'vitest';
import type { Note } from '../db/types';
import { filterNotes, fullDate } from '../features/notes/notes';

const note = (fields: Partial<Note> & Pick<Note, 'id'>): Note => ({
  kind: 'geral',
  title: '',
  body: '',
  date: '2026-11-01',
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  ...fields,
});

const notes = [
  note({ id: 'antiga', date: '2026-10-01', title: 'Revisar orçamento' }),
  note({ id: 'nova', date: '2026-11-10', kind: 'conta', title: 'Conta de luz' }),
  note({
    id: 'fixada',
    date: '2026-09-01',
    kind: 'meta',
    body: 'Guardar para a viagem',
    pinned: true,
  }),
];

const ids = (list: Note[]) => list.map((item) => item.id);

describe('filterNotes', () => {
  it('põe as fixadas primeiro e depois a data mais recente', () => {
    expect(ids(filterNotes(notes, { kind: 'todas', search: '' }))).toEqual([
      'fixada',
      'nova',
      'antiga',
    ]);
  });

  it('filtra por tipo', () => {
    expect(ids(filterNotes(notes, { kind: 'conta', search: '' }))).toEqual(['nova']);
  });

  it('busca no título e no texto, sem ligar para acento e maiúsculas', () => {
    expect(ids(filterNotes(notes, { kind: 'todas', search: 'ORCAMENTO' }))).toEqual(['antiga']);
    expect(ids(filterNotes(notes, { kind: 'todas', search: 'viagem' }))).toEqual(['fixada']);
  });
});

it('formata a data como dd/mm/aaaa', () => {
  expect(fullDate('2026-11-05')).toBe('05/11/2026');
});
