import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
        <div className="card empty">
          <div className="mb-1.5 text-[40px]">📥</div>
          <b>Nenhuma transação ainda</b>
          <br />
          <Link to="/importar" className="mt-3 inline-block text-accent underline">
            Importe seu primeiro extrato
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

      <div className="grid grid-cols-4 gap-4 max-[900px]:grid-cols-2">
        <div className="card">
          <h3 className="card-title">Total gasto</h3>
          <div className="text-[26px] font-bold tabular-nums tracking-[-0.02em]">
            {formatBRL(total)}
          </div>
          <div className="mt-1 text-xs text-muted">
            {delta === null ? (
              'Sem mês anterior para comparar'
            ) : (
              <>
                <span className={delta > 0 ? 'text-warn' : 'text-accent'}>
                  {delta > 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(0)}%
                </span>{' '}
                vs. {monthLabel(shiftMonth(month, -1)).split(' ')[0]?.toLowerCase()} (
                {formatBRL(previous)})
              </>
            )}
            <br />
            Entradas {formatBRL(data.income)}
          </div>
        </div>
        <div className="card">
          <h3 className="card-title">Transações</h3>
          <div className="text-[26px] font-bold tabular-nums tracking-[-0.02em]">{data.count}</div>
          <div className="mt-1 text-xs text-muted">
            Ticket médio {formatBRL(data.count ? Math.round(total / data.count) : 0)}
          </div>
        </div>
        <div className="card">
          <h3 className="card-title">Maior categoria</h3>
          <div className="text-xl font-bold tracking-[-0.02em]">
            {top ? `${categoryOf(top.key).icon} ${top.name}` : '-'}
          </div>
          <div className="mt-1 text-xs text-muted">
            {top && `${formatBRL(top.value)} · ${Math.round((top.value / total) * 100)}% do total`}
          </div>
        </div>
        <button
          type="button"
          disabled={pending === 0}
          onClick={() => navigate('/revisao')}
          className={`card flex flex-col items-stretch justify-start text-left ${pending ? 'cursor-pointer bg-warn-soft' : ''}`}
          style={pending ? { borderColor: 'rgb(var(--c-warn-line))' } : undefined}
        >
          <h3 className="card-title">Sem categoria</h3>
          <div
            className={`text-[26px] font-bold tabular-nums tracking-[-0.02em] ${pending ? 'text-warn' : ''}`}
          >
            {pending}
          </div>
          <div className="mt-1 text-xs text-muted">
            {pending ? 'Clique para revisar →' : 'Tudo classificado ✓'}
          </div>
        </button>
      </div>

      <div className="mt-4 grid grid-cols-[1.1fr_1.4fr] gap-4 max-[1100px]:grid-cols-1">
        <div className="card">
          <h3 className="card-title">Gastos por categoria</h3>
          {total > 0 ? (
            <CategoryDonut slices={data.slices} total={total} />
          ) : (
            <p className="text-muted">Nenhum gasto neste mês.</p>
          )}
        </div>
        <div className="card">
          <h3 className="card-title">
            Últimos 6 meses <span className="note font-normal">empilhado por categoria</span>
          </h3>
          <MonthlyBars rows={data.rows} series={series} current={monthShort(month)} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 max-[900px]:grid-cols-1">
        <div className="card">
          <h3 className="card-title">Onde mais gastei</h3>
          {data.merchants.map((merchant) => (
            <div
              key={merchant.name}
              className="flex items-center gap-2.5 border-b border-dashed border-line py-2 last:border-none"
            >
              <span className="min-w-0 flex-1 truncate font-medium">{merchant.name}</span>
              <span className="track h-[7px] flex-[1.2]">
                <i
                  className="block h-full rounded-[9px]"
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
          <h3 className="card-title">Orçamento do mês</h3>
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
                <span className="track h-2">
                  <i
                    className={`block h-full rounded-[9px] ${percent > 100 ? 'bg-warn' : ''}`}
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
