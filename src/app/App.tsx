import { HashRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '../components/Toast';
import { Categorias } from '../pages/Categorias';
import { Configuracoes } from '../pages/Configuracoes';
import { Dashboard } from '../pages/Dashboard';
import { Importar } from '../pages/Importar';
import { Regras } from '../pages/Regras';
import { Revisao } from '../pages/Revisao';
import { Transacoes } from '../pages/Transacoes';
import { Layout } from './Layout';

// HashRouter: o GitHub Pages não reescreve rotas e daria 404 ao recarregar a página.
export function App() {
  return (
    <ToastProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="importar" element={<Importar />} />
            <Route path="transacoes" element={<Transacoes />} />
            <Route path="revisao" element={<Revisao />} />
            <Route path="regras" element={<Regras />} />
            <Route path="categorias" element={<Categorias />} />
            <Route path="configuracoes" element={<Configuracoes />} />
          </Route>
        </Routes>
      </HashRouter>
    </ToastProvider>
  );
}
