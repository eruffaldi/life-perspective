import { describe, expect, it } from "vitest";
import { build, maxAge, ModelError, roleLabel } from "../src/core/model.js";
import { SAMPLE } from "../src/data/sample.js";
import type { RawDocumentRoot } from "../src/core/types.js";

const clone = (): RawDocumentRoot => JSON.parse(JSON.stringify(SAMPLE)) as RawDocumentRoot;
const M = build(SAMPLE);

describe("build — struttura", () => {
  it("indicizza le persone per id", () => {
    expect(Object.keys(M.byId).sort()).toEqual(["davide", "elsa", "marta", "sofia", "tommaso"]);
  });

  it("usa `meta.anchor` per scegliere la persona di riferimento", () => {
    expect(M.anchor.id).toBe("marta");
    const senza = clone();
    delete senza.meta;
    expect(build(senza).anchor.id).toBe("marta");   // ricade sulla prima
  });

  it("solleva se manca l'elenco delle persone", () => {
    expect(() => build({} as RawDocumentRoot)).toThrow(ModelError);
  });

  it("solleva su una persona senza nascita", () => {
    const d = clone();
    delete d.people![0]!.birth;
    expect(() => build(d)).toThrow(/birth/);
  });

  it("assegna un colore anche a chi non lo dichiara", () => {
    const d = clone();
    delete d.people![0]!.color;
    expect(build(d).people[0]!.color).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe("build — condivisi", () => {
  it("aggancia un evento condiviso a tutte le persone di `who`", () => {
    expect(M.byId["marta"]!.sharedEvents.some(e => e.id === "wedding")).toBe(true);
    expect(M.byId["davide"]!.sharedEvents.some(e => e.id === "wedding")).toBe(true);
  });

  it("aggancia un periodo condiviso alla sola prima persona", () => {
    expect(M.byId["marta"]!.shared.some(p => p.id === "mortgage")).toBe(true);
    expect(M.byId["davide"]!.shared.some(p => p.id === "mortgage")).toBe(false);
  });

  it("manda nel contesto ciò che non ha `who`", () => {
    expect(M.context.some(e => e.label === "Caduta del Muro")).toBe(true);
    expect(M.context.some(e => e.id === "wedding")).toBe(false);
  });

  it("ignora i riferimenti `who` a id inesistenti", () => {
    const d = clone();
    d.events![0]!.who = ["fantasma"];
    const built = build(d);
    expect(built.context.some(e => e.id === "wedding")).toBe(true);
  });
});

describe("build — ricorrenze", () => {
  it("genera gli anniversari dichiarati", () => {
    const wed = M.byId["marta"]!.sharedEvents.find(e => e.id === "wedding");
    expect(wed?.recs?.map(r => r.date.y)).toEqual([2017, 2032, 2057]);
  });

  it("usa `settings.milestones` quando `recurrences` è true", () => {
    const d = clone();
    d.settings!.milestones = [1, 7];
    d.events![0]!.recurrences = true;
    const wed = build(d).byId["marta"]!.sharedEvents.find(e => e.id === "wedding");
    expect(wed?.recs?.map(r => r.date.y)).toEqual([2008, 2014]);
  });

  it("scarta le ricorrenze oltre l'orizzonte", () => {
    const d = clone();
    d.settings!.horizon = "2030";
    const wed = build(d).byId["marta"]!.sharedEvents.find(e => e.id === "wedding");
    expect(wed?.recs).toHaveLength(1);
  });
});

describe("build — scuola e documenti", () => {
  it("genera i cicli solo per chi ha il blocco `school`", () => {
    expect(M.byId["marta"]!.periods.some(p => p.generated && p.track === "school")).toBe(false);
    expect(M.byId["sofia"]!.periods.some(p => p.stage === "highschool")).toBe(true);
  });

  it("lascia che un periodo manuale sostituisca il ciclo generato", () => {
    const d = clone();
    d.people![2]!.periods = [{
      label: "Liceo linguistico", start: "2026-09", end: "2031-06",
      track: "school", replaces: "highschool"
    }];
    const sofia = build(d).byId["sofia"]!;
    expect(sofia.periods.filter(p => p.stage === "highschool")).toHaveLength(0);
    expect(sofia.periods.some(p => p.label === "Liceo linguistico")).toBe(true);
    expect(sofia.periods.some(p => p.stage === "bachelor")).toBe(true);
  });

  it("dà una riga a ogni documento", () => {
    const rows = M.byId["marta"]!.rows.filter(r => r.track === "doc");
    expect(rows).toHaveLength(3);
    expect(rows.every(r => r.label)).toBe(true);
    expect(rows.every(r => new Set(r.items.map(i => i.label)).size === 1)).toBe(true);
  });
});

describe("build — vacanze", () => {
  it("trasforma `holidays` in periodi condivisi sulla corsia dedicata", () => {
    const vac = M.byId["marta"]!.shared.filter(p => p.track === "holiday");
    expect(vac).toHaveLength(5);
    expect(vac.every(p => p.category === "holiday")).toBe(true);
  });

  it("crea la riga `holiday` sotto la persona", () => {
    expect(M.byId["marta"]!.rows.some(r => r.track === "holiday")).toBe(true);
  });
});

describe("build — marcatori", () => {
  it("li tiene in ordine cronologico", () => {
    const t = M.byId["marta"]!.marks.map(m => m.e.date.t0);
    expect(t).toEqual([...t].sort((a, b) => a - b));
  });

  it("etichetta ogni marcatore con la corsia, ricorrenze comprese", () => {
    expect(M.byId["marta"]!.marks.every(m => m.tk)).toBe(true);
  });
});

describe("build — periodi aperti", () => {
  it("distingue `end` assente da una fine reale", () => {
    const attuale = M.byId["marta"]!.periods.find(p => p.label === "Casa attuale");
    expect(attuale?.end).toBeNull();
    const passata = M.byId["marta"]!.periods.find(p => p.label === "Casa di via Saragozza");
    expect(passata?.end).not.toBeNull();
  });
});

describe("build — luoghi", () => {
  it("raccoglie le coordinate esplicite come voci del dizionario", () => {
    expect(M.placeDict["Lerici"]).toEqual([44.0757, 9.9114]);
    expect(M.placeDict["Università di Bologna"]).toBeDefined();
  });

  it("solleva su coordinate non numeriche", () => {
    const d = clone();
    d.places = { X: ["a", "b"] as unknown as [number, number] };
    expect(() => build(d)).toThrow(/lat, lon/);
  });
});

describe("span e maxAge", () => {
  it("copre tutti i dati con un margine", () => {
    expect(M.span.lo).toBeLessThan(1924);
    expect(M.span.hi).toBeGreaterThan(new Date().getFullYear());
  });

  it("non supera l'orizzonte", () => {
    expect(M.span.hi).toBeLessThanOrEqual(Math.ceil(M.horizon) + 2);
  });

  it("restituisce un'età massima plausibile", () => {
    const m = maxAge(M);
    expect(m).toBeGreaterThan(70);
    expect(m).toBeLessThan(130);
  });
});

describe("roleLabel", () => {
  it("traduce i ruoli noti e lascia passare gli altri", () => {
    expect(roleLabel("child")).toBe("figlio/a");
    expect(roleLabel("cugino")).toBe("cugino");
    expect(roleLabel("")).toBe("");
  });
});
