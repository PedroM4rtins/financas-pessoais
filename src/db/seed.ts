import type { Category } from './types';

// Tons de cédula: sóbrios como a tinta azul do app, mas distintos o bastante entre si
// para o gráfico de rosca, e legíveis nos dois temas.
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'alimentacao', name: 'Alimentação', color: '#B8642E', icon: '🍔' },
  { id: 'transporte', name: 'Transporte', color: '#3366A8', icon: '🚗' },
  { id: 'lazer', name: 'Lazer', color: '#7D5196', icon: '🎬' },
  { id: 'moradia', name: 'Moradia', color: '#2F7F6A', icon: '🏠' },
  { id: 'saude', name: 'Saúde', color: '#B4414B', icon: '💊' },
  { id: 'compras', name: 'Compras', color: '#A6812B', icon: '🛍️' },
  { id: 'assinaturas', name: 'Assinaturas', color: '#5A6B7C', icon: '🔁' },
  { id: 'educacao', name: 'Educação', color: '#A15079', icon: '📚' },
  { id: 'outros', name: 'Outros', color: '#8B7B66', icon: '📦' },
];

/** Cores padrão até a versão 3 do banco, para reconhecer as que ninguém mudou. */
const LEGACY_COLORS: Record<string, string> = {
  alimentacao: '#E07A3F',
  transporte: '#3A7BD5',
  lazer: '#9B5DE5',
  moradia: '#2A9D8F',
  saude: '#E5484D',
  compras: '#C9971A',
  assinaturas: '#5C6B7A',
  educacao: '#D4568C',
  outros: '#8D7B68',
};

/**
 * Troca a cor de uma categoria padrão pela da paleta nova, mas só se ela ainda estiver
 * com a cor antiga: a cor que a pessoa escolheu nunca é sobrescrita.
 */
export function recolorDefault(category: Category): string | null {
  const legacy = LEGACY_COLORS[category.id];
  if (!legacy || category.color.toUpperCase() !== legacy) return null;
  return DEFAULT_CATEGORIES.find((item) => item.id === category.id)?.color ?? null;
}

/** `categoryId: null` não é registro no banco; isto é só a aparência dele. */
export const UNCLASSIFIED: Category = {
  id: '',
  name: 'Não classificado',
  color: '#C9C3B6',
  icon: '❓',
};
