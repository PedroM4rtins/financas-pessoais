import { lazy, type ComponentType } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '../components/Toast';
import { Layout } from './Layout';

// Cada tela vira um arquivo à parte: a Visão geral não espera o código das outras.
const page = <K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) =>
  lazy(() => load().then((module) => ({ default: module[name] })));

const Dashboard = page(() => import('../pages/Dashboard'), 'Dashboard');
const Importar = page(() => import('../pages/Importar'), 'Importar');
const Transacoes = page(() => import('../pages/Transacoes'), 'Transacoes');
const Revisao = page(() => import('../pages/Revisao'), 'Revisao');
const Regras = page(() => import('../pages/Regras'), 'Regras');
const Categorias = page(() => import('../pages/Categorias'), 'Categorias');
const Anotacoes = page(() => import('../pages/Anotacoes'), 'Anotacoes');
const Configuracoes = page(() => import('../pages/Configuracoes'), 'Configuracoes');

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
            <Route path="anotacoes" element={<Anotacoes />} />
            <Route path="configuracoes" element={<Configuracoes />} />
          </Route>
        </Routes>
      </HashRouter>
    </ToastProvider>
  );
}
