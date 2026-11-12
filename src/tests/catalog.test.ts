import { describe, expect, it } from 'vitest';
import type { MediaItem } from '../db/types';
import {
  countByStatus,
  filterMedia,
  parseYear,
  stars,
  withStatus,
} from '../features/catalog/catalog';

const item = (fields: Partial<MediaItem> & Pick<MediaItem, 'id' | 'title'>): MediaItem => ({
  type: 'filme',
  status: 'quero_ver',
  notes: '',
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  ...fields,
});

const items = [
  item({ id: 'a', title: 'Filme Antigo', status: 'visto', watchedAt: '2026-01-10' }),
  item({ id: 'b', title: 'Anime Novo', type: 'anime', status: 'visto', watchedAt: '2026-10-01' }),
  item({ id: 'c', title: 'Série da Lista', type: 'serie', platform: 'Plataforma X' }),
  item({
    id: 'd',
    title: 'Outro da Lista',
    notes: 'Indicação de um amigo',
    updatedAt: '2026-11-05T00:00:00.000Z',
  }),
];

const ids = (list: MediaItem[]) => list.map((media) => media.id);

describe('filterMedia', () => {
  it('"Já vi" mostra o terminado mais recente primeiro', () => {
    expect(ids(filterMedia(items, { status: 'visto', type: 'todos', search: '' }))).toEqual([
      'b',
      'a',
    ]);
  });

  it('"Quero ver" mostra o mexido por último primeiro', () => {
    expect(ids(filterMedia(items, { status: 'quero_ver', type: 'todos', search: '' }))).toEqual([
      'd',
      'c',
    ]);
  });

  it('filtra por tipo', () => {
    expect(ids(filterMedia(items, { status: 'visto', type: 'anime', search: '' }))).toEqual(['b']);
  });

  it('busca no título, na plataforma e nos comentários, sem acento', () => {
    const search = (term: string) =>
      ids(filterMedia(items, { status: 'quero_ver', type: 'todos', search: term }));
    expect(search('serie')).toEqual(['c']);
    expect(search('plataforma x')).toEqual(['c']);
    expect(search('INDICACAO')).toEqual(['d']);
  });
});

it('conta por status', () => {
  expect(countByStatus(items)).toEqual({ quero_ver: 2, assistindo: 0, visto: 2, abandonado: 0 });
});

describe('withStatus', () => {
  it('marcar como visto sem data usa hoje', () => {
    expect(withStatus(items[2]!, 'visto', '2026-11-12').watchedAt).toBe('2026-11-12');
  });

  it('mantém a data que já existia', () => {
    expect(withStatus(items[0]!, 'abandonado', '2026-11-12').watchedAt).toBe('2026-01-10');
  });

  it('voltar para assistindo tira a data', () => {
    const back = withStatus(items[0]!, 'assistindo', '2026-11-12');
    expect(back.status).toBe('assistindo');
    expect('watchedAt' in back).toBe(false);
  });
});

it('valida o ano', () => {
  const now = new Date(2026, 10, 12);
  expect(parseYear('', now)).toBeUndefined();
  expect(parseYear(' 1999 ', now)).toBe(1999);
  expect(parseYear('2027', now)).toBe(2027);
  expect(parseYear('2028', now)).toBeNull();
  expect(parseYear('99', now)).toBeNull();
  expect(parseYear('1800', now)).toBeNull();
});

it('desenha as estrelas da nota', () => {
  expect(stars(3)).toBe('★★★☆☆');
});
