import { describe, expect, it } from "vitest";
import { build } from "../src/core/model.js";
import { SAMPLE } from "../src/data/sample.js";
import { activeInYear, collectPlaces, homeTraces } from "../src/geo/places.js";
import type { TrackKey } from "../src/core/types.js";

const M = build(SAMPLE);
const all = () => true;
const collect = (visible: (t: TrackKey) => boolean = all) => collectPlaces(M, visible);

describe("collectPlaces", () => {
  it("risolve i luoghi dell'esempio", () => {
    const { placed, unplaced } = collect();
    expect(unplaced).toHaveLength(0);
    expect(placed.map(p => p.name)).toContain("Lerici");
    expect(placed.map(p => p.name)).toContain("Barcellona");
  });

  it("ordina per anni trascorsi", () => {
    const years = collect().placed.map(p => p.years);
    expect(years).toEqual([...years].sort((a, b) => b - a));
  });

  it("somma la durata dei periodi e ignora gli eventi puntuali", () => {
    const milano = collect().placed.find(p => p.name === "Milano");
    expect(milano!.years).toBeGreaterThan(8);
    const uni = collect().placed.find(p => p.name === "Università di Bologna");
    expect(uni!.years).toBe(0);
  });

  it("registra chi c'è stato", () => {
    const lerici = collect().placed.find(p => p.name === "Lerici");
    expect(lerici!.people.size).toBeGreaterThan(0);
  });

  it("rispetta i filtri", () => {
    const senzaVacanze = collect(t => t !== "holiday");
    const conVacanze = collect();
    expect(senzaVacanze.placed.length).toBeLessThan(conVacanze.placed.length);
  });

  it("elenca a parte i nomi senza coordinate", () => {
    const d = JSON.parse(JSON.stringify(SAMPLE));
    d.people[0].events.push({ label: "X", date: "2020-01-01", place: "Contrada Fantasia" });
    const { unplaced } = collectPlaces(build(d), all);
    expect(unplaced.map(u => u.name)).toContain("Contrada Fantasia");
  });
});

describe("activeInYear", () => {
  const place = (entries: { t0: number; t1: number | null; open: boolean }[]) => ({
    name: "X", entries: entries.map(e => ({ ...e, label: "", person: null, when: "" })),
    years: 0, people: new Set<never>(), coord: [0, 0] as const, src: ""
  });

  it("accende un periodo che copre l'anno", () => {
    const p = place([{ t0: 1978.3, t1: 1997.7, open: false }]);
    expect(activeInYear(p, 1985)).toBe(true);
    expect(activeInYear(p, 2005)).toBe(false);
  });

  // Regressione: i periodi aperti terminavano "oggi" e sparivano dal futuro.
  it("tiene acceso un periodo in corso anche negli anni futuri", () => {
    const p = place([{ t0: 2018.4, t1: 2026.6, open: true }]);
    expect(activeInYear(p, 2040)).toBe(true);
    expect(activeInYear(p, 2000)).toBe(false);
  });

  it("accende un evento puntuale solo nel suo anno", () => {
    const p = place([{ t0: 2021.6, t1: null, open: false }]);
    expect(activeInYear(p, 2021)).toBe(true);
    expect(activeInYear(p, 2022)).toBe(false);
  });
});

describe("homeTraces", () => {
  it("collega i traslochi in ordine cronologico", () => {
    const { placed } = collect();
    const traces = homeTraces(M, placed);
    expect(traces.length).toBeGreaterThanOrEqual(2);
    for (const trace of traces) {
      expect(trace.stops.length).toBeGreaterThanOrEqual(2);
    }
    const marta = traces.find(t => t.person.id === "marta");
    expect(marta!.stops.map(s => s.name)).toEqual(["Siena", "Bologna", "Milano"]);
  });

  it("ignora chi ha una sola casa", () => {
    const d = JSON.parse(JSON.stringify(SAMPLE));
    d.people[1].periods = [{ label: "Casa", start: "2000", track: "home", place: "Milano" }];
    const m2 = build(d);
    const traces = homeTraces(m2, collectPlaces(m2, all).placed);
    expect(traces.some(t => t.person.id === "davide")).toBe(false);
  });
});
