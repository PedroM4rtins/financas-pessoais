import type { Category } from './types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'alimentacao', name: 'Alimentação', color: '#E07A3F', icon: '🍔' },
  { id: 'transporte', name: 'Transporte', color: '#3A7BD5', icon: '🚗' },
  { id: 'lazer', name: 'Lazer', color: '#9B5DE5', icon: '🎬' },
  { id: 'moradia', name: 'Moradia', color: '#2A9D8F', icon: '🏠' },
  { id: 'saude', name: 'Saúde', color: '#E5484D', icon: '💊' },
  { id: 'compras', name: 'Compras', color: '#C9971A', icon: '🛍️' },
  { id: 'assinaturas', name: 'Assinaturas', color: '#5C6B7A', icon: '🔁' },
  { id: 'educacao', name: 'Educação', color: '#D4568C', icon: '📚' },
  { id: 'outros', name: 'Outros', color: '#8D7B68', icon: '📦' },
];

/** `categoryId: null` não é registro no banco; isto é só a aparência dele. */
export const UNCLASSIFIED: Category = {
  id: '',
  name: 'Não classificado',
  color: '#C9C3B6',
  icon: '❓',
};
