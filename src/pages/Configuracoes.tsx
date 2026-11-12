import { useEffect, useRef, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { useToast } from '../components/Toast';
import { useTransactions } from '../db/hooks';
import {
  clearAllData,
  exportBackup,
  parseBackup,
  restoreBackup,
  type Backup,
} from '../db/repository';
import { WhatsAppSettings } from '../features/notes/WhatsAppSettings';
import { download } from '../lib/export';
import { transactionCount } from '../lib/format';
import { isStoragePersisted, requestPersistentStorage } from '../lib/storage';
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
  const [incoming, setIncoming] = useState<{ name: string; backup: Backup } | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const current = useTransactions().length;

  useEffect(() => {
    void isStoragePersisted().then(setPersisted);
  }, []);

  async function protect() {
    const granted = await requestPersistentStorage();
    setPersisted(granted);
    toast(granted ? '🔒 Dados protegidos' : 'O navegador não liberou a proteção agora');
  }

  async function backup() {
    const data = await exportBackup();
    const name = `financas-backup-${data.exportedAt.slice(0, 10)}.json`;
    download(new Blob([JSON.stringify(data)], { type: 'application/json' }), name);
    toast(`💾 Backup salvo: ${name}`);
  }

  async function pick(file: File) {
    try {
      setIncoming({ name: file.name, backup: parseBackup(await file.text()) });
    } catch {
      toast('Esse arquivo não é um backup válido');
    }
  }

  async function restore(backup: Backup) {
    setIncoming(null);
    try {
      await restoreBackup(backup);
      toast('✅ Backup restaurado');
    } catch {
      // A restauração roda numa transação: se falha, os dados de antes continuam lá.
      toast('Não foi possível restaurar. Seus dados atuais continuam como estavam.');
    }
  }

  return (
    <>
      <PageHeader
        title="Configurações"
        subtitle="Aparência, lembretes, backup e dados do navegador"
      />

      <div className="flex flex-col gap-4">
        <div className="card">
          <h2 className="card-title">Tema</h2>
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

        <WhatsAppSettings />

        <div className="card">
          <h2 className="card-title">Backup</h2>
          <p className="mb-3 text-muted">
            Seus dados existem só neste navegador. O backup leva transações, regras, categorias e
            anotações para outro computador. Restaurar substitui tudo o que está aqui.
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
                if (file) void pick(file);
                event.target.value = '';
              }}
            />
          </div>
          {incoming && (
            <div
              role="alert"
              className="mt-3 rounded-btn border bg-warn-soft p-3 text-[13px]"
              style={{ borderColor: 'rgb(var(--c-warn-line))' }}
            >
              <p className="mb-2.5">
                Restaurar <b>{incoming.name}</b>, de{' '}
                {new Date(incoming.backup.exportedAt).toLocaleDateString('pt-BR')}, com{' '}
                {transactionCount(incoming.backup.transactions.length)}? As{' '}
                {transactionCount(current)} de agora serão substituídas.
              </p>
              <div className="flex flex-wrap gap-2">
                <button className="btn btn-sm" onClick={() => void restore(incoming.backup)}>
                  Sim, restaurar
                </button>
                <button className="btn-ghost btn-sm" onClick={() => void backup()}>
                  Salvar backup do atual antes
                </button>
                <button className="btn-ghost btn-sm" onClick={() => setIncoming(null)}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="card-title">Proteção dos dados</h2>
          <p className="mb-3 text-muted">
            {persisted
              ? 'Protegido: o navegador não apaga estes dados para liberar espaço.'
              : 'Sem proteção, o navegador pode apagar estes dados quando o disco estiver cheio. Faça backups e peça a proteção.'}
          </p>
          {persisted === false && (
            <button className="btn-ghost" onClick={() => void protect()}>
              🔒 Proteger dados
            </button>
          )}
          {persisted === null && (
            <p className="note">Este navegador não informa se os dados estão protegidos.</p>
          )}
        </div>

        <div className="card">
          <h2 className="card-title">Apagar todos os dados</h2>
          <p className="mb-3 text-muted">
            Remove transações, regras, anotações e arquivos importados, e volta às categorias
            padrão. Não dá para desfazer sem um backup.
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
