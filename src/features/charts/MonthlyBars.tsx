import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { formatBRL } from '../../lib/format';

export type MonthRow = { month: string; label: string; total: string } & Record<
  string,
  string | number
>;
export type Series = { key: string; name: string; color: string };

type TickProps = { x?: number; y?: number; payload?: { value: string } };

function MonthTick({ x, y, payload, current }: TickProps & { current: string }) {
  const active = payload?.value === current;
  return (
    <text
      x={x}
      y={(y ?? 0) + 12}
      textAnchor="middle"
      fontSize={12}
      fontWeight={active ? 700 : 400}
      fill={active ? 'rgb(var(--c-ink))' : 'rgb(var(--c-muted))'}
    >
      {active ? `${payload?.value} •` : payload?.value}
    </text>
  );
}

type Props = { rows: MonthRow[]; series: Series[]; current: string };

export function MonthlyBars({ rows, series, current }: Props) {
  return (
    <ResponsiveContainer width="100%" height={210}>
      <BarChart data={rows} margin={{ top: 18, right: 0, bottom: 0, left: 0 }}>
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          interval={0}
          tick={<MonthTick current={current} />}
        />
        <Tooltip
          cursor={{ fill: 'rgb(var(--c-bg))' }}
          formatter={(value, name) => [formatBRL(Number(value)), name]}
          contentStyle={{
            background: 'rgb(var(--c-panel))',
            border: '1px solid rgb(var(--c-line))',
            borderRadius: 10,
            fontSize: 12,
          }}
        />
        {series.map((item) => (
          <Bar
            key={item.key}
            dataKey={item.key}
            name={item.name}
            stackId="mes"
            fill={item.color}
            maxBarSize={46}
            isAnimationActive={false}
          />
        ))}
        {/* Barra invisível de 1 centavo no topo da pilha: só carrega o rótulo do total. */}
        <Bar
          dataKey="top"
          stackId="mes"
          fill="transparent"
          legendType="none"
          tooltipType="none"
          isAnimationActive={false}
        >
          <LabelList
            dataKey="total"
            position="top"
            fontSize={11}
            fontWeight={600}
            fill="rgb(var(--c-ink))"
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
