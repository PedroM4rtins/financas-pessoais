import { useRef, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { useToast } from '../components/Toast';
import { clearAllData, exportBackup, parseBackup, restoreBackup } from '../db/repository';
import { download } from '../lib/export';
import { loadTheme, saveTheme, type Theme } from '../lib/theme';

const THEMES: { value: Theme; label: string }[] = [
  { value: 'system', label: 'Igual ao sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
];

export function Configuracoes() {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [theme, setTheme] = useState(loadTheme);
  const [confirming, setConfirming] = useState(false);

  async function backup() {
    const data = await exportBackup();
    const name = `financas-backup-${data.exportedAt.slice(0, 10)}.json`;
    download(new Blob([JSON.stringify(data)], { type: 'application/json' }), name);
    toast(`💾 Backup salvo: ${name}`);
  }

  async function restore(file: File) {
    try {
      await restoreBackup(parseBackup(await file.text()));
      toast('✅ Backup restaurado');
    } catch {
      toast('Esse arquivo não é um backup válido');
    }
  }

  return (
    <>
      <PageHeader title="Configurações" subtitle="Aparência, backup e dados do navegador" />

      <div className="flex flex-col gap-4">
        <div className="card">
          <h3 className="card-title">Tema</h3>
          <select
            className="field"
            aria-label="Tema"
            value={theme}
            onChange={(event) => {
              const next = event.target.value as Theme;
              setTheme(next);
              saveTheme(next);
            }}
          >
            {THEMES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="card">
          <h3 className="card-title">Backup</h3>
          <p className="mb-3 text-muted">
            Seus dados existem só neste navegador. O backup leva transações, regras e categorias
            para outro computador. Restaurar substitui tudo o que está aqui.
          </p>
          <div className="flex flex-wrap gap-2">
            <button className="btn" onClick={() => void backup()}>
              ⬇ Exportar backup
            </button>
            <button className="btn-ghost" onClick={() => input.current?.click()}>
              ⬆ Restaurar backup
            </button>
            <input
              ref={input}
              type="file"
              accept=".json"
              hidden
              aria-label="Arquivo de backup"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void restore(file);
                event.target.value = '';
              }}
            />
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">Apagar todos os dados</h3>
          <p className="mb-3 text-muted">
            Remove transações, regras e arquivos importados, e volta às categorias padrão. Não dá
            para desfazer sem um backup.
          </p>
          {confirming ? (
            <div className="flex gap-2">
              <button
                className="btn-ghost text-warn"
                onClick={() => {
                  setConfirming(false);
                  void clearAllData().then(() => toast('🗑️ Todos os dados foram apagados'));
                }}
              >
                Sim, apagar tudo
              </button>
              <button className="btn-ghost" onClick={() => setConfirming(false)}>
                Cancelar
              </button>
            </div>
          ) : (
            <button className="btn-ghost" onClick={() => setConfirming(true)}>
              Apagar tudo
            </button>
          )}
        </div>
      </div>
    </>
  );
}
