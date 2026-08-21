/**
 * Persistenza.
 *
 * Prima `window.storage` (dove esiste), poi `localStorage`, infine niente.
 * Il terzo caso è previsto, non un errore: da `file://` alcuni browser negano
 * lo storage, e l'applicazione deve funzionare lo stesso — restano lo scarico
 * del file e l'apertura da disco, che sono l'archivio vero.
 */
export const KEY_DATA = "prospettiva:data";
export const KEY_FILTERS = "prospettiva:filtri";
export const KEY_LANG = "prospettiva:lingua";

export type StoreMode = "app" | "local" | "none";

interface AppStorage {
  get(key: string): Promise<{ value: string } | null>;
  set(key: string, value: string): Promise<unknown>;
  delete(key: string): Promise<unknown>;
}

function appStorage(): AppStorage | null {
  const candidate = (globalThis as { storage?: unknown }).storage;
  if (candidate && typeof (candidate as AppStorage).set === "function") {
    return candidate as AppStorage;
  }
  return null;
}

export class Store {
  mode: StoreMode = "none";

  async init(): Promise<StoreMode> {
    const app = appStorage();
    if (app) {
      try {
        await app.set("prospettiva:ping", "1");
        this.mode = "app";
        return this.mode;
      } catch { /* ricade su localStorage */ }
    }
    try {
      localStorage.setItem("prospettiva:ping", "1");
      localStorage.removeItem("prospettiva:ping");
      this.mode = "local";
    } catch {
      this.mode = "none";
    }
    return this.mode;
  }

  async get(key: string): Promise<string | null> {
    try {
      if (this.mode === "app") {
        const r = await appStorage()?.get(key);
        return r ? r.value : null;
      }
      if (this.mode === "local") return localStorage.getItem(key);
    } catch { /* chiave assente o storage negato */ }
    return null;
  }

  async set(key: string, value: string): Promise<void> {
    if (this.mode === "app") await appStorage()?.set(key, value);
    else if (this.mode === "local") localStorage.setItem(key, value);
    else throw new Error("Questo browser non consente il salvataggio locale.");
  }

  async delete(key: string): Promise<void> {
    try {
      if (this.mode === "app") await appStorage()?.delete(key);
      else if (this.mode === "local") localStorage.removeItem(key);
    } catch { /* niente da rimuovere */ }
  }
}

export const store = new Store();
