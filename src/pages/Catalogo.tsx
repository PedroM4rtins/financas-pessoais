import { ChevronDown } from 'lucide-react';
import { useMemo, useRef, useState, type FormEvent } from 'react';
import { ActionMenu } from '../components/ActionMenu';
import { FilterChip } from '../components/FilterChip';
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
  parseYear,
  stars,
  withStatus,
  type MediaFilter,
} from '../features/catalog/catalog';
import { Poster } from '../features/catalog/Poster';
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

const emptyDraft = (status: MediaStatus, type: MediaType = 'filme'): Draft => ({
  type,
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

/** O próximo passo natural de cada status: vira o botão principal do cartaz. */
const NEXT: Record<MediaStatus, { status: MediaStatus; label: string }> = {
  quero_ver: { status: 'assistindo', label: 'Comecei' },
  assistindo: { status: 'visto', label: 'Terminei' },
  visto: { status: 'assistindo', label: 'Rever' },
  abandonado: { status: 'assistindo', label: 'Retomar' },
};

/** Os outros status para onde dá para mandar o item, pelo menu "⋯". */
const MOVE_LABEL: Record<MediaStatus, string> = {
  quero_ver: 'Mover para “Quero ver”',
  assistindo: 'Mover para “Assistindo”',
  visto: 'Marcar como visto',
  abandonado: 'Marcar como abandonado',
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
  const [details, setDetails] = useState(false);
  const titleInput = useRef<HTMLInputElement>(null);

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

  function reset(status = filter.status) {
    setDraft(emptyDraft(status, filter.type === 'todos' ? draft.type : filter.type));
    setDetails(false);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const title = draft.title.trim();
    if (!title) {
      toast('Digite o título');
      titleInput.current?.focus();
      return;
    }
    const year = parseYear(draft.year);
    if (year === null) {
      toast('Ano inválido. Use quatro dígitos, como 2024');
      setDetails(true);
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
      toast(`“${title}” salvo`);
    } else {
      await addMedia(fields);
      toast(`“${title}” adicionado em ${mediaStatus(draft.status).label}`);
    }
    setFilter({ ...filter, status: draft.status });
    reset(draft.status);
    titleInput.current?.focus();
  }

  function edit(item: MediaItem) {
    setDraft(toDraft(item));
    setDetails(true);
    titleInput.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    titleInput.current?.focus({ preventScroll: true });
  }

  async function move(item: MediaItem, status: MediaStatus) {
    await updateMedia(withStatus(item, status, today()));
    toast(`“${item.title}” em ${mediaStatus(status).label}`);
  }

  return (
    <>
      <PageHeader title="Filmes e séries" subtitle="Filmes, séries e animes que vi e quero ver" />

      <form
        className="card mb-5 p-3"
        aria-label={draft.id ? 'Editar título' : 'Adicionar título'}
        onSubmit={(event) => void submit(event)}
      >
        <div className="flex gap-2 max-[600px]:flex-wrap">
          <select
            className="field w-[110px] shrink-0 max-[600px]:flex-1"
            aria-label="Tipo"
            value={draft.type}
            onChange={(event) => setDraft({ ...draft, type: event.target.value as MediaType })}
          >
            {MEDIA_TYPES.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>
          <select
            className="field w-[140px] shrink-0 max-[600px]:flex-1"
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
            ref={titleInput}
            type="text"
            name="titulo"
            autoComplete="off"
            className="field min-w-0 flex-1 max-[600px]:basis-full"
            aria-label="Título"
            placeholder={draft.id ? 'Título' : 'Título do filme, série ou anime…'}
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          />
          <button className="btn shrink-0">{draft.id ? 'Salvar' : 'Adicionar'}</button>
        </div>

        {details && (
          <div className="mt-2 grid grid-cols-[90px_minmax(0,1fr)_150px_170px] gap-2 max-[900px]:grid-cols-2">
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
            <input
              type="text"
              className="field min-w-0"
              aria-label="Onde assistir"
              placeholder="Onde assistir…"
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
            {finished(draft.status) ? (
              <input
                type="date"
                className="field min-w-0"
                aria-label="Quando terminou"
                value={draft.watchedAt}
                onChange={(event) => setDraft({ ...draft, watchedAt: event.target.value })}
              />
            ) : (
              <span aria-hidden="true" />
            )}
            <textarea
              className="field col-span-full min-h-[64px] resize-y"
              aria-label="Comentários"
              placeholder="Em que episódio parei, quem indicou, o que achei…"
              value={draft.notes}
              onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
            />
          </div>
        )}

        <div className="mt-2 flex items-center gap-3 text-xs">
          {draft.id ? (
            <button
              type="button"
              className="font-semibold text-muted hover:text-ink"
              onClick={() => reset()}
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
              {details ? 'Menos detalhes' : 'Ano, onde assistir, nota e comentários'}
            </button>
          )}
        </div>
      </form>

      <div
        role="group"
        aria-label="Status"
        className="mb-4 flex gap-5 overflow-x-auto border-b border-line"
      >
        {MEDIA_STATUSES.map((status) => {
          const selected = filter.status === status.id;
          return (
            <button
              key={status.id}
              type="button"
              aria-pressed={selected}
              className={`-mb-px flex shrink-0 items-baseline gap-1.5 border-b-2 pb-2.5 pt-1 text-[14px] transition-colors ${
                selected
                  ? 'border-accent font-semibold text-ink'
                  : 'border-transparent text-muted hover:text-ink'
              }`}
              onClick={() => {
                setFilter({ ...filter, status: status.id });
                if (!draft.id) setStatus(status.id);
              }}
            >
              {status.label}
              <span className="text-xs tabular-nums text-muted">{counts[status.id]}</span>
            </button>
          );
        })}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Filtrar por tipo" className="flex flex-wrap gap-1.5">
          <FilterChip
            active={filter.type === 'todos'}
            onClick={() => setFilter({ ...filter, type: 'todos' })}
          >
            Todos
          </FilterChip>
          {MEDIA_TYPES.map((type) => (
            <FilterChip
              key={type.id}
              active={filter.type === type.id}
              onClick={() => setFilter({ ...filter, type: type.id })}
            >
              <type.icon size={14} strokeWidth={2} aria-hidden="true" />
              {type.label}
            </FilterChip>
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
            ? `Nada em “${mediaStatus(filter.status).label}” ainda. Adicione um título no campo acima.`
            : 'Nada com esse filtro.'}
        </div>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-x-4 gap-y-6 max-[600px]:grid-cols-2 max-[600px]:gap-x-3">
          {visible.map((item) => {
            const next = NEXT[item.status];
            const others = MEDIA_STATUSES.filter(
              (status) => status.id !== item.status && status.id !== next.status,
            );
            return (
              <li key={item.id} className="flex min-w-0 flex-col gap-2">
                <Poster item={item} />
                <div className="min-w-0">
                  <h2 className="sr-only">{item.title}</h2>
                  {(item.rating || item.platform) && (
                    <p className="flex items-center gap-2 text-xs text-muted">
                      {item.rating && (
                        <span className="tracking-[0.08em] text-accent">
                          <span aria-hidden="true">{stars(item.rating)}</span>
                          <span className="sr-only">Nota {item.rating} de 5</span>
                        </span>
                      )}
                      {item.platform && <span className="truncate">{item.platform}</span>}
                    </p>
                  )}
                  {item.watchedAt && (
                    <p className="text-xs text-muted">
                      {item.status === 'abandonado' ? 'Parei em' : 'Visto em'}{' '}
                      <time dateTime={item.watchedAt} className="tabular-nums">
                        {fullDate(item.watchedAt)}
                      </time>
                    </p>
                  )}
                  {item.notes && (
                    <p className="mt-0.5 line-clamp-2 break-words text-xs text-ink/80">
                      {item.notes}
                    </p>
                  )}
                </div>
                <div className="mt-auto flex items-center gap-1">
                  <button
                    className="btn-ghost btn-sm flex-1 justify-center"
                    onClick={() => void move(item, next.status)}
                  >
                    {next.label}
                  </button>
                  <ActionMenu
                    label={`Ações de “${item.title}”`}
                    actions={[
                      { label: 'Editar', onSelect: () => edit(item) },
                      ...others.map((status) => ({
                        label: MOVE_LABEL[status.id],
                        onSelect: () => void move(item, status.id),
                      })),
                      {
                        label: 'Excluir',
                        confirm: 'Confirmar exclusão',
                        onSelect: () => {
                          if (draft.id === item.id) reset();
                          void deleteMedia(item.id).then(() => toast(`“${item.title}” excluído`));
                        },
                      },
                    ]}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
