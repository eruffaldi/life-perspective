/**
 * Età e distanze temporali.
 *
 * Con date imprecise l'età non è un numero ma un intervallo: `1921` a
 * novembre 1998 vale 76 o 77 a seconda del mese di nascita. Il modello
 * `midpoint` mostra il valore centrale con un tilde, `range` gli estremi.
 */
import type { AgeDisplay, DateVal, Person } from "./types.js";
import { t } from "../i18n/index.js";

export interface AgeRange {
  min: number;
  max: number;
  mid: number;
}

export function ageRange(person: Pick<Person, "birth">, dt: DateVal): AgeRange {
  const EPS = 1e-9;
  return {
    min: Math.floor(dt.t0 - person.birth.t1 + EPS),
    max: Math.floor(dt.t1 - person.birth.t0 - EPS),
    mid: Math.floor(dt.mid - person.birth.mid + EPS)
  };
}

export interface AgeText {
  txt: string;
  note: string | null;
}

export function ageText(person: Person, dt: DateVal, mode: AgeDisplay): AgeText {
  const a = ageRange(person, dt);
  const m = t();
  if (a.max < 0) return { txt: m.app.unknown, note: m.age.notYetBorn };
  if (person.death && dt.t0 >= person.death.t1) return { txt: m.app.unknown, note: m.age.noLonger };
  if (a.min === a.max) return { txt: m.age.years(a.mid), note: null };
  if (mode === "range") return { txt: m.age.range(a.min, a.max), note: null };
  return { txt: m.age.approx(a.mid), note: null };
}

/** Forma compatta per tabelle e strisce: "–" non nato, "†" non più in vita. */
export function ageShort(person: Person, dt: DateVal, mode: AgeDisplay): string {
  const a = ageRange(person, dt);
  if (a.max < 0) return "–";
  if (person.death && dt.t0 >= person.death.t1) return "†";
  if (a.min === a.max) return String(a.mid);
  return mode === "range" ? a.min + "–" + a.max : "~" + a.mid;
}

/** "tra 3 anni e 2 mesi", "12 anni fa", "adesso". */
export function distText(when: number, now: number): string {
  const m = t();
  const dy = when - now;
  const abs = Math.abs(dy);
  if (abs < 1 / 24) return m.age.now;
  const years = Math.floor(abs);
  const months = Math.round((abs - years) * 12);
  let s: string;
  if (years === 0) s = m.age.nMonths(months);
  else if (months === 0 || years >= 8) s = m.age.nYears(Math.round(abs));
  else s = m.age.yearsAndMonths(m.age.nYears(years), m.age.nMonths(months));
  return dy >= 0 ? m.age.inFuture(s) : m.age.inPast(s);
}
