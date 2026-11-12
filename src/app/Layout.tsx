import { Suspense } from 'react';
import {
  FileUp,
  LayoutDashboard,
  ListChecks,
  Lock,
  ReceiptText,
  Settings,
  Tags,
  Wand2,
} from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Guilloche } from '../components/Guilloche';
import { useTransactions } from '../db/hooks';
import { reviewGroups } from '../features/classify/review';

const LINKS = [
  { to: '/', icon: LayoutDashboard, label: 'Visão geral' },
  { to: '/importar', icon: FileUp, label: 'Importar faturas' },
  { to: '/transacoes', icon: ReceiptText, label: 'Transações' },
  { to: '/revisao', icon: ListChecks, label: 'Revisar' },
  { to: '/regras', icon: Wand2, label: 'Regras' },
  { to: '/categorias', icon: Tags, label: 'Categorias' },
  { to: '/configuracoes', icon: Settings, label: 'Configurações' },
];

export function Layout() {
  const pending = reviewGroups(useTransactions()).length;
  const { pathname } = useLocation();

  return (
    <div className="grid min-h-screen grid-cols-[236px_minmax(0,1fr)] max-[900px]:grid-cols-[minmax(0,1fr)]">
      <a
        href="#conteudo"
        onClick={(event) => {
          // O HashRouter usa o # da URL: o foco vai direto, sem trocar de rota.
          event.preventDefault();
          document.getElementById('conteudo')?.focus();
        }}
        className="fixed left-3 top-3 z-30 -translate-y-20 rounded-btn bg-accent px-3.5 py-2 font-semibold text-[rgb(var(--c-on-accent))] focus:translate-y-0"
      >
        Pular para o conteúdo
      </a>
      <aside className="sticky top-0 flex h-screen flex-col gap-1 border-r border-line bg-sidebar px-3 py-6 text-sidebar-text max-[900px]:static max-[900px]:h-auto max-[900px]:flex-row max-[900px]:overflow-x-auto max-[900px]:border-b max-[900px]:border-r-0 max-[900px]:py-2.5">
        <div className="flex items-center gap-2.5 px-3 pb-6 max-[900px]:hidden">
          <Guilloche className="h-8 w-8" />
          <span className="font-display text-[19px] font-bold leading-none tracking-[-0.03em]">
            Finanças
          </span>
        </div>
        <nav aria-label="Principal" className="flex flex-col gap-0.5 max-[900px]:flex-row">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 whitespace-nowrap rounded-btn border px-3 py-2 transition-colors ${
                  isActive
                    ? 'border-line bg-sidebar-active font-semibold text-accent'
                    : 'border-transparent text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-text'
                }`
              }
            >
              <link.icon size={17} strokeWidth={1.8} aria-hidden="true" className="shrink-0" />
              {link.label}
              {link.to === '/revisao' && pending > 0 && (
                <span className="ml-auto rounded-full bg-sidebar-badge px-[7px] py-px text-[11px] font-bold tabular-nums text-[rgb(var(--c-panel))]">
                  {pending}
                  <span className="sr-only"> para revisar</span>
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <p className="mt-auto flex gap-2 border-t border-line px-3 pt-4 text-xs leading-relaxed text-sidebar-muted max-[900px]:hidden">
          <Lock size={14} strokeWidth={1.8} aria-hidden="true" className="mt-0.5 shrink-0" />
          Seus dados ficam só no seu navegador. Nenhum arquivo é enviado para servidor.
        </p>
      </aside>

      <main
        id="conteudo"
        tabIndex={-1}
        className="w-full max-w-[1240px] px-10 pb-16 pt-8 outline-none max-[900px]:p-4"
      >
        <div key={pathname} className="page">
          <Suspense
            fallback={
              <p role="status" className="py-10 text-center text-muted">
                Carregando…
              </p>
            }
          >
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
