/**
 * Normalizzazione: unico ponte fra il formato scritto a mano e il modello che
 * i renderer consumano. Qui le date diventano intervalli, i riferimenti
 * diventano puntatori, e ciò che è derivabile viene derivato.
 *
 * `build()` presuppone dati già validati: le condizioni che qui solleverebbero
 * un'eccezione sono coperte da `validate()`. Quel poco che resta è una rete di
 * sicurezza, non il presidio principale.
 */
import { parseDate, shiftYears, todayDec } from "./date.js";
import { generateSchool, isStageKey } from "./school.js";
import { generateDocs } from "./documents.js";
import { TRACK_ORDER, isTrackKey } from "./tracks.js";
import { t } from "../i18n/index.js";
import { evTrack } from "./tracks.js";
import type {
  DateVal, EventItem, Model, Period, Person, RawCoord, RawDocumentRoot,
  RawEvent, RawPeriod, RawPerson, RawPlace, Settings, StageKey, TrackKey, TrackRow
} from "./types.js";

export class ModelError extends Error {}

const PALETTE = ["#16606B", "#98402F", "#35407E", "#9A7412", "#4E656D", "#6B3A6E"] as const;

const DEFAULT_SETTINGS: Settings = {
  ageDisplay: "midpoint",
  milestones: [5, 10, 20, 25, 50],
  horizon: "2060"
};

function placeName(place: RawPlace | undefined): string | null {
  if (!place) return null;
  return typeof place === "string" ? place : (place.name || null);
}

function normEvent(raw: RawEvent, path: string): EventItem {
  if (!raw.date) throw new ModelError("Evento senza `date`: " + (raw.label ?? path));
  const ev: EventItem = {
    label: raw.label ?? "",
    date: parseDate(raw.date),
    placeName: placeName(raw.place),
    circa: raw.circa === true
  };
  if (raw.id !== undefined) ev.id = raw.id;
  if (raw.category !== undefined) ev.category = raw.category;
  if (isTrackKey(raw.track)) ev.track = raw.track;
  if (raw.recurrences !== undefined) ev.recurrences = raw.recurrences;
  if (raw.who !== undefined) ev.who = raw.who;
  return ev;
}

function normPeriod(raw: RawPeriod, path: string, fallback: TrackKey): Period {
  if (!raw.start) throw new ModelError("Periodo senza `start`: " + (raw.label ?? path));
  const period: Period = {
    label: raw.label ?? "",
    start: parseDate(raw.start),
    end: raw.end ? parseDate(raw.end) : null,
    track: isTrackKey(raw.track) ? raw.track : fallback,
    placeName: placeName(raw.place),
    circa: raw.circa === true
  };
  if (raw.id !== undefined) period.id = raw.id;
  if (raw.category !== undefined) period.category = raw.category;
  if (isStageKey(raw.replaces)) period.replaces = raw.replaces;
  if (raw.who !== undefined) period.who = raw.who;
  return period;
}

/** Le corsie sotto una persona; i documenti hanno una riga per documento. */
function buildRows(person: Person): TrackRow[] {
  const rows: TrackRow[] = [];
  for (const track of TRACK_ORDER) {
    const items = person.periods.filter(q => q.track === track)
      .concat(person.shared.filter(q => q.track === track));
    if (!items.length) continue;
    if (track === "doc") {
      // Patente, passaporto e carta d'identità si sovrappongono nel tempo:
      // su una corsia sola diventano barre accavallate e illeggibili.
      const byLabel = new Map<string, Period[]>();
      for (const q of items) {
        const list = byLabel.get(q.label);
        if (list) list.push(q);
        else byLabel.set(q.label, [q]);
      }
      for (const [label, list] of byLabel) rows.push({ track, label, items: list });
    } else {
      rows.push({ track, items });
    }
  }
  for (const row of rows) for (const item of row.items) item.tk = row.track;
  return rows;
}

