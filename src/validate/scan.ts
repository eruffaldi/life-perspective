/**
 * Scanner JSON che registra dove ogni percorso comincia e finisce nel testo.
 * Serve a portare il cursore sul punto esatto quando si clicca una
 * diagnostica: `JSON.parse` non offre offset, e cercare il valore a occhio
 * sbaglia appena due campi hanno lo stesso contenuto.
 */

/** Suffisso che distingue la posizione della chiave da quella del valore. */
export const KEY_SUFFIX = "\u0000key";

export type PositionMap = Map<string, [number, number]>;

export function scanJSON(text: string): PositionMap {
  const pos: PositionMap = new Map();
  let i = 0;

  const ws = (): void => { while (i < text.length && /\s/.test(text[i]!)) i++; };

  const str = (): string => {
    i++;                                     // apice iniziale
    let out = "";
    while (i < text.length && text[i] !== '"') {
      if (text[i] === "\\") {
        const c = text[++i];
        if (c === "n") out += "\n";
        else if (c === "t") out += "\t";
        else if (c === "u") { out += String.fromCharCode(parseInt(text.substr(i + 1, 4), 16)); i += 4; }
        else out += c ?? "";
        i++;
      } else out += text[i++];
    }
    i++;                                     // apice finale
    return out;
  };

  const value = (path: string): void => {
    ws();
    const start = i;
    const c = text[i];
    if (c === "{") { i++; obj(path); }
    else if (c === "[") { i++; arr(path); }
    else if (c === '"') { str(); }
    else while (i < text.length && !/[,\]}\s]/.test(text[i]!)) i++;
    pos.set(path, [start, i]);
  };

  const obj = (path: string): void => {
    ws();
    if (text[i] === "}") { i++; return; }
    for (;;) {
      ws();
      const keyStart = i;
      const key = str();
      const child = path ? path + "." + key : key;
      ws(); i++;                             // due punti
      value(child);
      pos.set(child + KEY_SUFFIX, [keyStart, i]);
      ws();
      if (text[i] === ",") { i++; continue; }
      if (text[i] === "}") i++;
      return;
    }
  };

  const arr = (path: string): void => {
    ws();
    if (text[i] === "]") { i++; return; }
    let n = 0;
    for (;;) {
      value(path + "[" + (n++) + "]");
      ws();
      if (text[i] === ",") { i++; continue; }
      if (text[i] === "]") i++;
      return;
    }
  };

  try { value(""); } catch { /* testo malformato: nessuna posizione */ }
  return pos;
}

/** Posizione del percorso, risalendo al genitore se il campo non esiste. */
export function locate(pos: PositionMap, path: string): [number, number] | null {
  let p = path;
  for (;;) {
    const at = pos.get(p + KEY_SUFFIX) ?? pos.get(p);
    if (at) return at;
    const shorter = p.replace(/\.[^.\[]+$|\[\d+\]$/, "");
    if (shorter === p) return null;
    p = shorter;
  }
}
