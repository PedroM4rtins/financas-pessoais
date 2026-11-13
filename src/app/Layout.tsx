import { Suspense, useEffect, useRef, type ComponentType } from 'react';
import {
  Clapperboard,
  FileUp,
  LayoutDashboard,
  ListChecks,
  Lock,
  Menu,
  ReceiptText,
  Settings,
  StickyNote,
  Tags,
  Wand2,
  X,
} from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Guilloche } from '../components/Guilloche';
import { useTransactions } from '../db/hooks';
import { reviewGroups } from '../features/classify/review';

type Link = {
  to: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  label: string;
  /** Nome curto da barra de baixo, no celular. */
  short?: string;
};

const GROUPS: { label: string; links: Link[] }[] = [
  {
    label: 'Dinheiro',
    links: [
      { to: '/', icon: LayoutDashboard, label: 'Visão geral', short: 'Visão geral' },
      { to: '/transacoes', icon: ReceiptText, label: 'Transações', short: 'Transações' },
      { to: '/revisao', icon: ListChecks, label: 'Revisar' },
      { to: '/importar', icon: FileUp, label: 'Importar faturas' },
      { to: '/regras', icon: Wand2, label: 'Regras' },
      { to: '/categorias', icon: Tags, label: 'Categorias' },
    ],
  },
  {
    label: 'Pessoal',
    links: [
      { to: '/anotacoes', icon: StickyNote, label: 'Anotações', short: 'Anotações' },
      { to: '/catalogo', icon: Clapperboard, label: 'Filmes e séries', short: 'Filmes' },
    ],
  },
];

const SETTINGS: Link = { to: '/configuracoes', icon: Settings, label: 'Configurações' };

/** Os destinos fixos da barra de baixo; o resto fica em "Mais". */
const TABS = GROUPS.flatMap((group) => group.links).filter((link) => link.short);

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <Guilloche className="h-8 w-8" />
      <span className="font-display text-[19px] font-bold leading-none tracking-[-0.03em]">
        Caderno
      </span>
    </div>
  );
}

function SideLink({ link, pending }: { link: Link; pending: number }) {
  return (
    <NavLink
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
  );
}

function NavGroups({ pending }: { pending: number }) {
  return (
    <>
      {GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-0.5">
          <p className="px-3 pb-1 pt-4 text-xs font-semibold text-sidebar-muted/80">
            {group.label}
          </p>
          {group.links.map((link) => (
            <SideLink key={link.to} link={link} pending={pending} />
          ))}
        </div>
      ))}
    </>
  );
}

/** Celular: os destinos principais embaixo, ao alcance do polegar, e o resto em "Mais". */
function TabBar({ pending }: { pending: number }) {
  const sheet = useRef<HTMLDialogElement>(null);
  const { pathname } = useLocation();

  // Trocar de tela pela folha "Mais" fecha a folha.
  useEffect(() => {
    sheet.current?.close();
  }, [pathname]);

  const tab = 'flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 pb-1.5 pt-2 text-[11px]';

  return (
    <>
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-20 hidden border-t border-line bg-panel/95 pb-[env(safe-area-inset-bottom)] backdrop-blur max-[900px]:flex"
      >
        {TABS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) =>
              `${tab} ${isActive ? 'font-semibold text-accent' : 'text-muted'}`
            }
          >
            <link.icon size={20} strokeWidth={1.8} aria-hidden="true" />
            <span className="truncate">{link.short}</span>
          </NavLink>
        ))}
        <button
          type="button"
          className={`${tab} relative text-muted`}
          aria-haspopup="dialog"
          onClick={() => sheet.current?.showModal()}
        >
          <Menu size={20} strokeWidth={1.8} aria-hidden="true" />
          Mais
          {pending > 0 && (
            <span
              className="absolute right-[calc(50%-16px)] top-1.5 h-2 w-2 rounded-full bg-warn"
              aria-label={`${pending} para revisar`}
            />
          )}
        </button>
      </nav>

      <dialog
        ref={sheet}
        aria-label="Todas as telas"
        className="mb-0 mt-auto w-full max-w-none rounded-t-card border border-line bg-sidebar p-3 pb-[calc(12px+env(safe-area-inset-bottom))] text-sidebar-text backdrop:bg-black/50"
        onClick={(event) => {
          // Clique no fundo escurecido (fora da folha) fecha.
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        <div className="flex items-center justify-between px-3 pt-1">
          <Brand />
          <button
            type="button"
            className="rounded-btn p-2 text-muted hover:bg-sidebar-hover"
            aria-label="Fechar"
            onClick={() => sheet.current?.close()}
          >
            <X size={18} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>
        <nav aria-label="Todas as telas" className="flex flex-col">
          <NavGroups pending={pending} />
          <div className="mt-3 border-t border-line pt-3">
            <SideLink link={SETTINGS} pending={pending} />
          </div>
        </nav>
      </dialog>
    </>
  );
}

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
      <aside className="sticky top-0 flex h-screen flex-col border-r border-line bg-sidebar px-3 py-6 text-sidebar-text max-[900px]:hidden">
        <div className="px-3 pb-2">
          <Brand />
        </div>
        <nav aria-label="Principal" className="flex flex-col">
          <NavGroups pending={pending} />
        </nav>
        <div className="mt-auto flex flex-col gap-3">
          <SideLink link={SETTINGS} pending={pending} />
          <p className="flex gap-2 border-t border-line px-3 pt-4 text-xs leading-relaxed text-sidebar-muted">
            <Lock size={14} strokeWidth={1.8} aria-hidden="true" className="mt-0.5 shrink-0" />
            Seus dados ficam só no seu navegador. Nenhum arquivo é enviado para servidor.
          </p>
        </div>
      </aside>

      <main
        id="conteudo"
        tabIndex={-1}
        className="w-full max-w-[1240px] px-10 pb-16 pt-8 outline-none max-[900px]:px-4 max-[900px]:pb-[calc(88px+env(safe-area-inset-bottom))] max-[900px]:pt-5"
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

      <TabBar pending={pending} />
    </div>
  );
}
