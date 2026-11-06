import type { Category } from '../db/types';

export function CategoryOptions({ categories }: { categories: Category[] }) {
  return categories.map((category) => (
    <option key={category.id} value={category.id}>
      {category.icon} {category.name}
    </option>
  ));
}
