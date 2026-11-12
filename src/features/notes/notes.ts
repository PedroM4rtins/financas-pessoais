import type { Note, NoteKind } from '../../db/types';
import { normalizeText as normalize } from '../classify/normalize';

export const NOTE_KINDS: { id: NoteKind; label: string; icon: string; color: string }[] = [
  { id: 'geral', label: 'Geral', icon: '📝', color: '#5C6B7A' },
  { id: 'lembrete', label: 'Lembrete', icon: '⏰', color: '#3A7BD5' },
  { id: 'conta', label: 'Conta a pagar', icon: '💸', color: '#E5484D' },
  { id: 'meta', label: 'Meta', icon: '🎯', color: '#2A9D8F' },
  { id: 'ideia', label: 'Ideia', icon: '💡', color: '#C9971A' },
];

const FALLBACK = NOTE_KINDS[0]!;

export const noteKind = (id: NoteKind) => NOTE_KINDS.find((kind) => kind.id === id) ?? FALLBACK;

export type NoteFilter = { kind: NoteKind | 'todas'; search: string };

/** Fixadas primeiro; depois a data mais recente; no empate, a editada por último. */
export function filterNotes(notes: Note[], { kind, search }: NoteFilter): Note[] {
  const term = normalize(search.trim());
  return notes
    .filter((note) => kind === 'todas' || note.kind === kind)
    .filter((note) => !term || normalize(`${note.title} ${note.body}`).includes(term))
    .sort(
      (a, b) =>
        Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) ||
        b.date.localeCompare(a.date) ||
        b.updatedAt.localeCompare(a.updatedAt),
    );
}

/** Hoje no fuso de quem usa, como yyyy-mm-dd. */
export function today(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** dd/mm/aaaa de uma data ISO. */
export const fullDate = (date: string): string =>
  `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`;
