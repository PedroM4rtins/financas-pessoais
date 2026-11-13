import { ChevronDown, Pin } from 'lucide-react';
import { useMemo, useRef, useState, type FormEvent } from 'react';
import { ActionMenu } from '../components/ActionMenu';
import { FilterChip } from '../components/FilterChip';
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
import { hueColor } from '../lib/hues';

type Draft = {
  id?: string;
  kind: NoteKind;
  title: string;
  body: string;
  date: string;
  pinned: boolean;
};

const emptyDraft = (kind: NoteKind = 'geral'): Draft => ({
  kind,
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
  const [draft, setDraft] = useState<Draft>(() => emptyDraft());
  const [details, setDetails] = useState(false);
  const [filter, setFilter] = useState<NoteFilter>({ kind: 'todas', search: '' });
  const titleInput = useRef<HTMLInputElement>(null);

  const visible = useMemo(() => filterNotes(notes, filter), [notes, filter]);
  const editing = notes.find((note) => note.id === draft.id);

  function reset() {
    // Continua no tipo filtrado: quem está vendo "Ideia" provavelmente está anotando ideias.
    setDraft(emptyDraft(filter.kind === 'todas' ? draft.kind : filter.kind));
    setDetails(false);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const title = draft.title.trim();
    const body = draft.body.trim();
    if (!title && !body) {
      toast('Escreva o título ou o texto da anotação');
      titleInput.current?.focus();
      return;
    }
    if (!DATE.test(draft.date)) {
      toast('Escolha uma data válida');
      setDetails(true);
      return;
    }
    const fields = { kind: draft.kind, title, body, date: draft.date, pinned: draft.pinned };
    if (editing) {
      await updateNote({ ...editing, ...fields });
      toast('Anotação salva');
    } else {
      await addNote(fields);
      toast('Anotação adicionada');
    }
    reset();
    titleInput.current?.focus();
  }

  function edit(note: Note) {
    setDraft(toDraft(note));
    setDetails(true);
    titleInput.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    titleInput.current?.focus({ preventScroll: true });
  }

  return (
    <>
      <PageHeader title="Anotações" subtitle="Lembretes, contas, metas e ideias, com data" />

      <form
        className="card mb-5 p-3"
        aria-label={draft.id ? 'Editar anotação' : 'Nova anotação'}
        onSubmit={(event) => void submit(event)}
      >
        <div className="flex gap-2 max-[600px]:flex-wrap">
          <select
            className="field w-[150px] shrink-0 max-[600px]:w-full"
            aria-label="Tipo"
            value={draft.kind}
            onChange={(event) => setDraft({ ...draft, kind: event.target.value as NoteKind })}
          >
            {NOTE_KINDS.map((kind) => (
              <option key={kind.id} value={kind.id}>
                {kind.label}
              </option>
            ))}
          </select>
          <input
            ref={titleInput}
            type="text"
            name="titulo"
            autoComplete="off"
            className="field min-w-0 flex-1"
            aria-label="Título"
            placeholder={draft.id ? 'Título' : 'Nova anotação: escreva e aperte Enter…'}
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          />
          <button className="btn shrink-0">{draft.id ? 'Salvar' : 'Adicionar'}</button>
        </div>

        {details && (
          <div className="mt-2 grid grid-cols-[minmax(0,1fr)_170px] gap-2 max-[600px]:grid-cols-1">
            <textarea
              className="field min-h-[96px] resize-y"
              aria-label="Texto"
              placeholder="Texto da anotação…"
              value={draft.body}
              onChange={(event) => setDraft({ ...draft, body: event.target.value })}
            />
            <div className="flex flex-col gap-2">
              <label className="flex flex-col gap-1 text-xs text-muted">
                Data
                <input
                  type="date"
                  className="field text-sm"
                  required
                  value={draft.date}
                  onChange={(event) => setDraft({ ...draft, date: event.target.value })}
                />
              </label>
              <label className="flex cursor-pointer items-center gap-2 py-1 text-muted">
                <input
                  type="checkbox"
                  checked={draft.pinned}
                  onChange={(event) => setDraft({ ...draft, pinned: event.target.checked })}
                />
                Fixar no topo
              </label>
            </div>
          </div>
        )}

        <div className="mt-2 flex items-center gap-3 text-xs">
          {draft.id ? (
            <button
              type="button"
              className="font-semibold text-muted hover:text-ink"
              onClick={reset}
            >
              Cancelar edição
            </button>
          ) : (
            <button
              type="button"
              className="flex items-center gap-1 font-semibold text-muted hover:text-ink"
              aria-expanded={details}
              onClick={() => setDetails(!details)}
            >
              <ChevronDown
                size={14}
                strokeWidth={2}
                aria-hidden="true"
                className={`transition-transform motion-reduce:transition-none ${details ? 'rotate-180' : ''}`}
              />
              {details ? 'Menos detalhes' : 'Texto, data e fixar'}
            </button>
          )}
        </div>
      </form>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Filtrar por tipo" className="flex flex-wrap gap-1.5">
          <FilterChip
            active={filter.kind === 'todas'}
            onClick={() => setFilter({ ...filter, kind: 'todas' })}
          >
            Todas
          </FilterChip>
          {NOTE_KINDS.map((kind) => (
            <FilterChip
              key={kind.id}
              active={filter.kind === kind.id}
              onClick={() => setFilter({ ...filter, kind: kind.id })}
            >
              <kind.icon
                size={14}
                strokeWidth={2}
                aria-hidden="true"
                style={filter.kind === kind.id ? undefined : { color: hueColor(kind.hue) }}
              />
              {kind.label}
            </FilterChip>
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
            ? 'Nenhuma anotação ainda. Escreva a primeira no campo acima.'
            : 'Nenhuma anotação com esse filtro.'}
        </div>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-3">
          {visible.map((note) => {
            const kind = noteKind(note.kind);
            return (
              <li
                key={note.id}
                className="card flex flex-col gap-1.5 border-l-[3px] p-4"
                style={{ borderLeftColor: hueColor(kind.hue) }}
              >
                <div className="flex items-center gap-1.5 text-xs text-muted">
                  <kind.icon
                    size={14}
                    strokeWidth={2}
                    aria-hidden="true"
                    style={{ color: hueColor(kind.hue) }}
                  />
                  <span className="whitespace-nowrap">{kind.label}</span>
                  <time dateTime={note.date} className="ml-1 whitespace-nowrap tabular-nums">
                    {fullDate(note.date)}
                  </time>
                  {note.pinned && (
                    <Pin
                      size={13}
                      strokeWidth={2}
                      className="ml-1 text-accent"
                      role="img"
                      aria-label="Fixada"
                    />
                  )}
                  <div className="-my-1.5 ml-auto">
                    <ActionMenu
                      label={`Ações de “${note.title || 'anotação'}”`}
                      actions={[
                        { label: 'Editar', onSelect: () => edit(note) },
                        {
                          label: note.pinned ? 'Desafixar' : 'Fixar no topo',
                          onSelect: () => void updateNote({ ...note, pinned: !note.pinned }),
                        },
                        {
                          label: 'Excluir',
                          confirm: 'Confirmar exclusão',
                          onSelect: () => {
                            if (draft.id === note.id) reset();
                            void deleteNote(note.id).then(() => toast('Anotação excluída'));
                          },
                        },
                      ]}
                    />
                  </div>
                </div>
                {note.title && (
                  <h2 className="text-[15px] font-semibold leading-snug [text-wrap:balance]">
                    {note.title}
                  </h2>
                )}
                {note.body && (
                  <p className="whitespace-pre-wrap break-words text-ink/85">{note.body}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