function buildMarks(person: Person): void {
  const marks: Person["marks"] = [];
  for (const e of person.events) marks.push({ kind: "event", e });
  for (const e of person.sharedEvents) marks.push({ kind: "event", e });
  for (const e of person.events.concat(person.sharedEvents)) {
    for (const rec of e.recs ?? []) marks.push({ kind: "rec", e: rec });
  }
  for (const m of marks) {
    const source = m.kind === "rec" ? (m.e as { of: EventItem }).of : (m.e as EventItem);
    m.tk = evTrack(source);
  }
  marks.sort((a, b) => a.e.date.t0 - b.e.date.t0);
  person.marks = marks;
}

function collectPlaceDict(data: RawDocumentRoot): Record<string, RawCoord> {
  const dict: Record<string, RawCoord> = {};
  for (const [k, v] of Object.entries(data.places ?? {})) {
    if (!Array.isArray(v) || typeof v[0] !== "number" || typeof v[1] !== "number") {
      throw new ModelError('Coordinate non valide per "' + k + '": servono [lat, lon].');
    }
    dict[k] = [v[0], v[1]];
  }
  // Le coordinate scritte inline valgono come voci del dizionario.
  const inline = (list: readonly { place?: RawPlace }[] | undefined) => {
    for (const x of list ?? []) {
      const p = x.place;
      if (p && typeof p === "object" && Array.isArray(p.coord)) dict[p.name] = p.coord;
    }
  };
  for (const person of data.people ?? []) {
    inline(person.events);
    inline(person.periods);
  }
  inline(data.events);
  inline(data.periods);
  inline(data.holidays);
  return dict;
}

function computeSpan(model: Omit<Model, "span">): { lo: number; hi: number } {
  let lo = Infinity, hi = -Infinity;
  const touch = (t: number) => {
    if (t < lo) lo = t;
    if (t > hi) hi = t;
  };
  for (const p of model.people) {
    touch(p.birth.t0);
    touch(p.death ? p.death.t1
                  : Math.min(model.horizon, Math.max(model.now, p.birth.t0 + 90)));
    for (const q of p.periods.concat(p.shared)) {
      touch(q.start.t0);
      touch(q.end ? q.end.t1 : model.now);
    }
    for (const m of p.marks) touch(m.e.date.t1);
  }
  for (const e of model.context) touch(e.date.t1);
  for (const q of model.contextPeriods) {
    touch(q.start.t0);
    touch(q.end ? q.end.t1 : model.now);
  }
  touch(model.now);
  return { lo: Math.floor(lo) - 2, hi: Math.ceil(Math.min(hi, model.horizon)) + 2 };
}

