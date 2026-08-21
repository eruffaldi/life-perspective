/**
 * Corsie: una tabella sola da cui discendono ordine di disegno, etichette,
 * filtri e mappatura delle categorie. Aggiungere una corsia significa
 * toccare solo questo file.
 */
import { TRACK_KEYS, type TrackKey } from "./types.js";
import { t } from "../i18n/index.js";

export interface TrackDef {
  k: TrackKey;
  /** Etichetta nella lingua attiva: si legge al disegno, non all'avvio. */
  get l(): string;
}

/** L'ordine è una scelta di progetto, le etichette vengono dal catalogo. */
export const TRACKS: readonly TrackDef[] = ([
  "school", "work", "home", "holiday", "finance", "doc", "life", "world"
] as const).map(k => ({ k, get l() { return t().tracks[k]; } }));

export function trackLabel(track: TrackKey): string {
  return t().tracks[track];
}

/** Ordine di disegno delle corsie sotto una persona: `world` è a parte. */
export const TRACK_ORDER: TrackKey[] = TRACKS.map(t => t.k).filter(k => k !== "world");

/** I documenti ingombrano e non c'entrano con il resto: partono spenti. */
export const DEFAULT_OFF: TrackKey[] = ["doc"];

export function isTrackKey(v: unknown): v is TrackKey {
  return typeof v === "string" && (TRACK_KEYS as readonly string[]).includes(v);
}

/** Categorie note, mappate sulla corsia di appartenenza. */
const CAT_TRACK: Record<string, TrackKey> = {
  school: "school", work: "work", home: "home", finance: "finance",
  holiday: "holiday", doc: "doc", family: "life", sport: "life",
  history: "world", life: "life"
};

export const KNOWN_CATEGORIES = Object.keys(CAT_TRACK);

/** Corsia di un evento, ai fini dei filtri. */
export function evTrack(e: { track?: string; category?: string }): TrackKey {
  if (isTrackKey(e.track)) return e.track;
  if (e.category && CAT_TRACK[e.category]) return CAT_TRACK[e.category] as TrackKey;
  return "life";
}

export function defaultFilters(settings?: { filters?: string[] }): Set<TrackKey> {
  const declared = settings?.filters?.filter(isTrackKey);
  if (declared && declared.length) return new Set(declared);
  return new Set(TRACKS.map(t => t.k).filter(k => !DEFAULT_OFF.includes(k)));
}
