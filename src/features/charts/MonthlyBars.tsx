import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { formatBRL } from '../../lib/format';

export type MonthRow = { month: string; label: string; total: string } & Record<
  string,
  string | number
>;
export type Series = { key: string; name: string; color: string };

type TickProps = { x?: number; y?: number; payload?: { value: string } };

/**
 * Mês e total ficam embaixo da barra, sobre o fundo do cartão: dentro da pilha, o total
 * caía em cima da cor de alguma categoria e perdia contraste.
 */
function MonthTick({
  x,
  y,
  payload,
  current,
  totals,
}: TickProps & { current: string; totals: Map<string, string> }) {
  const label = payload?.value ?? '';
  const active = label === current;
  return (
    <g>
      <text
        x={x}
        y={(y ?? 0) + 12}
        textAnchor="middle"
        fontSize={12}
        fontWeight={active ? 700 : 400}
        fill={active ? 'rgb(var(--c-ink))' : 'rgb(var(--c-muted))'}
      >
        {label}
      </text>
      <text
        x={x}
        y={(y ?? 0) + 28}
        textAnchor="middle"
        fontSize={11}
        fontWeight={600}
        fill="rgb(var(--c-ink))"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {totals.get(label) || '–'}
      </text>
    </g>
  );
}

type Props = { rows: MonthRow[]; series: Series[]; current: string };

export function MonthlyBars({ rows, series, current }: Props) {
  const totals = new Map(rows.map((row) => [row.label, row.total]));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={rows} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          interval={0}
          height={38}
          tick={<MonthTick current={current} totals={totals} />}
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
      </BarChart>
    </ResponsiveContainer>
  );
}
