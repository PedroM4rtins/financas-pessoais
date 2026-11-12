import { useMemo, useState, type FormEvent } from 'react';
import { CategoryBadge } from '../components/CategoryBadge';
import { CategoryOptions } from '../components/CategoryOptions';
import { PageHeader } from '../components/PageHeader';
import { useToast } from '../components/Toast';
import { useCategories, useCategoryLookup, useRules, useTransactions } from '../db/hooks';
import { addRule, deleteRule, updateRule } from '../db/repository';
import type { Rule, RuleField, RuleOperator } from '../db/types';
import { DEFAULT_KEYWORDS } from '../features/classify/defaultKeywords';
import { normalizeRuleValue, ruleMatches, sortRules } from '../features/classify/rules';
import { transactionCount } from '../lib/format';

const OPERATORS: Record<RuleOperator, string> = {
  equals: 'é igual a',
  contains: 'contém',
  startsWith: 'começa com',
  regex: 'regex',
};

const FIELDS: Record<RuleField, string> = { name: 'Nome', document: 'CNPJ/CPF' };

type Draft = {
  id?: string;
  createdAt?: string;
  field: RuleField;
  operator: RuleOperator;
  value: string;
  categoryId: string;
  priority: number;
};

const EMPTY: Draft = {
  field: 'name',
  operator: 'contains',
  value: '',
  categoryId: '',
  priority: 0,
};

function isValidRegex(value: string): boolean {
  try {
    new RegExp(value);
    return true;
  } catch {
    return false;
  }
}

