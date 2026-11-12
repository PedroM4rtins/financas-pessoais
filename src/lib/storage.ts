/**
 * Sem armazenamento persistente, o navegador pode apagar o IndexedDB quando o disco
 * enche. Como os dados só existem aqui, vale pedir proteção depois da primeira importação.
 */
export async function isStoragePersisted(): Promise<boolean | null> {
  if (!navigator.storage?.persisted) return null;
  try {
    return await navigator.storage.persisted();
  } catch {
    return null;
  }
}

/** Devolve se ficou protegido. Alguns navegadores decidem sozinhos, sem perguntar. */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
