import { useState } from 'react';
import { Dropzone } from '../components/Dropzone';
import { PageHeader } from '../components/PageHeader';
import { useToast } from '../components/Toast';
import { useFiles } from '../db/hooks';
import { saveImport } from '../db/repository';
import { readImportFile, type ImportPreview } from '../features/import/importFile';
import { PdfPasswordError, ScannedPdfError } from '../features/import/readErrors';
import { dayMonth } from '../lib/dates';
import { formatBRL, transactionCount } from '../lib/format';
import { requestPersistentStorage } from '../lib/storage';

type Item = {
  key: string;
  source: File;
  data?: ArrayBuffer;
  status: 'lendo' | 'senha' | 'previa' | 'erro';
  message?: string;
  preview?: ImportPreview;
};

const FileIcon = ({ label }: { label: string }) => (
  <div className="grid h-[46px] w-[38px] shrink-0 place-items-center rounded-md bg-[#FBE4E1] text-[11px] font-extrabold text-[#C2392B]">
    {label}
  </div>
);

const extension = (name: string) => (name.toLowerCase().endsWith('.csv') ? 'CSV' : 'PDF');

export function Importar() {
  const files = useFiles();
  const toast = useToast();
  const [items, setItems] = useState<Item[]>([]);

  const update = (key: string, change: Partial<Item>) =>
    setItems((list) => list.map((item) => (item.key === key ? { ...item, ...change } : item)));
  const remove = (key: string) => setItems((list) => list.filter((item) => item.key !== key));

  async function read(key: string, source: File, data: ArrayBuffer, password?: string) {
    update(key, { status: 'lendo', message: undefined });
    try {
      const preview = await readImportFile(source, data, password);
      if (preview.alreadyImported || preview.transactions.length === 0) {
        const total = preview.duplicates;
        if (total > 0) {
          remove(key);
          toast(`⚠️ ${source.name}: já importado (${transactionCount(total)} ignoradas)`);
          return;
        }
        update(key, {
          status: 'erro',
          message: 'Nenhuma transação encontrada. Este formato ainda não é reconhecido.',
        });
        return;
      }
      update(key, { status: 'previa', preview });
    } catch (error) {
      if (error instanceof PdfPasswordError) {
        update(key, {
          status: 'senha',
          message: error.incorrect ? 'Senha incorreta. Tente de novo.' : undefined,
        });
      } else if (error instanceof ScannedPdfError) {
        update(key, {
          status: 'erro',
          message: 'PDF escaneado, sem texto: ainda não é suportado.',
        });
      } else {
        update(key, { status: 'erro', message: 'Não foi possível ler este arquivo.' });
      }
    }
  }

  function addFiles(selected: File[]) {
    const accepted = selected.filter((file) => /\.(pdf|csv)$/i.test(file.name));
    if (accepted.length < selected.length) toast('Só arquivos PDF ou CSV são aceitos');
    for (const source of accepted) {
      const key = crypto.randomUUID();
      setItems((list) => [...list, { key, source, status: 'lendo' }]);
      void source.arrayBuffer().then((data) => {
        update(key, { data });
        return read(key, source, data);
      });
    }
  }

  async function confirm(item: Item) {
    if (!item.preview) return;
    const { classified, pending } = await saveImport(item.preview.file, item.preview.transactions);
    remove(item.key);
    // Agora há dados que só existem aqui: pede ao navegador para não apagá-los.
    void requestPersistentStorage();
    toast(
      `📥 ${transactionCount(item.preview.transactions.length)} importadas · ${classified} classificadas automaticamente, ${pending} para revisar`,
    );
  }

  const imported = [...files].sort((a, b) => b.importedAt.localeCompare(a.importedAt));

  return (
    <>
      <PageHeader
        title="Importar faturas"
        subtitle="Arraste a fatura do cartão ou o extrato do banco"
      />
      <Dropzone onFiles={addFiles} />

      {items.map((item) => (
        <div key={item.key} className="card mt-4">
          <div className="flex flex-wrap items-center gap-3.5">
            <FileIcon label={extension(item.source.name)} />
            <div className="min-w-0 flex-1">
              <b className="break-all">{item.source.name}</b>
              <br />
              <small className="text-muted">
                {item.preview
                  ? `${item.preview.file.bank} (detectado) · ${item.preview.file.period}`
                  : item.status === 'lendo'
                    ? 'Lendo…'
                    : item.status === 'senha'
                      ? 'Protegido por senha'
                      : 'Não importado'}
              </small>
            </div>
            {item.status === 'lendo' && (
              <span className="track h-1.5 w-40">
                <i className="block h-full w-1/2 animate-pulse rounded-[9px] bg-accent" />
              </span>
            )}
            {item.status === 'previa' && item.preview && (
              <div className="flex gap-2">
                <button className="btn" onClick={() => void confirm(item)}>
                  Importar {transactionCount(item.preview.transactions.length)}
                </button>
                <button className="btn-ghost" onClick={() => remove(item.key)}>
                  Descartar
                </button>
              </div>
            )}
            {item.status === 'erro' && (
              <button className="btn-ghost btn-sm" onClick={() => remove(item.key)}>
                Fechar
              </button>
            )}
          </div>

          {item.status === 'erro' && <p className="mt-3 text-warn">{item.message}</p>}

          {item.status === 'senha' && item.data && (
            <form
              className="mt-3 flex flex-wrap items-center gap-2.5"
              onSubmit={(event) => {
                event.preventDefault();
                const password = new FormData(event.currentTarget).get('senha');
                if (item.data) void read(item.key, item.source, item.data, String(password ?? ''));
              }}
            >
              <input
                name="senha"
                type="password"
                autoComplete="off"
                aria-label="Senha do PDF"
                placeholder="Senha do PDF (muitos bancos usam o CPF)"
                className="field min-w-[280px]"
              />
              <button className="btn">Abrir</button>
              {item.message && <span className="text-warn">{item.message}</span>}
            </form>
          )}

          {item.preview && item.preview.duplicates > 0 && (
            <p className="mt-3 text-[13px] text-warn">
              ⚠️ {transactionCount(item.preview.duplicates)} já existentes serão ignoradas.
            </p>
          )}

          {item.preview && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="th">Data</th>
                    <th className="th">Descrição</th>
                    <th className="th text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {item.preview.transactions.slice(0, 6).map((tx) => (
                    <tr key={tx.id}>
                      <td className="td">{dayMonth(tx.date)}</td>
                      <td className="td">{tx.name}</td>
                      <td className="td num">{formatBRL(tx.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {item.preview.transactions.length > 6 && (
                <p className="note mt-2">
                  e mais {transactionCount(item.preview.transactions.length - 6)}
                </p>
              )}
            </div>
          )}
        </div>
      ))}

      <div className="card mt-4">
        <h3 className="card-title">Arquivos importados</h3>
        {imported.length === 0 && <p className="text-muted">Nenhum arquivo importado ainda.</p>}
        {imported.map((file) => (
          <div
            key={file.id}
            className="flex items-center gap-3.5 border-b border-line py-3.5 last:border-none"
          >
            <FileIcon label={extension(file.fileName)} />
            <div className="min-w-0 flex-1">
              <b className="break-all">{file.fileName}</b>
              <br />
              <small className="text-muted">
                {file.bank} · {file.period}
              </small>
            </div>
            <span className="whitespace-nowrap text-[13px] font-semibold text-accent">
              ✓ {transactionCount(file.count)}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
