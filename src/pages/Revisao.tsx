import { CircleCheck } from 'lucide-react';
import { useState } from 'react';
import { CategoryOptions } from '../components/CategoryOptions';
import { PageHeader } from '../components/PageHeader';
import { useToast } from '../components/Toast';
import { useCategories, useCategoryLookup, useTransactions } from '../db/hooks';
import { addRule, ignoreInReview, setManualCategory } from '../db/repository';
import { reviewGroups, ruleFor, type ReviewGroup } from '../features/classify/review';
import { dayMonth } from '../lib/dates';
import { documentLabel, formatBRL, formatDocument, transactionCount } from '../lib/format';

function Group({ group }: { group: ReviewGroup }) {
  const categories = useCategories();
  const categoryOf = useCategoryLookup();
  const toast = useToast();
  const [categoryId, setCategoryId] = useState('');
  const [always, setAlways] = useState(true);
  const ids = group.items.map((tx) => tx.id);

  async function save() {
    if (!categoryId) {
      toast('Escolha uma categoria primeiro');
      return;
    }
    if (always) {
      const count = await addRule(ruleFor(group, categoryId));
      toast(
        `✅ Regra criada: ${group.name} → ${categoryOf(categoryId).name} · aplicada a ${transactionCount(count)}`,
      );
    } else {
      await setManualCategory(ids, categoryId);
      toast('✏️ Classificado só desta vez');
    }
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_200px_130px_auto] items-center gap-3.5 border-b border-line px-[18px] py-4 last:border-none max-[900px]:grid-cols-1">
      <div>
        <div className="text-[15px] font-bold">{group.name}</div>
        <div className="mt-0.5 text-xs text-muted">
          {transactionCount(group.items.length)} · {formatBRL(group.total)}
          {group.document
            ? ` · ${documentLabel(group.document)} ${formatDocument(group.document)}`
            : ' · sem CNPJ'}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {group.items.map((tx) => (
            <span key={tx.id} className="chip">
              {dayMonth(tx.date)} · {formatBRL(Math.abs(tx.amount))}
            </span>
          ))}
        </div>
      </div>
      <select
        className="field"
        aria-label={`Categoria de ${group.name}`}
        value={categoryId}
        onChange={(event) => setCategoryId(event.target.value)}
      >
        <option value="">Escolher categoria…</option>
        <CategoryOptions categories={categories} />
      </select>
      <label className="flex cursor-pointer items-center gap-1.5 text-[13px]">
        <input
          type="checkbox"
          className="h-4 w-4 accent-accent"
          checked={always}
          onChange={(event) => setAlways(event.target.checked)}
        />
        Aplicar sempre
      </label>
      <div className="flex gap-2">
        <button className="btn btn-sm" onClick={() => void save()}>
          Salvar
        </button>
        <button
          className="btn-ghost btn-sm"
          onClick={() => {
            void ignoreInReview(ids);
          }}
        >
          Ignorar
        </button>
      </div>
    </div>
  );
}

export function Revisao() {
  const groups = reviewGroups(useTransactions());

  return (
    <>
      <PageHeader
        title="Revisar não classificados"
        subtitle="Defina uma vez e o sistema lembra para sempre"
      />
      <div className="table-card">
        {groups.length === 0 ? (
          <div className="empty">
            <CircleCheck
              size={40}
              strokeWidth={1.5}
              aria-hidden="true"
              className="mx-auto mb-3 text-accent"
            />
            <b className="font-display text-lg text-ink">Tudo classificado</b>
            <br />
            Novas transações desconhecidas aparecem aqui depois de importar.
          </div>
        ) : (
          groups.map((group) => <Group key={group.key} group={group} />)
        )}
      </div>
    </>
  );
}