export function Regras() {
  const rules = useRules();
  const transactions = useTransactions();
  const categories = useCategories();
  const categoryOf = useCategoryLookup();
  const toast = useToast();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [tested, setTested] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const change = (patch: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setTested(null);
  };

  // Sem escolha (ou com uma categoria que foi excluída), vale a primeira da lista.
  const categoryId = categories.some((category) => category.id === draft.categoryId)
    ? draft.categoryId
    : (categories[0]?.id ?? '');

  const sorted = useMemo(() => sortRules(rules), [rules]);
  const affected = useMemo(() => {
    const counts = new Map<string, number>();
    for (const tx of transactions) {
      if (tx.ruleId) counts.set(tx.ruleId, (counts.get(tx.ruleId) ?? 0) + 1);
    }
    return counts;
  }, [transactions]);

  function normalizedDraft(): Omit<Draft, 'id' | 'createdAt'> | null {
    const value = normalizeRuleValue(draft.field, draft.operator, draft.value);
    if (!value) {
      toast('Digite um nome ou CNPJ');
      return null;
    }
    if (draft.operator === 'regex' && !isValidRegex(value)) {
      toast('Essa expressão regular é inválida');
      return null;
    }
    if (!categoryId) {
      toast('Crie uma categoria antes de criar regras');
      return null;
    }
    const { field, operator, priority } = draft;
    return { field, operator, value, categoryId, priority };
  }

  function test() {
    const candidate = normalizedDraft();
    if (!candidate) return;
    const rule: Rule = { ...candidate, id: 'teste', createdAt: '' };
    const matches = transactions.filter((tx) => ruleMatches(rule, tx));
    const names = [...new Set(matches.map((tx) => tx.name))].slice(0, 5).join(', ');
    setTested(
      matches.length
        ? `Casa com ${transactionCount(matches.length)}: ${names}`
        : 'Não casa com nenhuma transação.',
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const candidate = normalizedDraft();
    if (!candidate) return;
    const count =
      draft.id && draft.createdAt
        ? await updateRule({ ...candidate, id: draft.id, createdAt: draft.createdAt })
        : await addRule(candidate);
    toast(`✅ Regra aplicada a ${transactionCount(count)}`);
    setDraft(EMPTY);
    setTested(null);
  }

  return (
    <>
      <PageHeader
        title="Regras de classificação"
        subtitle="Suas regras vêm antes das palavras-chave padrão. CNPJ vale mais que nome."
      />

      <form className="card mb-4" onSubmit={(event) => void submit(event)}>
        <h2 className="card-title">{draft.id ? 'Editar regra' : 'Nova regra'}</h2>
        <div className="grid grid-cols-[120px_130px_minmax(0,1fr)_190px_90px] items-end gap-2.5 max-[900px]:grid-cols-1">
          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-xs font-semibold text-muted">Campo</span>
            <select
              className="field"
              value={draft.field}
              onChange={(event) => change({ field: event.target.value as RuleField })}
            >
              {Object.entries(FIELDS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-xs font-semibold text-muted">Condição</span>
            <select
              className="field"
              value={draft.operator}
              onChange={(event) => change({ operator: event.target.value as RuleOperator })}
            >
              {Object.entries(OPERATORS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-xs font-semibold text-muted">Valor</span>
            <input
              type="text"
              className="field min-w-0"
              placeholder="ex.: JORGE DA SILVA"
              value={draft.value}
              onChange={(event) => change({ value: event.target.value })}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-xs font-semibold text-muted">Categoria</span>
            <select
              className="field"
              value={categoryId}
              onChange={(event) => change({ categoryId: event.target.value })}
            >
              <CategoryOptions categories={categories} />
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-xs font-semibold text-muted">
              Prioridade<span className="sr-only"> (maior vence)</span>
            </span>
            <input
              type="number"
              title="Quando duas regras servem, a de maior prioridade vence"
              className="field min-w-0"
              value={draft.priority}
              onChange={(event) => change({ priority: Number(event.target.value) })}
            />
          </label>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
          <button className="btn">{draft.id ? 'Salvar' : 'Adicionar'}</button>
          <button type="button" className="btn-ghost" onClick={test}>
            Testar regra
          </button>
          {draft.id && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setDraft(EMPTY);
                setTested(null);
              }}
            >
              Cancelar
            </button>
          )}
          {tested && <span className="text-[13px] text-muted">{tested}</span>}
        </div>
      </form>

      <div className="table-card">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr>
              <th className="th">Quando</th>
              <th className="th">Valor</th>
              <th className="th">Categoria</th>
              <th className="th">Prioridade</th>
              <th className="th">Afeta</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((rule) => (
              <tr key={rule.id}>
                <td className="td">
                  {FIELDS[rule.field]} {OPERATORS[rule.operator]}
                </td>
                <td className="td">
                  <code className="rounded-md bg-bg px-[7px] py-0.5 text-xs">{rule.value}</code>
                </td>
                <td className="td">
                  <CategoryBadge category={categoryOf(rule.categoryId)} />
                </td>
                <td className="td tabular-nums">{rule.priority}</td>
                <td className="td note">{transactionCount(affected.get(rule.id) ?? 0)}</td>
                <td className="td">
                  <div className="flex justify-end gap-1.5">
                    <button
                      className="btn-ghost btn-sm"
                      onClick={() => {
                        setDraft(rule);
                        setTested(null);
                      }}
                    >
                      Editar
                    </button>
                    {confirming === rule.id ? (
                      <button
                        className="btn-ghost btn-sm text-warn"
                        onClick={() => {
                          setConfirming(null);
                          void deleteRule(rule.id).then(() =>
                            toast('🗑️ Regra excluída e transações reclassificadas'),
                          );
                        }}
                      >
                        Confirmar exclusão
                      </button>
                    ) : (
                      <button className="btn-ghost btn-sm" onClick={() => setConfirming(rule.id)}>
                        Excluir
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <div className="empty">
            Nenhuma regra ainda. Elas nascem na tela Revisar ou no formulário acima.
          </div>
        )}
      </div>

      <details className="card mt-4">
        <summary className="cursor-pointer text-[13px] font-semibold text-muted">
          Palavras-chave padrão
        </summary>
        <div className="mt-3 flex flex-col gap-3">
          {Object.entries(DEFAULT_KEYWORDS).map(([categoryId, terms]) => (
            <div key={categoryId} className="flex flex-wrap items-center gap-1.5">
              <CategoryBadge category={categoryOf(categoryId)} />
              {terms.map((term) => (
                <span key={term} className="chip">
                  {term.replace(/^\^/, '').replace(/\*$/, '')}
                </span>
              ))}
            </div>
          ))}
        </div>
      </details>
    </>
  );
}
