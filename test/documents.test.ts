import { describe, expect, it } from "vitest";
import { parseDate } from "../src/core/date.js";
import { docValidity, generateDocs, isDocType } from "../src/core/documents.js";

describe("docValidity", () => {
  it("accorcia la patente con l'età, a scalini", () => {
    expect(docValidity("patente", 34)).toBe(10);
    expect(docValidity("patente", 49)).toBe(10);
    expect(docValidity("patente", 50)).toBe(5);   // il confine è incluso
    expect(docValidity("patente", 69)).toBe(5);
    expect(docValidity("patente", 70)).toBe(3);
    expect(docValidity("patente", 79)).toBe(3);
    expect(docValidity("patente", 80)).toBe(2);
  });

  it("lega passaporto e carta d'identità all'età al rilascio", () => {
    for (const t of ["passaporto", "identita"] as const) {
      expect(docValidity(t, 1)).toBe(3);
      expect(docValidity(t, 3)).toBe(5);
      expect(docValidity(t, 17)).toBe(5);
      expect(docValidity(t, 18)).toBe(10);
    }
  });

  it("non inventa regole per i tipi sconosciuti", () => {
    expect(docValidity("tessera", 30)).toBeNull();
    expect(docValidity(undefined, 30)).toBeNull();
  });
});

describe("generateDocs", () => {
  const birth = parseDate("1977-03-09");
  const horizon = parseDate("2060").t1;

  it("proietta la catena dei rinnovi dalla scadenza dichiarata", () => {
    const out = generateDocs(
      [{ label: "Patente B", type: "patente", expires: "2029-03-09" }], birth, horizon);
    const anni = out.map(p => p.end?.y);
    expect(anni[0]).toBe(2029);
    // A 52 anni la validità è già di 5 anni, non di 10.
    expect(anni[1]).toBe(2034);
    expect(anni[2]).toBe(2039);
  });

  it("arriva fino all'orizzonte e si ferma", () => {
    const out = generateDocs(
      [{ label: "Patente B", type: "patente", expires: "2029-03-09" }], birth, horizon);
    const last = out[out.length - 1];
    expect(last?.end?.t0).toBeGreaterThan(horizon - 6);
    expect(out.length).toBeLessThan(40);
  });

  it("dà la precedenza a `validity` esplicito", () => {
    const out = generateDocs(
      [{ label: "Tessera", type: "patente", expires: "2030-01-01", validity: 4 }], birth, horizon);
    expect(out[0]?.end?.y).toBe(2030);
    expect(out[1]?.end?.y).toBe(2034);
  });

  it("ricade su dieci anni per i tipi sconosciuti", () => {
    const out = generateDocs([{ label: "Badge", expires: "2030-01-01" }], birth, horizon);
    expect(out[1]?.end?.y).toBe(2040);
  });

  it("copre la finestra di validità, non solo la scadenza", () => {
    const out = generateDocs(
      [{ label: "Passaporto", type: "passaporto", expires: "2030-06-14" }], birth, horizon);
    expect(out[0]?.start.y).toBe(2020);
    expect(out[0]?.end?.y).toBe(2030);
  });

  it("mette ogni documento sulla corsia `doc`", () => {
    const out = generateDocs([{ label: "X", expires: "2030-01-01" }], birth, horizon);
    expect(out.every(p => p.track === "doc" && p.generated)).toBe(true);
  });

  it("solleva su un documento senza scadenza", () => {
    expect(() => generateDocs([{ label: "X" }], birth, horizon)).toThrow(/expires/);
  });

  it("non produce nulla senza documenti", () => {
    expect(generateDocs(undefined, birth, horizon)).toHaveLength(0);
    expect(generateDocs([], birth, horizon)).toHaveLength(0);
  });
});

describe("isDocType", () => {
  it("riconosce solo i tipi con regole note", () => {
    expect(isDocType("patente")).toBe(true);
    expect(isDocType("tessera")).toBe(false);
  });
});
