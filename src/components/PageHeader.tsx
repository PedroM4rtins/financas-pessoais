import type { ReactNode } from 'react';

type Props = { title: string; subtitle: string; children?: ReactNode };

export function PageHeader({ title, subtitle, children }: Props) {
  return (
    <header className="mb-[22px] flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.02em]">{title}</h1>
        <div className="mt-0.5 text-muted">{subtitle}</div>
      </div>
      {children}
    </header>
  );
}
