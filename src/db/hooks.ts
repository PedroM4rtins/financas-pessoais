import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { db } from '.';
import { UNCLASSIFIED } from './seed';
import type { Category, ImportedFile, Note, Rule, Transaction } from './types';

const NO_TRANSACTIONS: Transaction[] = [];
const NO_RULES: Rule[] = [];
const NO_CATEGORIES: Category[] = [];
const NO_FILES: ImportedFile[] = [];
const NO_NOTES: Note[] = [];

export const useTransactions = (): Transaction[] =>
  useLiveQuery(() => db.transactions.toArray(), []) ?? NO_TRANSACTIONS;

export const useRules = (): Rule[] => useLiveQuery(() => db.rules.toArray(), []) ?? NO_RULES;

export const useCategories = (): Category[] =>
  useLiveQuery(() => db.categories.toArray(), []) ?? NO_CATEGORIES;

export const useFiles = (): ImportedFile[] =>
  useLiveQuery(() => db.files.toArray(), []) ?? NO_FILES;

export const useNotes = (): Note[] => useLiveQuery(() => db.notes.toArray(), []) ?? NO_NOTES;

export type CategoryLookup = (id: string | null) => Category;

/** Categoria pelo id; null ou id desconhecido viram "Não classificado". */
export function useCategoryLookup(): CategoryLookup {
  const categories = useCategories();
  return useMemo(() => {
    const byId = new Map(categories.map((category) => [category.id, category]));
    return (id) => (id && byId.get(id)) || UNCLASSIFIED;
  }, [categories]);
}
