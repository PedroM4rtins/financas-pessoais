import type { ReactNode } from 'react';

/** Filtro de liga/desliga em forma de pílula. O ativo fica preenchido com a tinta. */
export function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
        active ? 'border-ink bg-ink text-bg' : 'border-line bg-panel text-ink hover:border-muted/50'
      }`}
    >
      {children}
    </button>
  );
}
