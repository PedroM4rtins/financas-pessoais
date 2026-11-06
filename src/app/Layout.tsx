import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTransactions } from '../db/hooks';
import { reviewGroups } from '../features/classify/review';

const LINKS = [
  { to: '/', label: '📊 Visão geral' },
  { to: '/importar', label: '📥 Importar faturas' },
  { to: '/transacoes', label: '🧾 Transações' },
  { to: '/revisao', label: '🔎 Revisar' },
  { to: '/regras', label: '⚙️ Regras' },
  { to: '/categorias', label: '🏷️ Categorias' },
  { to: '/configuracoes', label: '🛠️ Configurações' },
];

export function Layout() {
  const pending = reviewGroups(useTransactions()).length;
  const { pathname } = useLocation();

  return (
    <div className="grid min-h-screen grid-cols-[232px_minmax(0,1fr)] max-[900px]:grid-cols-[minmax(0,1fr)]">
      <aside className="sticky top-0 flex h-screen flex-col gap-1 bg-sidebar px-3.5 py-[22px] text-sidebar-text max-[900px]:static max-[900px]:h-auto max-[900px]:flex-row max-[900px]:overflow-x-auto max-[900px]:py-3">
        <div className="flex items-center gap-2.5 px-2.5 pb-[22px] text-base font-bold text-white max-[900px]:hidden">
          <div className="grid h-[30px] w-[30px] place-items-center rounded-lg bg-gradient-to-br from-[#3FB28F] to-[#1F6F5C] text-[15px]">
            💰
          </div>
          Finanças
        </div>
        <nav className="flex flex-col max-[900px]:flex-row">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 whitespace-nowrap rounded-btn px-3 py-2.5 ${
                  isActive
                    ? 'bg-sidebar-active font-semibold text-white'
                    : 'hover:bg-sidebar-hover hover:text-white'
                }`
              }
            >
              {link.label}
              {link.to === '/revisao' && pending > 0 && (
                <span className="ml-auto rounded-full bg-[#B4541A] px-[7px] py-px text-[11px] font-bold text-white">
                  {pending}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto border-t border-sidebar-active p-3 text-xs text-[#8C9A95] max-[900px]:hidden">
          🔒 Seus dados ficam só no seu navegador. Nenhum arquivo é enviado para servidor.
        </div>
      </aside>

      <main className="w-full max-w-[1240px] px-[34px] pb-[60px] pt-7 max-[900px]:p-[18px]">
        <div key={pathname} className="page">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
