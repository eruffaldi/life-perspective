/**
 * Tipi del dominio, divisi in due famiglie che non vanno confuse:
 *
 *   Raw*    ciò che l'utente scrive nel JSON. Le date sono stringhe, i campi
 *           opzionali mancano davvero, e nulla è ancora verificato.
 *   Model*  ciò che i renderer consumano. Le date sono intervalli risolti,
 *           i riferimenti sono già puntatori, i valori generati sono presenti.
 *
 * `build()` è l'unico ponte fra le due. Se un renderer tocca un tipo `Raw`
 * significa che qualcosa è sfuggito alla normalizzazione.
 */

/* ------------------------------------------------------------------ *
 * Date                                                                *
 * ------------------------------------------------------------------ */

/** Precisione dedotta dalla lunghezza della stringa, mai dichiarata a parte. */
export type Precision = "y" | "m" | "d";

/**
 * Una data è un INTERVALLO semiaperto [t0, t1) in anni decimali, non un
 * istante: "1921" copre un anno intero e le età che ne derivano sono
 * approssimate di conseguenza.
 */
export interface DateVal {
  readonly y: number;
  readonly m: number;
  readonly d: number;
  readonly prec: Precision;
  readonly t0: number;
  readonly t1: number;
  readonly mid: number;
  readonly raw: string;
}

/* ------------------------------------------------------------------ *
 * Vocabolari                                                          *
 * ------------------------------------------------------------------ */

export const TRACK_KEYS = [
  "school", "work", "home", "holiday", "finance", "doc", "life", "world"
] as const;
export type TrackKey = (typeof TRACK_KEYS)[number];

export const STAGE_KEYS = [
  "primary", "middle", "highschool", "bachelor", "master"
] as const;
export type StageKey = (typeof STAGE_KEYS)[number];

export const DOC_TYPES = ["patente", "passaporto", "identita"] as const;
export type DocType = (typeof DOC_TYPES)[number];

export type AgeDisplay = "midpoint" | "range";

/* ------------------------------------------------------------------ *
 * Formato di ingresso                                                 *
 * ------------------------------------------------------------------ */

export type RawCoord = readonly [number, number];
export type RawPlace = string | { name: string; coord?: RawCoord };

export interface RawEvent {
  id?: string;
  label?: string;
  date?: string;
  category?: string;
  track?: string;
  place?: RawPlace;
  circa?: boolean;
  note?: string;
  /** Lista di anniversari, oppure `true` per usare `settings.milestones`. */
  recurrences?: number[] | true;
  who?: string[];
  /** Presenti solo per segnalare l'errore «un evento non usa `start`/`end`». */
  start?: string;
  end?: string;
}

export interface RawPeriod {
  id?: string;
  label?: string;
  start?: string;
  /** Assente significa «ancora in corso», non «finito oggi». */
  end?: string;
  track?: string;
  category?: string;
  place?: RawPlace;
  circa?: boolean;
  note?: string;
  replaces?: string;
  who?: string[];
  /** Presente solo per segnalare l'errore «un periodo non usa `date`». */
  date?: string;
}

export interface RawSchool {
  system?: "it";
  through?: string;
  early?: boolean;
  delays?: Record<string, number>;
}

export interface RawDocument {
  label?: string;
  type?: string;
  expires?: string;
  /** Ha la precedenza sulle regole legate al tipo. */
  validity?: number;
}

export interface RawPerson {
  id?: string;
  name?: string;
  role?: string;
  birth?: string;
  death?: string;
  color?: string;
  school?: RawSchool;
  documents?: RawDocument[];
  periods?: RawPeriod[];
  events?: RawEvent[];
}

export interface RawSettings {
  ageDisplay?: string;
  milestones?: number[];
  horizon?: string;
  filters?: string[];
}

export interface RawDocumentRoot {
  version?: number;
  meta?: { title?: string; anchor?: string };
  settings?: RawSettings;
  people?: RawPerson[];
  events?: RawEvent[];
  periods?: RawPeriod[];
  holidays?: RawPeriod[];
  places?: Record<string, RawCoord>;
}

/* ------------------------------------------------------------------ *
 * Modello normalizzato                                                *
 * ------------------------------------------------------------------ */

export interface Settings {
  ageDisplay: AgeDisplay;
  milestones: number[];
  horizon: string;
  filters?: string[];
}

export interface Period {
  id?: string;
  label: string;
  start: DateVal;
  end: DateVal | null;
  track: TrackKey;
  category?: string;
  placeName: string | null;
  circa: boolean;
  /** Ciclo scolastico sostituito, se dichiarato. */
  replaces?: StageKey;
  /** Prodotto da `school` o da `documents`, non scritto dall'utente. */
  generated?: boolean;
  /** Ciclo di provenienza per i periodi scolastici generati. */
  stage?: StageKey;
  who?: string[];
  shared?: boolean;
  color?: string;
  /** Corsia effettiva assegnata al momento del raggruppamento in righe. */
  tk?: TrackKey;
}

export interface Recurrence {
  n: number;
  label: string;
  date: DateVal;
  of: EventItem;
}

export interface EventItem {
  id?: string;
  label: string;
  date: DateVal;
  category?: string;
  track?: TrackKey;
  placeName: string | null;
  circa: boolean;
  generated?: boolean;
  recurrences?: number[] | true;
  recs?: Recurrence[];
  who?: string[];
  shared?: boolean;
  color?: string;
}

export type MarkKind = "event" | "rec";

export interface Mark {
  kind: MarkKind;
  e: EventItem | Recurrence;
  tk?: TrackKey;
}

export interface TrackRow {
  track: TrackKey;
  /** Etichetta specifica, usata per dare una riga a ogni documento. */
  label?: string;
  items: Period[];
}

export interface Person {
  id: string;
  name: string;
  role: string;
  birth: DateVal;
  death: DateVal | null;
  color: string;
  periods: Period[];
  events: EventItem[];
  /** Periodi condivisi agganciati a questa persona (la prima di `who`). */
  shared: Period[];
  sharedEvents: EventItem[];
  rows: TrackRow[];
  marks: Mark[];
}

export interface Model {
  settings: Settings;
  horizon: number;
  now: number;
  placeDict: Record<string, RawCoord>;
  context: EventItem[];
  contextPeriods: Period[];
  people: Person[];
  byId: Record<string, Person>;
  anchor: Person;
  title: string;
  span: { lo: number; hi: number };
}

/* ------------------------------------------------------------------ *
 * Diagnostica                                                         *
 * ------------------------------------------------------------------ */

export type DiagLevel = "error" | "warning";

export interface Diagnostic {
  level: DiagLevel;
  /** Codice stabile: non va riusato per un significato diverso. */
  code: string;
  /** Percorso JSON del punto responsabile, per portarci il cursore. */
  path: string;
  message: string;
  hint?: string;
}
