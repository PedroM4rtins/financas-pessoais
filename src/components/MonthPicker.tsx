import { ChevronLeft, ChevronRight } from 'lucide-react';
import { monthLabel, shiftMonth } from '../lib/dates';

type Props = { month: string; onChange: (month: string) => void };

export function MonthPicker({ month, onChange }: Props) {
  const button =
    'grid h-7 w-7 cursor-pointer place-items-center rounded-[5px] text-muted transition-colors hover:bg-head hover:text-ink';
  return (
    <div className="flex items-center gap-1 rounded-btn border border-line bg-panel p-1">
      <button
        className={button}
        aria-label="Mês anterior"
        onClick={() => onChange(shiftMonth(month, -1))}
      >
        <ChevronLeft size={16} aria-hidden="true" />
      </button>
      <b className="min-w-[136px] px-2 text-center font-display font-semibold">
        {monthLabel(month)}
      </b>
      <button
        className={button}
        aria-label="Próximo mês"
        onClick={() => onChange(shiftMonth(month, 1))}
      >
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
