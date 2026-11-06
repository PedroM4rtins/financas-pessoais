import { useEffect, useMemo, useState } from 'react';
import { CategoryOptions } from '../components/CategoryOptions';
import { PageHeader } from '../components/PageHeader';
import { useToast } from '../components/Toast';
import { useCategories, useCategoryLookup, useTransactions } from '../db/hooks';
import { addRule, setManualCategory } from '../db/repository';
import { isExpense, needsReview, type Transaction } from '../db/types';
import { normalizeText } from '../features/classify/normalize';
import { ruleFor } from '../features/classify/review';
import { dayMonth, monthLabel, monthOf } from '../lib/dates';
import { exportCsv, exportXlsx } from '../lib/export';
import { documentLabel, formatBRL, formatDocument, transactionCount } from '../lib/format';

type SortKey = 'date' | 'name' | 'amount';
type Pending = { tx: Transaction; categoryId: string; top: number; left: number };

const ORIGIN: Record<string, string> = {
  regra_usuario: 'via sua regra',
  palavra_chave: 'via palavra-chave',
  manual: 'via você',
};

function originLabel(tx: Transaction): string {
  if (tx.kind === 'pagamento_fatura') return 'pagamento de fatura, fora dos gastos';
  if (tx.amount > 0) return 'entrada, fora dos gastos';
  if (tx.classifiedBy) return ORIGIN[tx.classifiedBy] ?? '';
  return tx.reviewIgnored ? 'ignorada na revisão' : 'aguardando você';
}

const sameSource = (a: Transaction, b: Transaction) =>
  a.document ? a.document === b.document : a.name === b.name;

