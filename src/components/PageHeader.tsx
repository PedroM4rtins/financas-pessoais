import type { ReactNode } from 'react';

type Props = { title: string; subtitle: string; children?: ReactNode };

export function PageHeader({ title, subtitle, children }: Props) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[30px] font-bold leading-tight tracking-[-0.035em]">{title}</h1>
        <p className="mt-1 text-muted">{subtitle}</p>
      </div>
      {children}
    </header>
  );
}
