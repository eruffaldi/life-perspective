/**
 * Selezione della lingua.
 *
 * La lingua è uno stato globale letto ovunque, non un parametro passato di
 * funzione in funzione: attraverserebbe una ventina di firme senza aggiungere
 * nulla. Il prezzo è che `t()` non è puro — cambia risposta quando cambia la
 * lingua — e i test che lo toccano devono ripristinarla.
 */
import { it, type Messages } from "./it.js";
import { en } from "./en.js";

export type { Messages };

export const CATALOGUES: Record<string, Messages> = { it, en };
export const LANGUAGES = Object.values(CATALOGUES).map(c => ({ code: c.code, name: c.name }));
export const DEFAULT_LANGUAGE = "it";

let current: Messages = it;

/** Il catalogo in uso. Si chiama `t()` per brevità, è ovunque. */
export function t(): Messages {
  return current;
}

export function language(): string {
  return current.code;
}

export function setLanguage(code: string): Messages {
  current = CATALOGUES[code] ?? it;
  if (typeof document !== "undefined") document.documentElement.lang = current.code;
  return current;
}

/**
 * Lingua da preferire quando l'utente non ha ancora scelto: si guarda cosa
 * chiede il browser, e si ricade sull'italiano — la lingua del domìnio.
 */
export function detectLanguage(preferred?: readonly string[]): string {
  // Un elenco vuoto significa «nessuna preferenza», non «chiedi al browser»:
  // altrimenti non ci sarebbe modo di esprimere la prima cosa.
  const wanted = preferred
    ?? (typeof navigator !== "undefined" ? navigator.languages ?? [navigator.language] : []);
  for (const tag of wanted) {
    if (!tag) continue;
    const base = tag.toLowerCase().split("-")[0]!;
    if (CATALOGUES[base]) return base;
  }
  return DEFAULT_LANGUAGE;
}

/** Codice locale completo, per le funzioni di formattazione del browser. */
export function locale(): string {
  return current.code === "it" ? "it-IT" : "en-GB";
}
