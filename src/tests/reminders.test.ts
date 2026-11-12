import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../db';
import { addNote, clearAllData } from '../db/repository';
import type { Note } from '../db/types';
import {
  callMeBotUrl,
  claimDueReminders,
  dispatchReminders,
  isDue,
  isReady,
  localNow,
  reminderMessage,
  withReminder,
  type WhatsAppConfig,
} from '../features/notes/reminders';

const config: WhatsAppConfig = {
  enabled: true,
  phone: '+55 (11) 99999-8888',
  apiKey: 'chave-teste',
};

const note = (fields: Partial<Note> = {}): Note => ({
  id: 'n1',
  kind: 'lembrete',
  title: 'Pagar IPVA',
  body: 'Vence hoje',
  date: '2026-11-20',
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  ...fields,
});

const fetchMock = vi.fn<typeof fetch>();

beforeEach(async () => {
  await clearAllData();
  fetchMock.mockReset().mockResolvedValue(new Response(null));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('configuração', () => {
  it('só fica pronta ligada, com número completo e chave', () => {
    expect(isReady(config)).toBe(true);
    expect(isReady({ ...config, enabled: false })).toBe(false);
    expect(isReady({ ...config, phone: '9999' })).toBe(false);
    expect(isReady({ ...config, apiKey: ' ' })).toBe(false);
  });

  it('monta a URL do CallMeBot com o número limpo e o texto codificado', () => {
    const url = new URL(callMeBotUrl(config, 'Olá & tchau'));
    expect(url.origin + url.pathname).toBe('https://api.callmebot.com/whatsapp.php');
    expect(url.searchParams.get('phone')).toBe('+5511999998888');
    expect(url.searchParams.get('text')).toBe('Olá & tchau');
    expect(url.searchParams.get('apikey')).toBe('chave-teste');
  });
});

describe('mensagem e horário', () => {
  it('leva título, texto e data', () => {
    expect(reminderMessage(note())).toBe('⏰ Lembrete: Pagar IPVA\n\nVence hoje\n\n📅 20/11/2026');
  });

  it('formata a hora local como no campo do lembrete', () => {
    expect(localNow(new Date(2026, 10, 5, 8, 7))).toBe('2026-11-05T08:07');
  });

  it('vence quando a hora chega e ainda não foi enviado', () => {
    const due = note({ remindAt: '2026-11-20T09:00' });
    expect(isDue(due, '2026-11-20T08:59')).toBe(false);
    expect(isDue(due, '2026-11-20T09:00')).toBe(true);
    expect(isDue({ ...due, remindedAt: '2026-11-20T12:00:00.000Z' }, '2026-11-21T00:00')).toBe(
      false,
    );
    expect(isDue(note(), '2030-01-01T00:00')).toBe(false);
  });

  it('trocar a hora reativa o lembrete; desligar remove tudo', () => {
    const sent = note({ remindAt: '2026-11-20T09:00', remindedAt: 'x', reminderError: 'y' });
    expect(withReminder(sent, '2026-11-20T09:00')).toBe(sent);
    const moved = withReminder(sent, '2026-11-21T09:00');
    expect(moved.remindAt).toBe('2026-11-21T09:00');
    expect(moved.remindedAt).toBeUndefined();
    expect(moved.reminderError).toBeUndefined();
    const off = withReminder(sent, null);
    expect('remindAt' in off || 'remindedAt' in off || 'reminderError' in off).toBe(false);
  });
});

describe('envio', () => {
  const newNote = (remindAt?: string) =>
    addNote({ kind: 'lembrete', title: 'Conta', body: '', date: '2026-11-20', remindAt });

  it('envia só os vencidos e marca como enviados', async () => {
    const due = await newNote('2026-11-20T09:00');
    const later = await newNote('2026-11-20T18:00');
    await newNote();
    expect(await dispatchReminders(config, '2026-11-20T10:00')).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((await db.notes.get(due))?.remindedAt).toBeDefined();
    expect((await db.notes.get(later))?.remindedAt).toBeUndefined();
  });

  it('não envia de novo o que já saiu', async () => {
    await newNote('2026-11-20T09:00');
    await dispatchReminders(config, '2026-11-20T10:00');
    await dispatchReminders(config, '2026-11-20T10:01');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('duas abas conferindo juntas não duplicam a mensagem', async () => {
    await newNote('2026-11-20T09:00');
    const [a, b] = await Promise.all([
      claimDueReminders('2026-11-20T10:00'),
      claimDueReminders('2026-11-20T10:00'),
    ]);
    expect(a.length + b.length).toBe(1);
  });

  it('não envia nada com o WhatsApp desligado', async () => {
    await newNote('2026-11-20T09:00');
    expect(await dispatchReminders({ ...config, enabled: false }, '2026-11-20T10:00')).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('falha de rede deixa o lembrete pendente, com o motivo', async () => {
    const id = await newNote('2026-11-20T09:00');
    fetchMock.mockRejectedValueOnce(new TypeError('offline'));
    expect(await dispatchReminders(config, '2026-11-20T10:00')).toBe(0);
    const pending = await db.notes.get(id);
    expect(pending?.remindedAt).toBeUndefined();
    expect(pending?.reminderError).toBeTruthy();
    expect(await dispatchReminders(config, '2026-11-20T10:01')).toBe(1);
    expect((await db.notes.get(id))?.reminderError).toBeUndefined();
  });
});
