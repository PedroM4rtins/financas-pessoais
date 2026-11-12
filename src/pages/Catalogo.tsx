import { useMemo, useState, type FormEvent } from 'react';
import { PageHeader } from '../components/PageHeader';
import { useToast } from '../components/Toast';
import { useMedia } from '../db/hooks';
import { addMedia, deleteMedia, updateMedia } from '../db/repository';
import type { MediaItem, MediaStatus, MediaType } from '../db/types';
import {
  countByStatus,
  filterMedia,
  MEDIA_STATUSES,
  MEDIA_TYPES,
  mediaStatus,
  mediaType,
  parseYear,
  stars,
  withStatus,
  type MediaFilter,
} from '../features/catalog/catalog';
import { fullDate, today } from '../features/notes/notes';

type Draft = {
  id?: string;
  type: MediaType;
  status: MediaStatus;
  title: string;
  year: string;
  platform: string;
  rating: string;
  watchedAt: string;
  notes: string;
};

const emptyDraft = (status: MediaStatus): Draft => ({
  type: 'filme',
  status,
  title: '',
  year: '',
  platform: '',
  rating: '',
  watchedAt: '',
  notes: '',
});

const toDraft = (item: MediaItem): Draft => ({
  id: item.id,
  type: item.type,
  status: item.status,
  title: item.title,
  year: item.year ? String(item.year) : '',
  platform: item.platform ?? '',
  rating: item.rating ? String(item.rating) : '',
  watchedAt: item.watchedAt ?? '',
  notes: item.notes,
});

const finished = (status: MediaStatus) => status === 'visto' || status === 'abandonado';

/** Atalhos de status no cartão: o próximo passo natural de cada um. */
const NEXT: Record<MediaStatus, { status: MediaStatus; label: string }[]> = {
  quero_ver: [
    { status: 'assistindo', label: 'Comecei' },
    { status: 'visto', label: 'Já vi' },
  ],
  assistindo: [
    { status: 'visto', label: 'Terminei' },
    { status: 'abandonado', label: 'Abandonei' },
  ],
  visto: [{ status: 'assistindo', label: 'Rever' }],
  abandonado: [{ status: 'assistindo', label: 'Retomar' }],
};

