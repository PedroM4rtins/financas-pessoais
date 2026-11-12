import { useMemo, useState } from 'react';
import { CircleAlert, FileUp } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Guilloche } from '../components/Guilloche';
import { MonthPicker } from '../components/MonthPicker';
import { PageHeader } from '../components/PageHeader';
import { useCategories, useCategoryLookup, useTransactions } from '../db/hooks';
import { UNCLASSIFIED } from '../db/seed';
import { isExpense, needsReview } from '../db/types';
import { CategoryDonut, type Slice } from '../features/charts/CategoryDonut';
import { MonthlyBars, type MonthRow } from '../features/charts/MonthlyBars';
import {
  inMonth,
  lastMonths,
  received,
  spent,
  spentByCategory,
  topMerchants,
} from '../features/charts/summary';
import { currentMonth, monthLabel, monthOf, monthShort, shiftMonth } from '../lib/dates';
import { formatBRL } from '../lib/format';

const thousands = (cents: number): string => `${(cents / 100000).toFixed(1).replace('.', ',')}k`;

const monthName = (month: string): string =>
  monthLabel(month).split(' ')[0]?.toLowerCase() ?? month;

/** O total do mês em destaque: "R$" e centavos menores que os reais. */
function BigAmount({ cents }: { cents: number }) {
  const [, sign = '', reais = '0', centavos = '00'] =
    /^(-?)R\$ ?(.+),(\d{2})$/.exec(formatBRL(cents)) ?? [];
  return (
    <p className="mt-1 font-display font-bold leading-none tracking-[-0.045em] tabular-nums">
      <span className="mr-1.5 align-[0.9em] text-[22px] font-semibold text-muted">{sign}R$</span>
      <span className="text-[64px] max-[560px]:text-[48px]">{reais}</span>
      <span className="text-[30px] text-muted max-[560px]:text-[24px]">,{centavos}</span>
    </p>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-display text-[19px] font-semibold tabular-nums tracking-[-0.02em]">
        {value}
        {detail && (
          <span className="ml-2 font-sans text-xs font-normal tracking-normal text-muted">
            {detail}
          </span>
        )}
      </dd>
    </div>
  );
}