export function Transacoes() {
  const transactions = useTransactions();
  const categories = useCategories();
  const categoryOf = useCategoryLookup();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [bank, setBank] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; descending: boolean }>({
    key: 'date',
    descending: true,
  });
  const [pending, setPending] = useState<Pending | null>(null);

  const months = useMemo(
    () => [...new Set(transactions.map((tx) => monthOf(tx.date)))].sort().reverse(),
    [transactions],
  );
  const banks = useMemo(() => [...new Set(transactions.map((tx) => tx.bank))], [transactions]);
  const month = selectedMonth ?? months[0] ?? 'todos';

  const rows = useMemo(() => {
    const query = normalizeText(search);
    const filtered = transactions.filter((tx) => {
      if (month !== 'todos' && monthOf(tx.date) !== month) return false;
      if (bank && tx.bank !== bank) return false;
      if (category === '_sem' ? tx.categoryId !== null : category && tx.categoryId !== category) {
        return false;
      }
      return (
        !query ||
        normalizeText(`${tx.name} ${tx.rawDescription} ${tx.document ?? ''}`).includes(query)
      );
    });
    const direction = sort.descending ? -1 : 1;
    return filtered.sort((a, b) => {
      if (sort.key === 'amount') return (a.amount - b.amount) * direction;
      return a[sort.key].localeCompare(b[sort.key]) * direction;
    });
  }, [transactions, search, category, bank, month, sort]);

  useEffect(() => {
    if (!pending) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPending(null);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [pending]);

  const others = pending
    ? transactions.filter(
        (tx) =>
          tx.id !== pending.tx.id && sameSource(pending.tx, tx) && tx.classifiedBy !== 'manual',
      ).length
    : 0;

  async function always({ tx, categoryId }: Pending) {
    setPending(null);
    // Manual nunca é sobrescrita por regra: esta linha precisa da troca direta.
    if (tx.classifiedBy === 'manual') await setManualCategory([tx.id], categoryId);
    const count = await addRule(ruleFor(tx, categoryId));
    toast(
      `✅ Regra criada: ${tx.name} → ${categoryOf(categoryId).name} · aplicada a ${transactionCount(count)}`,
    );
  }

  async function once({ tx, categoryId }: Pending) {
    setPending(null);
    await setManualCategory([tx.id], categoryId);
    toast('✏️ Classificado manualmente');
  }

  function header(label: string, key: SortKey, alignRight = false) {
    const active = sort.key === key;
    return (
      <th
        className={`th ${alignRight ? 'text-right' : ''}`}
        aria-sort={active ? (sort.descending ? 'descending' : 'ascending') : 'none'}
      >
        <button
          className="cursor-pointer uppercase"
          onClick={() => setSort({ key, descending: active ? !sort.descending : key !== 'name' })}
        >
          {label} {active && (sort.descending ? '↓' : '↑')}
        </button>
      </th>
    );
  }

  const exportName = `financas-${month}`;
  const total = rows.filter(isExpense).reduce((sum, tx) => sum - tx.amount, 0);

  return (
    <>
      <PageHeader
        title="Transações"
        subtitle="Sua planilha do mês. Troque a categoria direto na linha."
      >
        <div className="flex gap-2">
          <button
            className="btn-ghost"
            onClick={() => {
              void exportXlsx(rows, categoryOf, `${exportName}.xlsx`).then(() =>
                toast(`📗 Exportado: ${exportName}.xlsx`),
              );
            }}
          >
            ⬇ Exportar XLSX
          </button>
          <button
            className="btn-ghost"
            onClick={() => {
              exportCsv(rows, categoryOf, `${exportName}.csv`);
              toast(`📄 Exportado: ${exportName}.csv`);
            }}
          >
            ⬇ CSV
          </button>
        </div>
      </PageHeader>

      <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nome, CNPJ…"
          aria-label="Buscar"
          className="field min-w-[240px]"
        />
        <select
          className="field"
          aria-label="Filtrar por mês"
          value={month}
          onChange={(event) => setSelectedMonth(event.target.value)}
        >
          <option value="todos">Todos os meses</option>
          {months.map((item) => (
            <option key={item} value={item}>
              {monthLabel(item)}
            </option>
          ))}
        </select>
        <select
          className="field"
          aria-label="Filtrar por categoria"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="">Todas as categorias</option>
          <option value="_sem">❓ Só não classificadas</option>
          <CategoryOptions categories={categories} />
        </select>
        <select
          className="field"
          aria-label="Filtrar por banco"
          value={bank}
          onChange={(event) => setBank(event.target.value)}
        >
          <option value="">Todos os bancos</option>
          {banks.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <span className="note">
          {rows.length} de {transactionCount(transactions.length)} · gastos {formatBRL(total)}
        </span>
      </div>

      <div className="table-card">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr>
              {header('Data', 'date')}
              {header('Descrição', 'name')}
              <th className="th">Origem</th>
              <th className="th">Categoria</th>
              {header('Valor', 'amount', true)}
            </tr>
          </thead>
          <tbody>
            {rows.map((tx) => {
              const highlight = needsReview(tx) ? 'bg-unc' : '';
              const value = pending?.tx.id === tx.id ? pending.categoryId : (tx.categoryId ?? '');
              return (
                <tr key={tx.id}>
                  <td className={`td ${highlight}`}>{dayMonth(tx.date)}</td>
                  <td className={`td ${highlight}`}>
                    <b>{tx.name}</b>
                    {tx.installment && (
                      <span className="chip ml-1.5">
                        {tx.installment.current}/{tx.installment.total}
                      </span>
                    )}
                    <span className="note block">{tx.rawDescription}</span>
                    {tx.document && (
                      <span className="note block font-mono">
                        {documentLabel(tx.document)} {formatDocument(tx.document)}
                      </span>
                    )}
                  </td>
                  <td className={`td ${highlight}`}>{tx.bank}</td>
                  <td className={`td ${highlight}`}>
                    <select
                      className="field px-2 py-[5px] text-[13px]"
                      aria-label={`Categoria de ${tx.name}`}
                      value={value}
                      onChange={(event) => {
                        const box = event.target.getBoundingClientRect();
                        setPending({
                          tx,
                          categoryId: event.target.value,
                          top: box.bottom + 6,
                          left: Math.max(16, Math.min(box.left, window.innerWidth - 296)),
                        });
                      }}
                    >
                      {value === '' && <option value="">❓ Não classificado</option>}
                      <CategoryOptions categories={categories} />
                    </select>
                    <div className="note">{originLabel(tx)}</div>
                  </td>
                  <td className={`td num ${highlight} ${tx.amount > 0 ? 'text-accent' : ''}`}>
                    {tx.amount > 0 ? '+ ' : ''}
                    {formatBRL(Math.abs(tx.amount))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <div className="empty">Nenhuma transação encontrada.</div>}
      </div>

      {pending && (
        <>
          <button
            aria-label="Cancelar"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setPending(null)}
          />
          <div
            role="dialog"
            aria-label="Aplicar categoria"
            className="fixed z-20 w-[280px] rounded-xl border border-line bg-panel px-3.5 py-3 text-[13px] shadow-[0_12px_30px_rgba(0,0,0,.12)]"
            style={{ top: pending.top, left: pending.left }}
          >
            <p className="mb-2.5">
              Sempre classificar <b>{pending.tx.name}</b> como{' '}
              <b>{categoryOf(pending.categoryId).name}</b>?
              {others > 0 && (
                <>
                  <br />
                  <span className="note">Também atualiza mais {transactionCount(others)}.</span>
                </>
              )}
            </p>
            <div className="flex gap-2">
              <button className="btn btn-sm" onClick={() => void always(pending)}>
                Sim, sempre
              </button>
              <button className="btn-ghost btn-sm" onClick={() => void once(pending)}>
                Só esta
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
