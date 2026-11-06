import { Cell, Pie, PieChart } from 'recharts';
import { formatBRL } from '../../lib/format';

export type Slice = { key: string; name: string; color: string; value: number };

export function CategoryDonut({ slices, total }: { slices: Slice[]; total: number }) {
  return (
    <div className="flex items-center gap-[22px] max-[560px]:flex-col max-[560px]:items-stretch">
      <div className="relative mx-auto h-[190px] w-[190px] shrink-0">
        <PieChart width={190} height={190}>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="name"
            innerRadius={59}
            outerRadius={85}
            startAngle={90}
            endAngle={-270}
            paddingAngle={1}
            stroke="none"
            isAnimationActive={false}
          >
            {slices.map((slice) => (
              <Cell key={slice.key} fill={slice.color} />
            ))}
          </Pie>
        </PieChart>
        <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
          <span className="text-[11px] text-muted">Total</span>
          <b className="text-base tabular-nums">{formatBRL(total)}</b>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-[7px]">
        {slices.map((slice) => (
          <div
            key={slice.key}
            className="grid grid-cols-[12px_1fr_auto_auto] items-center gap-[9px] text-[13px]"
          >
            <span className="h-3 w-3 rounded-[3px]" style={{ background: slice.color }} />
            <span>{slice.name}</span>
            <span className="w-[38px] text-right text-xs text-muted">
              {Math.round((slice.value / total) * 100)}%
            </span>
            <span className="whitespace-nowrap font-semibold tabular-nums">
              {formatBRL(slice.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
