import { useState, type FormEvent } from 'react';
import { CategoryBadge } from '../components/CategoryBadge';
import { PageHeader } from '../components/PageHeader';
import { useToast } from '../components/Toast';
import { useCategories } from '../db/hooks';
import { deleteCategory, saveCategory } from '../db/repository';
import type { Category } from '../db/types';
import { formatBRL, parseMoneyInput } from '../lib/format';

type Draft = { id?: string; name: string; color: string; icon: string; budget: string };

const EMPTY: Draft = { name: '', color: '#3A7BD5', icon: '📦', budget: '' };

const toDraft = (category: Category): Draft => ({
  ...category,
  // Volta para o formulário como a pessoa digitaria: 1.500,00.
  budget: category.budget ? formatBRL(category.budget).replace(/^R\$\s*/, '') : '',
});

export function Categorias() {
  const categories = useCategories();
  const toast = useToast();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [confirming, setConfirming] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const name = draft.name.trim();
    if (!name) {
      toast('Digite um nome para a categoria');
      return;
    }
    const budget = draft.budget.trim() ? parseMoneyInput(draft.budget) : 0;
    if (budget === null) {
      toast('Orçamento inválido. Use o formato 1.500,00');
      return;
    }
    await saveCategory({
      id: draft.id ?? crypto.randomUUID(),
      name,
      color: draft.color,
      icon: draft.icon.trim() || '📦',
      ...(budget > 0 ? { budget } : {}),
    });
    toast(draft.id ? '✅ Categoria atualizada' : '✅ Categoria criada');
    setDraft(EMPTY);
  }

  return (
    <>
      <PageHeader title="Categorias" subtitle="Cores, ícones e orçamento mensal de cada uma" />

      <form className="card mb-4" onSubmit={(event) => void submit(event)}>
        <h3 className="card-title">{draft.id ? 'Editar categoria' : 'Nova categoria'}</h3>
        <div className="grid grid-cols-[minmax(0,1fr)_70px_70px_160px_auto] items-center gap-2.5 max-[900px]:grid-cols-1">
          <input
            type="text"
            className="field min-w-0"
            aria-label="Nome"
            placeholder="Nome"
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          />
          <input
            type="text"
            className="field min-w-0 text-center"
            aria-label="Ícone"
            value={draft.icon}
            onChange={(event) => setDraft({ ...draft, icon: event.target.value })}
          />
          <input
            type="color"
            className="field h-[38px] w-full min-w-0 cursor-pointer p-1"
            aria-label="Cor"
            value={draft.color}
            onChange={(event) => setDraft({ ...draft, color: event.target.value })}
          />
          <input
            type="text"
            inputMode="decimal"
            className="field min-w-0"
            aria-label="Orçamento mensal em reais"
            placeholder="Orçamento (R$)"
            value={draft.budget}
            onChange={(event) => setDraft({ ...draft, budget: event.target.value })}
          />
          <div className="flex gap-2">
            <button className="btn">{draft.id ? 'Salvar' : 'Adicionar'}</button>
            {draft.id && (
              <button type="button" className="btn-ghost" onClick={() => setDraft(EMPTY)}>
                Cancelar
              </button>
            )}
          </div>
        </div>
      </form>

      <div className="table-card">
        <table className="w-full min-w-[520px] border-collapse">
          <thead>
            <tr>
              <th className="th">Categoria</th>
              <th className="th text-right">Orçamento mensal</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id}>
                <td className="td">
                  <CategoryBadge category={category} />
                </td>
                <td className="td num">{category.budget ? formatBRL(category.budget) : '-'}</td>
                <td className="td">
                  <div className="flex justify-end gap-1.5">
                    <button
                      className="btn-ghost btn-sm"
                      onClick={() => setDraft(toDraft(category))}
                    >
                      Editar
                    </button>
                    {confirming === category.id ? (
                      <button
                        className="btn-ghost btn-sm text-warn"
                        onClick={() => {
                          setConfirming(null);
                          void deleteCategory(category.id).then(() =>
                            toast('🗑️ Categoria e regras dela excluídas'),
                          );
                        }}
                      >
                        Confirmar exclusão
                      </button>
                    ) : (
                      <button
                        className="btn-ghost btn-sm"
                        onClick={() => setConfirming(category.id)}
                      >
                        Excluir
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
