import { Guilloche } from '../../components/Guilloche';
import type { MediaItem } from '../../db/types';
import { deepColor } from '../../lib/hues';
import { mediaType, posterHue } from './catalog';

/**
 * Cartaz gerado no próprio app, sem buscar capa na internet: o título impresso sobre um
 * tom de cédula, com a roseta guilhochê ao fundo, como um ingresso.
 */
export function Poster({ item }: { item: Pick<MediaItem, 'title' | 'type' | 'year'> }) {
  const type = mediaType(item.type);
  // Título curto ganha corpo grande; longo encolhe para caber sem cortar palavra.
  const size =
    item.title.length <= 14
      ? 'text-[26px]'
      : item.title.length <= 32
        ? 'text-[21px]'
        : 'text-[17px]';

  return (
    <div
      className="relative isolate flex aspect-[2/3] flex-col overflow-hidden rounded-card p-3.5 text-[rgb(var(--c-paper))]"
      style={{ backgroundColor: deepColor(posterHue(item.title)) }}
      aria-hidden="true"
    >
      <Guilloche className="absolute -bottom-[22%] -right-[30%] -z-10 h-[95%] w-auto !text-[rgb(var(--c-paper)/0.22)]" />
      <div className="flex items-center justify-between text-[11px] font-semibold opacity-80">
        <span className="flex items-center gap-1">
          <type.icon size={13} strokeWidth={2} />
          {type.label}
        </span>
        {item.year && <span className="tabular-nums">{item.year}</span>}
      </div>
      <p
        className={`mt-auto line-clamp-5 break-words font-display font-bold leading-[1.02] tracking-[-0.03em] [text-wrap:balance] ${size}`}
      >
        {item.title}
      </p>
    </div>
  );
}
