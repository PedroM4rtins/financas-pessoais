import { Ellipsis } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

export type MenuAction = {
  label: string;
  onSelect: () => void;
  /** Pede um segundo clique, com este texto, antes de agir (ex.: excluir). */
  confirm?: string;
};

/** Botão "⋯" com as ações secundárias de um cartão. Teclado: setas, Esc e Tab. */
export function ActionMenu({ label, actions }: { label: string; actions: MenuAction[] }) {
  const [open, setOpen] = useState(false);
  const [armed, setArmed] = useState<number | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const items = () => [
      ...(root.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []),
    ];
    items()[0]?.focus();
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      const list = items();
      const index = list.indexOf(document.activeElement as HTMLElement);
      if (event.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const step = event.key === 'ArrowDown' ? 1 : -1;
        list[(index + step + list.length) % list.length]?.focus();
      } else if (event.key === 'Tab') {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        className="rounded-btn p-1.5 text-muted transition-colors hover:bg-head hover:text-ink"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => {
          setArmed(null);
          setOpen(!open);
        }}
      >
        <Ellipsis size={18} strokeWidth={1.8} aria-hidden="true" />
      </button>
      {open && (
        <div
          id={id}
          role="menu"
          className="absolute right-0 top-full z-10 mt-1 min-w-[170px] rounded-btn border border-line bg-panel p-1 shadow-[0_8px_24px_rgb(0_0_0/0.12)]"
        >
          {actions.map((action, index) => (
            <button
              key={action.label}
              type="button"
              role="menuitem"
              className={`block w-full rounded-[5px] px-2.5 py-1.5 text-left text-[13px] hover:bg-head focus:bg-head focus:outline-none ${
                armed === index ? 'font-semibold text-warn' : 'text-ink'
              }`}
              onClick={() => {
                if (action.confirm && armed !== index) {
                  setArmed(index);
                  return;
                }
                setOpen(false);
                action.onSelect();
              }}
            >
              {armed === index ? action.confirm : action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