export function Dashboard() {
  const transactions = useTransactions();
  const categories = useCategories();
  const categoryOf = useCategoryLookup();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);

  const latest = useMemo(
    () =>
      transactions
        .map((tx) => monthOf(tx.date))
        .sort()
        .at(-1) ?? currentMonth(),
    [transactions],
  );
  const month = selected ?? latest;

  const data = useMemo(() => {
    const current = inMonth(transactions, month);
    const expenses = current.filter(isExpense);
    const total = spent(current);
    const totals = spentByCategory(current);
    const slices: Slice[] = [...totals]
      .map(([key, value]) => {
        const category = categoryOf(key || null);
        return { key: key || 'sem', name: category.name, color: category.color, value };
      })
      .sort((a, b) => b.value - a.value);
    const rows: MonthRow[] = lastMonths(month, 6).map((item) => {
      const monthTotals = spentByCategory(inMonth(transactions, item));
      const sum = [...monthTotals.values()].reduce((a, b) => a + b, 0);
      const row: MonthRow = {
        month: item,
        label: monthShort(item),
        total: sum ? thousands(sum) : '',
        top: 1,
      };
      monthTotals.forEach((value, key) => {
        row[key || 'sem'] = value;
      });
      return row;
    });
    return {
      total,
      totals,
      slices,
      rows,
      count: expenses.length,
      income: received(current),
      previous: spent(inMonth(transactions, shiftMonth(month, -1))),
      pending: current.filter(needsReview).length,
      merchants: topMerchants(current),
    };
  }, [transactions, month, categoryOf]);

  if (transactions.length === 0) {
    return (
      <>
        <PageHeader title="Visão geral" subtitle="Para onde foi o seu dinheiro este mês" />
        <div className="card empty relative overflow-hidden">
          <Guilloche className="mx-auto mb-4 h-24 w-24 opacity-60" />
          <b className="block font-display text-lg text-ink">Nenhuma transação ainda</b>
          <p className="mt-1">
            Importe uma fatura ou extrato para ver para onde foi o seu dinheiro.
          </p>
          <Link to="/importar" className="btn mt-5">
            <FileUp size={16} aria-hidden="true" />
            Importar faturas
          </Link>
        </div>
      </>
    );
  }

  const { total, previous, pending } = data;
  const delta = previous ? ((total - previous) / previous) * 100 : null;
  const top = data.slices.find((slice) => slice.key !== 'sem');
  const series = [
    ...categories.map(({ id, name, color }) => ({ key: id, name, color })),
    { key: 'sem', name: UNCLASSIFIED.name, color: UNCLASSIFIED.color },
  ];
  const budgets = categories.filter((category) => category.budget);
  const maxMerchant = data.merchants[0]?.total ?? 1;

  return (
    <>
      <PageHeader title="Visão geral" subtitle="Para onde foi o seu dinheiro este mês">
        <MonthPicker month={month} onChange={setSelected} />
      </PageHeader>

      <section
        aria-label="Resumo do mês"
        className="relative overflow-hidden rounded-card border border-line bg-panel"
      >
        <Guilloche className="absolute -right-24 -top-28 h-[420px] w-[420px] opacity-[0.16] max-[700px]:-right-40" />
        <div className="relative grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] max-[900px]:grid-cols-1">
          <div className="px-7 py-6">
            <h2 className="text-[15px] font-semibold text-muted">
              Total gasto em {monthName(month)}
            </h2>
            <BigAmount cents={total} />
            <p className="mt-2 text-[13px] text-muted">
              {delta === null ? (
                'Sem mês anterior para comparar'
              ) : Math.round(delta) === 0 ? (
                <>
                  Igual a {monthName(shiftMonth(month, -1))} ({formatBRL(previous)})
                </>
              ) : (
                <>
                  <span className={`font-semibold ${delta > 0 ? 'text-warn' : 'text-accent'}`}>
                    {delta > 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(0)}%
                  </span>{' '}
                  em relação a {monthName(shiftMonth(month, -1))} ({formatBRL(previous)})
                </>
              )}
            </p>
          </div>
          <dl className="grid grid-cols-1 content-center gap-3 border-l border-line px-7 py-6 max-[900px]:grid-cols-2 max-[900px]:border-l-0 max-[900px]:border-t">
            <Stat label="Entradas" value={formatBRL(data.income)} />
            <Stat
              label="Transações"
              value={String(data.count)}
              detail={`média de ${formatBRL(data.count ? Math.round(total / data.count) : 0)}`}
            />
            <Stat
              label="Maior categoria"
              value={top ? `${categoryOf(top.key).icon} ${top.name}` : '-'}
              detail={top ? `${Math.round((top.value / total) * 100)}% do total` : undefined}
            />
          </dl>
        </div>
      </section>

      {pending > 0 && (
        <button
          type="button"
          onClick={() => navigate('/revisao')}
          className="mt-4 flex w-full cursor-pointer items-center gap-3 rounded-card border bg-warn-soft px-5 py-3 text-left transition-[filter] hover:brightness-[0.98]"
          style={{ borderColor: 'rgb(var(--c-warn-line))' }}
        >
          <CircleAlert size={18} aria-hidden="true" className="shrink-0 text-warn" />
          <span className="flex-1">
            <b className="text-warn">
              {pending} {pending === 1 ? 'transação sem categoria' : 'transações sem categoria'}
            </b>{' '}
            <span className="text-muted">neste mês. Classifique para o resumo ficar certo.</span>
          </span>
          <span className="whitespace-nowrap font-semibold text-warn">Revisar agora</span>
        </button>
      )}

      <div className="mt-5 grid grid-cols-[1.1fr_1.4fr] gap-5 max-[1100px]:grid-cols-1">
        <div className="card">
          <h2 className="card-title">Gastos por categoria</h2>
          {total > 0 ? (
            <CategoryDonut slices={data.slices} total={total} />
          ) : (
            <p className="text-muted">Nenhum gasto neste mês.</p>
          )}
        </div>
        <div className="card">
          <h2 className="card-title">
            Últimos 6 meses{' '}
            <span className="font-sans text-xs font-normal text-muted">por categoria</span>
          </h2>
          <MonthlyBars rows={data.rows} series={series} current={monthShort(month)} />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-5 max-[900px]:grid-cols-1">
        <div className="card">
          <h2 className="card-title">Onde mais gastei</h2>
          {data.merchants.map((merchant) => (
            <div
              key={merchant.name}
              className="flex items-center gap-3 border-b border-line py-2.5 last:border-none"
            >
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                {merchant.name}
              </span>
              <span className="track h-1.5 flex-[1.2]">
                <i
                  className="block h-full rounded-full"
                  style={{
                    width: `${(merchant.total / maxMerchant) * 100}%`,
                    background: categoryOf(merchant.categoryId).color,
                  }}
                />
              </span>
              <span className="w-[90px] text-right font-semibold tabular-nums">
                {formatBRL(merchant.total)}
              </span>
            </div>
          ))}
          {data.merchants.length === 0 && <p className="text-muted">Nenhum gasto neste mês.</p>}
        </div>
        <div className="card">
          <h2 className="card-title">Orçamento do mês</h2>
          {budgets.length === 0 && (
            <p className="text-muted">
              Defina um orçamento em{' '}
              <Link to="/categorias" className="text-accent underline">
                Categorias
              </Link>{' '}
              para acompanhar aqui.
            </p>
          )}
          {budgets.map((category) => {
            const value = data.totals.get(category.id) ?? 0;
            const budget = category.budget ?? 1;
            const percent = (value / budget) * 100;
            return (
              <div key={category.id} className="mb-3">
                <div className="mb-[5px] flex justify-between text-[13px]">
                  <span>
                    {category.icon} {category.name}
                  </span>
                  <span className={percent > 100 ? 'font-semibold text-warn' : ''}>
                    {formatBRL(value)} <span className="note">/ {formatBRL(budget)}</span>
                  </span>
                </div>
                <span className="track h-1.5">
                  <i
                    className={`block h-full rounded-full ${percent > 100 ? 'bg-warn' : ''}`}
                    style={{
                      width: `${Math.min(percent, 100)}%`,
                      ...(percent > 100 ? {} : { background: category.color }),
                    }}
                  />
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