export function build(data: RawDocumentRoot): Model {
  if (!data || !Array.isArray(data.people)) throw new ModelError("Manca l'elenco `people`.");

  const rawSettings = data.settings ?? {};
  const settings: Settings = {
    ageDisplay: rawSettings.ageDisplay === "range" ? "range" : DEFAULT_SETTINGS.ageDisplay,
    milestones: rawSettings.milestones ?? DEFAULT_SETTINGS.milestones,
    horizon: rawSettings.horizon ?? DEFAULT_SETTINGS.horizon
  };
  if (rawSettings.filters) settings.filters = rawSettings.filters;

  const horizon = parseDate(settings.horizon).t1;
  const now = todayDec();

  const people: Person[] = (data.people as RawPerson[]).map((raw, i) => {
    if (!raw.birth) {
      throw new ModelError("Persona senza `birth`: " + (raw.name ?? raw.id ?? "#" + i));
    }
    const birth = parseDate(raw.birth);
    const manual = (raw.periods ?? []).map((q, j) =>
      normPeriod(q, "people[" + i + "].periods[" + j + "]", "life"));
    const replaced = manual.map(q => q.replaces).filter((k): k is StageKey => !!k);
    const school = generateSchool(raw.school, birth, replaced);
    const docs = generateDocs(raw.documents, birth, horizon);
    const events = (raw.events ?? [])
      .map((e, j) => normEvent(e, "people[" + i + "].events[" + j + "]"))
      .concat(school.events);

    return {
      id: raw.id ?? "p" + i,
      name: raw.name ?? raw.id ?? "?",
      role: raw.role ?? "",
      birth,
      death: raw.death ? parseDate(raw.death) : null,
      color: raw.color ?? PALETTE[i % PALETTE.length] ?? "#4E656D",
      periods: manual.concat(school.periods, docs),
      events,
      shared: [],
      sharedEvents: [],
      rows: [],
      marks: []
    };
  });

  const byId: Record<string, Person> = Object.fromEntries(people.map(p => [p.id, p]));

  const rootEvents = (data.events ?? []).map((e, i) => normEvent(e, "events[" + i + "]"));
  const rootPeriods = (data.periods ?? [])
    .map((q, i) => normPeriod(q, "periods[" + i + "]", "finance"))
    .concat((data.holidays ?? []).map((q, i) => {
      const p = normPeriod(q, "holidays[" + i + "]", "holiday");
      p.track = "holiday";
      p.category = "holiday";
      return p;
    }));

  // Ciò che ha `who` è condiviso e viene agganciato alle persone; il resto è
  // contesto, e finisce in una corsia a parte.
  const context: EventItem[] = [];
  for (const e of rootEvents) {
    const who = (e.who ?? []).map(id => byId[id]).filter((p): p is Person => !!p);
    if (!who.length) {
      context.push(e);
      continue;
    }
    e.shared = true;
    e.color = who[0]!.color;
    for (const p of who) p.sharedEvents.push(e);
  }

  const contextPeriods: Period[] = [];
  for (const q of rootPeriods) {
    const who = (q.who ?? []).map(id => byId[id]).filter((p): p is Person => !!p);
    if (!who.length) {
      contextPeriods.push(q);
      continue;
    }
    q.shared = true;
    q.color = who[0]!.color;
    // Agganciato solo alla prima persona: due copie divergerebbero.
    who[0]!.shared.push(q);
  }

  for (const e of rootEvents.concat(...people.map(p => p.events))) {
    if (!e.recurrences) continue;
    const list = e.recurrences === true ? settings.milestones : e.recurrences;
    e.recs = list
      .map(n => ({ n, label: t().dense.anniversary(n, e.label),
                   date: parseDate(shiftYears(e.date, n)), of: e }))
      .filter(r => r.date.t0 <= horizon);
  }

  for (const person of people) {
    person.rows = buildRows(person);
    buildMarks(person);
  }

  const anchorId = data.meta?.anchor;
  const anchor = (anchorId ? byId[anchorId] : undefined) ?? people[0];
  if (!anchor) throw new ModelError("Nessuna persona nel documento.");

  const partial: Omit<Model, "span"> = {
    settings, horizon, now,
    placeDict: collectPlaceDict(data),
    context, contextPeriods, people, byId, anchor,
    title: data.meta?.title ?? "Prospettiva"
  };
  return { ...partial, span: computeSpan(partial) };
}

/** Massima età raggiunta da qualcuno: larghezza dell'asse in vista allineata. */
export function maxAge(model: Model): number {
  let m = 0;
  for (const p of model.people) {
    const end = p.death ? p.death.mid : Math.min(model.horizon, Math.max(model.now, p.birth.mid));
    m = Math.max(m, end - p.birth.mid);
    for (const q of p.periods.concat(p.shared)) {
      m = Math.max(m, (q.end ? q.end.t1 : model.now) - p.birth.mid);
    }
    for (const k of p.marks) m = Math.max(m, k.e.date.t1 - p.birth.mid);
  }
  return Math.ceil(m) + 2;
}

/** I ruoli noti si traducono; quelli inventati dall'utente restano com'erano. */
export function roleLabel(role: string): string {
  const roles = t().roles as Record<string, string | undefined>;
  return roles[role] ?? role ?? "";
}

/** Una data usata come istante "adesso", per i confronti nei tooltip. */
export function nowDate(model: Model): DateVal {
  return { y: Math.floor(model.now), m: 1, d: 1, prec: "d",
           t0: model.now, t1: model.now, mid: model.now, raw: String(model.now) };
}
