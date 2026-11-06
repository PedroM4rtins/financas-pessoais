import type { Category } from '../db/types';

export function CategoryBadge({ category }: { category: Category }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-[9px] py-[3px] text-xs font-semibold"
      style={{ background: `${category.color}22`, color: category.color }}
    >
      <span className="h-[7px] w-[7px] rounded-full" style={{ background: category.color }} />
      {category.icon} {category.name}
    </span>
  );
}
