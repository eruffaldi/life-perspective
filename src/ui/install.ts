/**
 * Installazione come applicazione web.
 *
 * Vale solo quando la pagina arriva da un'origine http(s): l'artefatto aperto
 * da `file://` resta quello che è sempre stato, un file solo, e non deve
 * tentare registrazioni che fallirebbero.
 */
import { el, must } from "./dom.js";
import { t } from "../i18n/index.js";

/** Vero quando ha senso parlare di service worker e di installazione. */
export function isHosted(): boolean {
  return typeof location !== "undefined" && /^https?:$/.test(location.protocol);
}

/**
 * Chiede al browser di non sfrattare i dati sotto pressione di spazio.
 * Su un'origine ospitata `localStorage` è memoria sacrificabile finché non si
 * chiede il contrario, e qui dentro c'è un archivio di famiglia.
 */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted?.()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/** Avviso discreto che una versione nuova è pronta, con il ricarico a scelta. */
function announceUpdate(worker: ServiceWorker): void {
  const msg = must("#msg");
  const bar = el("span", "update");
  bar.appendChild(el("span", undefined, t().data.updateReady));
  const btn = el("button", "btn", t().data.reload);
  btn.onclick = () => {
    worker.postMessage("skip-waiting");
    location.reload();
  };
  bar.appendChild(btn);
  msg.replaceChildren(bar);
}

export function registerServiceWorker(): void {
  if (!isHosted() || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("sw.js").then(reg => {
      reg.addEventListener("updatefound", () => {
        const installing = reg.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          // `controller` presente significa che una versione era già attiva:
          // questa è una sostituzione, non la prima installazione.
          if (installing.state === "installed" && navigator.serviceWorker.controller) {
            announceUpdate(installing);
          }
        });
      });
    }).catch(() => {
      // Nessun service worker: l'applicazione funziona lo stesso, solo senza
      // offline garantito. Non è un errore da mostrare.
    });
  });
}
