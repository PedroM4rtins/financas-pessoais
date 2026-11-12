import { db } from '../../db';
import type { Note } from '../../db/types';
import { fullDate } from './notes';

/**
 * Lembretes no WhatsApp pelo CallMeBot (callmebot.com): um serviço gratuito que só manda
 * mensagem para o número que o autorizou. É a única coisa do app que sai do navegador,
 * por isso fica desligado até a pessoa configurar, e só envia as anotações com lembrete.
 */
export type WhatsAppConfig = { enabled: boolean; phone: string; apiKey: string };

const KEY = 'financas-whatsapp';

export const NO_WHATSAPP: WhatsAppConfig = { enabled: false, phone: '', apiKey: '' };

/** A chave fica no localStorage, fora do IndexedDB: assim não vai junto no backup. */
export function loadWhatsApp(): WhatsAppConfig {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<WhatsAppConfig> | null;
    return {
      enabled: saved?.enabled === true,
      phone: typeof saved?.phone === 'string' ? saved.phone : '',
      apiKey: typeof saved?.apiKey === 'string' ? saved.apiKey : '',
    };
  } catch {
    return NO_WHATSAPP;
  }
}

export function saveWhatsApp(config: WhatsAppConfig): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(config));
  } catch {
    // Sem armazenamento, a configuração vale só até fechar a página.
  }
}

/** Só dígitos, com o "+" na frente, como o CallMeBot pede: +5511999998888. */
export const cleanPhone = (phone: string): string => `+${phone.replace(/\D/g, '')}`;

export const isReady = (config: WhatsAppConfig): boolean =>
  config.enabled && config.phone.replace(/\D/g, '').length >= 10 && config.apiKey.trim() !== '';

export function callMeBotUrl(config: WhatsAppConfig, text: string): string {
  const params = new URLSearchParams({
    phone: cleanPhone(config.phone),
    text,
    apikey: config.apiKey.trim(),
  });
  return `https://api.callmebot.com/whatsapp.php?${params.toString()}`;
}

/**
 * O CallMeBot não libera CORS, então a resposta é opaca: dá para saber que a requisição
 * saiu, não se a mensagem chegou. A mensagem de teste em Configurações confirma isso.
 */
export async function sendWhatsApp(config: WhatsAppConfig, text: string): Promise<void> {
  await fetch(callMeBotUrl(config, text), { mode: 'no-cors', cache: 'no-store' });
}

const MAX_BODY = 600;

export function reminderMessage(note: Note): string {
  const body = note.body.length > MAX_BODY ? `${note.body.slice(0, MAX_BODY)}…` : note.body;
  return [`⏰ Lembrete: ${note.title || 'sem título'}`, body, `📅 ${fullDate(note.date)}`]
    .filter(Boolean)
    .join('\n\n');
}

/** Agora no fuso de quem usa, no formato do campo de lembrete: yyyy-mm-ddThh:mm. */
export function localNow(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(
    now.getHours(),
  )}:${pad(now.getMinutes())}`;
}

export const isDue = (note: Note, now: string): boolean =>
  Boolean(note.remindAt) && !note.remindedAt && note.remindAt! <= now;

/**
 * Marca como enviados, numa transação, os lembretes vencidos e devolve os marcados.
 * Com o app aberto em duas abas, só uma pega cada lembrete: a mensagem não chega duplicada.
 */
export async function claimDueReminders(now: string): Promise<Note[]> {
  return db.transaction('rw', db.notes, async () => {
    const due = (await db.notes.toArray()).filter((note) => isDue(note, now));
    const sentAt = new Date().toISOString();
    const claimed = due.map((note) => {
      const next: Note = { ...note, remindedAt: sentAt };
      delete next.reminderError;
      return next;
    });
    await db.notes.bulkPut(claimed);
    return claimed;
  });
}

/** Envia os lembretes vencidos. Se o envio falha, o lembrete volta a ficar pendente. */
export async function dispatchReminders(config: WhatsAppConfig, now = localNow()): Promise<number> {
  if (!isReady(config)) return 0;
  const claimed = await claimDueReminders(now);
  let sent = 0;
  for (const note of claimed) {
    try {
      await sendWhatsApp(config, reminderMessage(note));
      sent++;
    } catch {
      const pending: Note = { ...note, reminderError: 'Sem conexão na hora do envio' };
      delete pending.remindedAt;
      await db.notes.put(pending);
    }
  }
  return sent;
}

const DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export const isValidRemindAt = (value: string): boolean => DATETIME.test(value);

/**
 * Liga, troca ou desliga o lembrete. Trocar a hora vale como lembrete novo: ele volta a
 * ficar pendente, mesmo que o anterior já tenha sido enviado.
 */
export function withReminder<T extends Partial<Note>>(note: T, remindAt: string | null): T {
  if (remindAt === note.remindAt) return note;
  const next = { ...note };
  delete next.remindedAt;
  delete next.reminderError;
  if (remindAt) next.remindAt = remindAt;
  else delete next.remindAt;
  return next;
}
