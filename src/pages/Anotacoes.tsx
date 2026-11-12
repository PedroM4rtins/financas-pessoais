import { Pin, PinOff } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { PageHeader } from '../components/PageHeader';
import { useToast } from '../components/Toast';
import { useNotes } from '../db/hooks';
import { addNote, deleteNote, updateNote } from '../db/repository';
import type { Note, NoteKind } from '../db/types';
import {
  filterNotes,
  fullDate,
  NOTE_KINDS,
  noteKind,
  today,
  type NoteFilter,
} from '../features/notes/notes';

type Draft = {
  id?: string;
  kind: NoteKind;
  title: string;
  body: string;
  date: string;
  pinned: boolean;
};

const emptyDraft = (): Draft => ({
  kind: 'geral',
  title: '',
  body: '',
  date: today(),
  pinned: false,
});

const toDraft = (note: Note): Draft => ({
  id: note.id,
  kind: note.kind,
  title: note.title,
  body: note.body,
  date: note.date,
  pinned: Boolean(note.pinned),
});

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function Anotacoes() {
  const notes = useNotes();
  const toast = useToast();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [filter, setFilter] = useState<NoteFilter>({ kind: 'todas', search: '' });
  const [confirming, setConfirming] = useState<string | null>(null);

  const visible = useMemo(() => filterNotes(notes, filter), [notes, filter]);
  const editing = notes.find((note) => note.id === draft.id);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const title = draft.title.trim();
    const body = draft.body.trim();
    if (!title && !body) {
      toast('Escreva um título ou um texto para a anotação');
      return;
    }
    if (!DATE.test(draft.date)) {
      toast('Escolha uma data válida');
      return;
    }
    const fields = { kind: draft.kind, title, body, date: draft.date, pinned: draft.pinned };
    if (editing) {
      await updateNote({ ...editing, ...fields });
      toast('✅ Anotação atualizada');
    } else {
      await addNote(fields);
      toast('✅ Anotação criada');
    }
    setDraft(emptyDraft());
  }

  function edit(note: Note) {
    setDraft(toDraft(note));
    document.getElementById('anotacao-titulo')?.focus();
  }

  return (
    <>
      <PageHeader title="Anotações" subtitle="Lembretes, contas, metas e ideias, com data" />

      <form className="card mb-4" onSubmit={(event) => void submit(event)}>
        <h2 className="card-title">{draft.id ? 'Editar anotação' : 'Nova anotação'}</h2>
        <div className="grid grid-cols-[minmax(0,1fr)_180px_160px] gap-2.5 max-[900px]:grid-cols-1">
          <input
            id="anotacao-titulo"
            type="text"
            className="field min-w-0"
            aria-label="Título"
            placeholder="Título"
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          />
          <select
            className="field min-w-0"
            aria-label="Tipo"
            value={draft.kind}
            onChange={(event) => setDraft({ ...draft, kind: event.target.value as NoteKind })}
          >
            {NOTE_KINDS.map((kind) => (
              <option key={kind.id} value={kind.id}>
                {kind.icon} {kind.label}
              </option>
            ))}
          </select>
          <input
            type="date"
            className="field min-w-0"
            aria-label="Data"
            required
            value={draft.date}
            onChange={(event) => setDraft({ ...draft, date: event.target.value })}
          />
          <textarea
            className="field col-span-full min-h-[110px] resize-y"
            aria-label="Texto"
            placeholder="Escreva aqui…"
            value={draft.body}
            onChange={(event) => setDraft({ ...draft, body: event.target.value })}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-muted">
            <input
              type="checkbox"
              checked={draft.pinned}
              onChange={(event) => setDraft({ ...draft, pinned: event.target.checked })}
            />
            Fixar no topo
          </label>
          <div className="flex gap-2">
            <button className="btn">{draft.id ? 'Salvar' : 'Adicionar'}</button>
            {draft.id && (
              <button type="button" className="btn-ghost" onClick={() => setDraft(emptyDraft())}>
                Cancelar
              </button>
            )}
          </div>
        </div>
      </form>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Filtrar por tipo" className="flex flex-wrap gap-1.5">
          {[{ id: 'todas' as const, label: 'Todas', icon: '' }, ...NOTE_KINDS].map((kind) => (
            <button
              key={kind.id}
              type="button"
              aria-pressed={filter.kind === kind.id}
              className={`btn-ghost btn-sm ${filter.kind === kind.id ? 'border-accent text-accent' : ''}`}
              onClick={() => setFilter({ ...filter, kind: kind.id })}
            >
              {kind.icon && <span aria-hidden="true">{kind.icon}</span>}
              {kind.label}
            </button>
          ))}
        </div>
        <input
          type="search"
          className="field ml-auto w-[240px] max-w-full max-[900px]:ml-0 max-[900px]:w-full"
          aria-label="Buscar nas anotações"
          placeholder="Buscar…"
          value={filter.search}
          onChange={(event) => setFilter({ ...filter, search: event.target.value })}
        />
      </div>

      {visible.length === 0 ? (
        <div className="card empty">
          {notes.length === 0
            ? 'Nenhuma anotação ainda. Escreva a primeira acima.'
            : 'Nenhuma anotação com esse filtro.'}
        </div>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
          {visible.map((note) => {
            const kind = noteKind(note.kind);
            return (
              <li
                key={note.id}
                className="card flex flex-col gap-2 border-l-4"
                style={{ borderLeftColor: kind.color }}
              >
                <div className="flex items-center gap-2 text-xs text-muted">
                  <span className="chip">
                    <span aria-hidden="true">{kind.icon}</span> {kind.label}
                  </span>
                  <time dateTime={note.date} className="tabular-nums">
                    {fullDate(note.date)}
                  </time>
                  <button
                    type="button"
                    className="ml-auto rounded p-1 hover:bg-head hover:text-ink"
                    aria-label={note.pinned ? 'Desafixar' : 'Fixar no topo'}
                    aria-pressed={Boolean(note.pinned)}
                    onClick={() => void updateNote({ ...note, pinned: !note.pinned })}
                  >
                    {note.pinned ? (
                      <Pin size={15} strokeWidth={1.8} className="text-accent" aria-hidden="true" />
                    ) : (
                      <PinOff size={15} strokeWidth={1.8} aria-hidden="true" />
                    )}
                  </button>
                </div>
                {note.title && (
                  <h2 className="text-[15px] font-semibold leading-snug">{note.title}</h2>
                )}
                {note.body && <p className="whitespace-pre-wrap break-words">{note.body}</p>}
                <div className="mt-auto flex justify-end gap-1.5 pt-1">
                  <button className="btn-ghost btn-sm" onClick={() => edit(note)}>
                    Editar
                  </button>
                  {confirming === note.id ? (
                    <button
                      className="btn-ghost btn-sm text-warn"
                      onClick={() => {
                        setConfirming(null);
                        if (draft.id === note.id) setDraft(emptyDraft());
                        void deleteNote(note.id).then(() => toast('🗑️ Anotação excluída'));
                      }}
                    >
                      Confirmar exclusão
                    </button>
                  ) : (
                    <button className="btn-ghost btn-sm" onClick={() => setConfirming(note.id)}>
                      Excluir
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
