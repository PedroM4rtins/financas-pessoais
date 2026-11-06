import { monthLabel, shiftMonth } from '../lib/dates';

type Props = { month: string; onChange: (month: string) => void };

export function MonthPicker({ month, onChange }: Props) {
  const button = 'cursor-pointer rounded-[7px] px-2.5 py-1 text-muted hover:bg-bg';
  return (
    <div className="flex items-center gap-1.5 rounded-[10px] border border-line bg-panel p-[5px]">
      <button
        className={button}
        aria-label="Mês anterior"
        onClick={() => onChange(shiftMonth(month, -1))}
      >
        ‹
      </button>
      <b className="min-w-[130px] px-2 text-center">{monthLabel(month)}</b>
      <button
        className={button}
        aria-label="Próximo mês"
        onClick={() => onChange(shiftMonth(month, 1))}
      >
        ›
      </button>
    </div>
  );
}