export function Catalogo() {
  const items = useMedia();
  const toast = useToast();
  const [filter, setFilter] = useState<MediaFilter>({
    status: 'quero_ver',
    type: 'todos',
    search: '',
  });
  const [draft, setDraft] = useState<Draft>(() => emptyDraft('quero_ver'));
  const [confirming, setConfirming] = useState<string | null>(null);

  const visible = useMemo(() => filterMedia(items, filter), [items, filter]);
  const counts = useMemo(() => countByStatus(items), [items]);
  const editing = items.find((item) => item.id === draft.id);

  function setStatus(status: MediaStatus) {
    setDraft({
      ...draft,
      status,
      watchedAt: finished(status) ? draft.watchedAt || today() : '',
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const title = draft.title.trim();
    if (!title) {
      toast('Digite o título');
      return;
    }
    const year = parseYear(draft.year);
    if (year === null) {
      toast('Ano inválido. Use quatro dígitos, como 2024');
      return;
    }
    const fields: Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt'> = {
      type: draft.type,
      status: draft.status,
      title,
      notes: draft.notes.trim(),
      ...(year ? { year } : {}),
      ...(draft.platform.trim() ? { platform: draft.platform.trim() } : {}),
      ...(draft.rating ? { rating: Number(draft.rating) } : {}),
      ...(finished(draft.status) && draft.watchedAt ? { watchedAt: draft.watchedAt } : {}),
    };
    if (editing) {
      // Sem espalhar o registro antigo: campo apagado no formulário some de verdade.
      await updateMedia({
        ...fields,
        id: editing.id,
        createdAt: editing.createdAt,
        updatedAt: editing.updatedAt,
      });
      toast('✅ Atualizado');
    } else {
      await addMedia(fields);
      toast(`✅ Adicionado em “${mediaStatus(draft.status).label}”`);
    }
    setFilter({ ...filter, status: draft.status });
    setDraft(emptyDraft(draft.status));
  }

  function edit(item: MediaItem) {
    setDraft(toDraft(item));
    document.getElementById('catalogo-titulo')?.focus();
  }

  async function move(item: MediaItem, status: MediaStatus) {
    await updateMedia(withStatus(item, status, today()));
    toast(`${item.title} → ${mediaStatus(status).label}`);
  }

  return (
    <>
      <PageHeader title="Filmes e séries" subtitle="Filmes, séries e animes que vi e quero ver" />

      <form className="card mb-4" onSubmit={(event) => void submit(event)}>
        <h2 className="card-title">{draft.id ? 'Editar' : 'Adicionar'}</h2>
        <div className="grid grid-cols-[minmax(0,1fr)_140px_150px_100px] gap-2.5 max-[900px]:grid-cols-1">
          <input
            id="catalogo-titulo"
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
            value={draft.type}
            onChange={(event) => setDraft({ ...draft, type: event.target.value as MediaType })}
          >
            {MEDIA_TYPES.map((type) => (
              <option key={type.id} value={type.id}>
                {type.icon} {type.label}
              </option>
            ))}
          </select>
          <select
            className="field min-w-0"
            aria-label="Status"
            value={draft.status}
            onChange={(event) => setStatus(event.target.value as MediaStatus)}
          >
            {MEDIA_STATUSES.map((status) => (
              <option key={status.id} value={status.id}>
                {status.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            inputMode="numeric"
            className="field min-w-0"
            aria-label="Ano de lançamento"
            placeholder="Ano"
            maxLength={4}
            value={draft.year}
            onChange={(event) => setDraft({ ...draft, year: event.target.value })}
          />
        </div>
        <div className="mt-2.5 grid grid-cols-[minmax(0,1fr)_150px_170px] gap-2.5 max-[900px]:grid-cols-1">
          <input
            type="text"
            className="field min-w-0"
            aria-label="Onde assistir"
            placeholder="Onde assistir (Netflix, Crunchyroll, cinema…)"
            value={draft.platform}
            onChange={(event) => setDraft({ ...draft, platform: event.target.value })}
          />
          <select
            className="field min-w-0"
            aria-label="Nota"
            value={draft.rating}
            onChange={(event) => setDraft({ ...draft, rating: event.target.value })}
          >
            <option value="">Sem nota</option>
            {[5, 4, 3, 2, 1].map((rating) => (
              <option key={rating} value={rating}>
                {stars(rating)}
              </option>
            ))}
          </select>
          {finished(draft.status) && (
            <input
              type="date"
              className="field min-w-0"
              aria-label="Quando terminou"
              value={draft.watchedAt}
              onChange={(event) => setDraft({ ...draft, watchedAt: event.target.value })}
            />
          )}
        </div>
        <textarea
          className="field mt-2.5 min-h-[70px] w-full resize-y"
          aria-label="Comentários"
          placeholder="Comentários: em que episódio parei, quem indicou, o que achei…"
          value={draft.notes}
          onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
        />
        <div className="mt-3 flex justify-end gap-2">
          <button className="btn">{draft.id ? 'Salvar' : 'Adicionar'}</button>
          {draft.id && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setDraft(emptyDraft(filter.status))}
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div role="group" aria-label="Status" className="mb-3 flex flex-wrap gap-1.5">
        {MEDIA_STATUSES.map((status) => (
          <button
            key={status.id}
            type="button"
            aria-pressed={filter.status === status.id}
            className={`btn-ghost ${filter.status === status.id ? 'border-accent text-accent' : ''}`}
            onClick={() => {
              setFilter({ ...filter, status: status.id });
              if (!draft.id) setStatus(status.id);
            }}
          >
            {status.label}
            <span className="chip tabular-nums">{counts[status.id]}</span>
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Filtrar por tipo" className="flex flex-wrap gap-1.5">
          {[{ id: 'todos' as const, label: 'Todos', icon: '' }, ...MEDIA_TYPES].map((type) => (
            <button
              key={type.id}
              type="button"
              aria-pressed={filter.type === type.id}
              className={`btn-ghost btn-sm ${filter.type === type.id ? 'border-accent text-accent' : ''}`}
              onClick={() => setFilter({ ...filter, type: type.id })}
            >
              {type.icon && <span aria-hidden="true">{type.icon}</span>}
              {type.label}
            </button>
          ))}
        </div>
        <input
          type="search"
          className="field ml-auto w-[240px] max-w-full max-[900px]:ml-0 max-[900px]:w-full"
          aria-label="Buscar no catálogo"
          placeholder="Buscar…"
          value={filter.search}
          onChange={(event) => setFilter({ ...filter, search: event.target.value })}
        />
      </div>

      {visible.length === 0 ? (
        <div className="card empty">
          {counts[filter.status] === 0
            ? `Nada em “${mediaStatus(filter.status).label}” ainda.`
            : 'Nada com esse filtro.'}
        </div>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
          {visible.map((item) => {
            const type = mediaType(item.type);
            return (
              <li key={item.id} className="card flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span className="chip">
                    <span aria-hidden="true">{type.icon}</span> {type.label}
                  </span>
                  {item.year && <span className="tabular-nums">{item.year}</span>}
                  {item.platform && <span>· {item.platform}</span>}
                </div>
                <h2 className="text-[15px] font-semibold leading-snug">{item.title}</h2>
                {(item.rating || item.watchedAt) && (
                  <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    {item.rating && (
                      <span className="text-[14px] tracking-[0.1em] text-accent">
                        <span aria-hidden="true">{stars(item.rating)}</span>
                        <span className="sr-only">Nota {item.rating} de 5</span>
                      </span>
                    )}
                    {item.watchedAt && (
                      <time dateTime={item.watchedAt} className="tabular-nums">
                        {item.status === 'abandonado' ? 'Parei em' : 'Visto em'}{' '}
                        {fullDate(item.watchedAt)}
                      </time>
                    )}
                  </p>
                )}
                {item.notes && (
                  <p className="whitespace-pre-wrap break-words text-muted">{item.notes}</p>
                )}
                <div className="mt-auto flex flex-wrap justify-end gap-1.5 pt-1">
                  {NEXT[item.status].map((next) => (
                    <button
                      key={next.status}
                      className="btn-ghost btn-sm"
                      onClick={() => void move(item, next.status)}
                    >
                      {next.label}
                    </button>
                  ))}
                  <button className="btn-ghost btn-sm" onClick={() => edit(item)}>
                    Editar
                  </button>
                  {confirming === item.id ? (
                    <button
                      className="btn-ghost btn-sm text-warn"
                      onClick={() => {
                        setConfirming(null);
                        if (draft.id === item.id) setDraft(emptyDraft(filter.status));
                        void deleteMedia(item.id).then(() => toast('🗑️ Removido do catálogo'));
                      }}
                    >
                      Confirmar exclusão
                    </button>
                  ) : (
                    <button className="btn-ghost btn-sm" onClick={() => setConfirming(item.id)}>
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
