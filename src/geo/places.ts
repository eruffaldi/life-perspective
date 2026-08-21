/**
 * Raccolta dei luoghi: attraversa il modello e aggrega tutto ciò che accade
 * nello stesso posto, con la durata complessiva e le persone coinvolte.
 */
import { fmtDate } from "../core/date.js";
import { evTrack } from "../core/tracks.js";
import { resolvePlace } from "./gazetteer.js";
import type { Model, Period, Person, TrackKey } from "../core/types.js";

export interface PlaceEntry {
  label: string;
  person: Person | null;
  t0: number;
  /** null per gli eventi puntuali. */
  t1: number | null;
  /** Periodo ancora in corso: non scade oggi. */
  open: boolean;
  when: string;
}

export interface Place {
  name: string;
  entries: PlaceEntry[];
  /** Anni complessivi trascorsi qui, usati per il raggio del cerchio. */
  years: number;
  people: Set<Person>;
  coord: readonly [number, number];
  src: string;
}

export interface PlaceCollection {
  placed: Place[];
  /** Nomi che nessuna fonte sa trasformare in coordinate. */
  unplaced: { name: string; entries: PlaceEntry[] }[];
}

type Visible = (track: TrackKey) => boolean;

export function collectPlaces(model: Model, visible: Visible): PlaceCollection {
  const map = new Map<string, { name: string; entries: PlaceEntry[]; years: number; people: Set<Person> }>();

  const add = (name: string | null, entry: PlaceEntry): void => {
    if (!name) return;
    let bucket = map.get(name);
    if (!bucket) {
      bucket = { name, entries: [], years: 0, people: new Set<Person>() };
      map.set(name, bucket);
    }
    bucket.entries.push(entry);
    if (entry.person) bucket.people.add(entry.person);
    if (entry.t1 != null) bucket.years += Math.max(0, entry.t1 - entry.t0);
  };

  const spanEntry = (q: Period, person: Person | null): PlaceEntry => ({
    label: q.label,
    person,
    t0: q.start.mid,
    t1: q.end ? q.end.mid : model.now,
    open: !q.end,
    when: fmtDate(q.start) + " – " + (q.end ? fmtDate(q.end) : "oggi")
  });

  for (const person of model.people) {
    for (const q of person.periods.concat(person.shared)) {
      if (!visible(q.tk ?? q.track)) continue;
      add(q.placeName, spanEntry(q, person));
    }
    for (const e of person.events.concat(person.sharedEvents)) {
      if (!visible(evTrack(e))) continue;
      add(e.placeName, {
        label: e.label, person, t0: e.date.t0, t1: null, open: false, when: fmtDate(e.date)
      });
    }
  }

  if (visible("world")) {
    for (const e of model.context) {
      add(e.placeName, {
        label: e.label, person: null, t0: e.date.t0, t1: null, open: false, when: fmtDate(e.date)
      });
    }
    for (const q of model.contextPeriods) add(q.placeName, spanEntry(q, null));
  }

  const placed: Place[] = [];
  const unplaced: PlaceCollection["unplaced"] = [];
  for (const bucket of map.values()) {
    const r = resolvePlace(bucket.name, model.placeDict);
    if (r) placed.push({ ...bucket, coord: r.coord, src: r.src });
    else unplaced.push({ name: bucket.name, entries: bucket.entries });
  }
  placed.sort((a, b) => b.years - a.years || b.entries.length - a.entries.length);
  return { placed, unplaced };
}

/** Un luogo è "acceso" in un dato anno se qualcosa vi accadeva. */
export function activeInYear(place: Place, year: number): boolean {
  return place.entries.some(e => {
    if (e.t1 == null) return Math.floor(e.t0) === year;   // evento puntuale
    if (e.t0 > year + 1) return false;                     // non ancora cominciato
    return e.open || e.t1 >= year;                         // "in corso" non scade oggi
  });
}

/** I traslochi di ciascuno, in ordine cronologico. */
export function homeTraces(model: Model, placed: readonly Place[]) {
  const traces: { person: Person; stops: Place[] }[] = [];
  for (const person of model.people) {
    const stops = person.periods
      .filter(q => q.track === "home" && q.placeName)
      .sort((a, b) => a.start.t0 - b.start.t0)
      .map(q => placed.find(p => p.name === q.placeName))
      .filter((p): p is Place => !!p);
    if (stops.length >= 2) traces.push({ person, stops });
  }
  return traces;
}
