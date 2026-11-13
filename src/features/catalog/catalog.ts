import { Popcorn, Sparkles, Tv, type LucideIcon } from 'lucide-react';
import type { MediaItem, MediaStatus, MediaType } from '../../db/types';
import { HUES, type Hue } from '../../lib/hues';
import { normalizeText } from '../classify/normalize';

export const MEDIA_TYPES: { id: MediaType; label: string; icon: LucideIcon }[] = [
  { id: 'filme', label: 'Filme', icon: Popcorn },
  { id: 'serie', label: 'Série', icon: Tv },
  { id: 'anime', label: 'Anime', icon: Sparkles },
];

export const MEDIA_STATUSES: { id: MediaStatus; label: string }[] = [
  { id: 'quero_ver', label: 'Quero ver' },
  { id: 'assistindo', label: 'Assistindo' },
  { id: 'visto', label: 'Já vi' },
  { id: 'abandonado', label: 'Abandonei' },
];

export const mediaType = (id: MediaType) =>
  MEDIA_TYPES.find((type) => type.id === id) ?? MEDIA_TYPES[0]!;

export const mediaStatus = (id: MediaStatus) =>
  MEDIA_STATUSES.find((status) => status.id === id) ?? MEDIA_STATUSES[0]!;

export type MediaFilter = { status: MediaStatus; type: MediaType | 'todos'; search: string };

/**
 * "Já vi" e "Abandonei" mostram o mais recente primeiro pela data em que terminou;
 * o resto, pelo que foi mexido por último. No empate, ordem alfabética.
 */
export function filterMedia(
  items: MediaItem[],
  { status, type, search }: MediaFilter,
): MediaItem[] {
  const term = normalizeText(search);
  const byFinish = status === 'visto' || status === 'abandonado';
  return items
    .filter((item) => item.status === status)
    .filter((item) => type === 'todos' || item.type === type)
    .filter(
      (item) =>
        !term || normalizeText(`${item.title} ${item.platform ?? ''} ${item.notes}`).includes(term),
    )
    .sort(
      (a, b) =>
        (byFinish ? (b.watchedAt ?? '').localeCompare(a.watchedAt ?? '') : 0) ||
        b.updatedAt.localeCompare(a.updatedAt) ||
        a.title.localeCompare(b.title, 'pt-BR'),
    );
}

export function countByStatus(items: MediaItem[]): Record<MediaStatus, number> {
  const counts: Record<MediaStatus, number> = {
    quero_ver: 0,
    assistindo: 0,
    visto: 0,
    abandonado: 0,
  };
  for (const item of items) counts[item.status]++;
  return counts;
}

/**
 * Muda o status cuidando da data: ao marcar "Já vi" sem data, usa hoje; ao voltar para
 * "Quero ver" ou "Assistindo", a data some, porque ainda não terminou.
 */
export function withStatus<T extends Pick<MediaItem, 'status' | 'watchedAt'>>(
  item: T,
  status: MediaStatus,
  today: string,
): T {
  const next = { ...item, status };
  if (status === 'visto' || status === 'abandonado') next.watchedAt = item.watchedAt || today;
  else delete next.watchedAt;
  return next;
}

/** Ano digitado: vazio vira undefined; fora de 1880 até o ano que vem, null (inválido). */
export function parseYear(text: string, now = new Date()): number | undefined | null {
  const clean = text.trim();
  if (!clean) return undefined;
  if (!/^\d{4}$/.test(clean)) return null;
  const year = Number(clean);
  return year >= 1880 && year <= now.getFullYear() + 1 ? year : null;
}

export const stars = (rating: number): string => '★'.repeat(rating) + '☆'.repeat(5 - rating);

/** A cor do cartaz sai do título: o mesmo título tem sempre a mesma cor. */
export function posterHue(title: string): Hue {
  // FNV-1a: espalha bem até títulos parecidos. Multiplicar por 31 e tirar o resto por 6
  // equivaleria a somar as letras, e títulos com letras parecidas cairiam na mesma cor.
  let hash = 0x811c9dc5;
  for (const char of normalizeText(title)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return HUES[(hash >>> 0) % HUES.length]!;
}
