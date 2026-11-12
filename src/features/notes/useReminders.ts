import { useEffect } from 'react';
import { dispatchReminders, loadWhatsApp } from './reminders';

const EVERY_MS = 30_000;

/**
 * Confere os lembretes a cada 30 segundos enquanto o app estiver aberto, e logo ao abrir:
 * o que venceu com o app fechado sai assim que ele volta. A configuração é relida a cada
 * vez, então ligar o WhatsApp em Configurações vale sem recarregar.
 */
export function useReminders(): void {
  useEffect(() => {
    let running = false;
    const check = () => {
      if (running) return;
      running = true;
      void dispatchReminders(loadWhatsApp())
        .catch(() => undefined)
        .finally(() => {
          running = false;
        });
    };
    check();
    const timer = setInterval(check, EVERY_MS);
    window.addEventListener('online', check);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearInterval(timer);
      window.removeEventListener('online', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);
}
