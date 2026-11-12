import { useState, type FormEvent } from 'react';
import { useToast } from '../../components/Toast';
import {
  isReady,
  loadWhatsApp,
  saveWhatsApp,
  sendWhatsApp,
  type WhatsAppConfig,
} from './reminders';

const CALLMEBOT = 'https://www.callmebot.com/blog/free-api-whatsapp-messages/';

export function WhatsAppSettings() {
  const toast = useToast();
  const [config, setConfig] = useState<WhatsAppConfig>(loadWhatsApp);
  const [testing, setTesting] = useState(false);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (config.enabled && !isReady(config)) {
      toast('Preencha o número com DDI e DDD e a chave do CallMeBot');
      return;
    }
    saveWhatsApp(config);
    toast(config.enabled ? '✅ Lembretes no WhatsApp ligados' : 'Lembretes no WhatsApp desligados');
  }

  async function test() {
    const ready = { ...config, enabled: true };
    if (!isReady(ready)) {
      toast('Preencha o número com DDI e DDD e a chave do CallMeBot');
      return;
    }
    setTesting(true);
    try {
      await sendWhatsApp(ready, '✅ Teste do Finanças: os lembretes vão chegar aqui.');
      toast('📨 Enviado. Se não chegar em 1 minuto, confira o número e a chave');
    } catch {
      toast('Não foi possível enviar. Confira a conexão');
    } finally {
      setTesting(false);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <h2 className="card-title">Lembretes no WhatsApp</h2>
      <p className="mb-2 text-muted">
        As anotações com “Avisar no WhatsApp” chegam no seu número pelo{' '}
        <a href={CALLMEBOT} target="_blank" rel="noreferrer" className="underline">
          CallMeBot
        </a>
        , um serviço gratuito que só manda mensagem para quem autorizou. Para pegar a chave, salve o
        contato indicado na página dele e mande a mensagem de autorização. A chave chega no seu
        WhatsApp.
      </p>
      <p className="mb-3 text-muted">
        Esta é a única coisa que sai do navegador: só o título, o texto e a data das anotações com
        lembrete passam pelo CallMeBot. Transações e arquivos nunca saem. A chave fica só neste
        navegador e não vai no backup. Os avisos saem com o app aberto em alguma aba.
      </p>
      <div className="grid grid-cols-[220px_minmax(0,1fr)] gap-2.5 max-[900px]:grid-cols-1">
        <input
          type="tel"
          className="field min-w-0"
          aria-label="Seu número com DDI e DDD"
          placeholder="+55 11 99999-8888"
          autoComplete="tel"
          value={config.phone}
          onChange={(event) => setConfig({ ...config, phone: event.target.value })}
        />
        <input
          type="password"
          className="field min-w-0"
          aria-label="Chave do CallMeBot"
          placeholder="Chave (apikey) do CallMeBot"
          autoComplete="off"
          value={config.apiKey}
          onChange={(event) => setConfig({ ...config, apiKey: event.target.value })}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-muted">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(event) => setConfig({ ...config, enabled: event.target.checked })}
          />
          Enviar lembretes
        </label>
        <div className="flex gap-2">
          <button className="btn">Salvar</button>
          <button
            type="button"
            className="btn-ghost"
            disabled={testing}
            onClick={() => void test()}
          >
            Enviar teste
          </button>
        </div>
      </div>
    </form>
  );
}
