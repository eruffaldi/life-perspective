import { describe, expect, it } from "vitest";
import { KEY_SUFFIX, locate, scanJSON } from "../src/validate/scan.js";
import { SAMPLE } from "../src/data/sample.js";

const text = JSON.stringify(SAMPLE, null, 2);
const pos = scanJSON(text);
const slice = (path: string) => {
  const at = pos.get(path);
  return at ? text.slice(at[0], at[1]) : null;
};

describe("scanJSON", () => {
  it("localizza un valore in profondità", () => {
    expect(slice("people[0].birth")).toBe('"1977-03-09"');
    expect(slice("people[2].school.through")).toBe('"bachelor"');
  });

  it("localizza dentro le liste", () => {
    expect(slice("events[0].who[1]")).toBe('"davide"');
  });

  it("distingue la chiave dal valore", () => {
    const key = pos.get("people[0].birth" + KEY_SUFFIX);
    expect(key).toBeDefined();
    expect(text.slice(key![0], key![1])).toMatch(/^"birth"\s*:\s*"1977-03-09"$/);
  });

  it("copre oggetti e liste interi", () => {
    expect(slice("people[0]")!.startsWith("{")).toBe(true);
    expect(slice("people")!.startsWith("[")).toBe(true);
  });

  it("regge le stringhe con caratteri di escape", () => {
    const p = scanJSON('{"a":"con \\"apici\\" dentro","b":1}');
    expect(p.get("b")).toBeDefined();
  });

  it("regge oggetti e liste vuoti", () => {
    const p = scanJSON('{"a":{},"b":[],"c":3}');
    expect(p.get("c")).toBeDefined();
  });

  it("non solleva su testo malformato", () => {
    expect(() => scanJSON("{ non json")).not.toThrow();
  });

  it("gestisce la formattazione compatta", () => {
    const compact = JSON.stringify(SAMPLE);
    const p = scanJSON(compact);
    const at = p.get("people[0].birth");
    expect(compact.slice(at![0], at![1])).toBe('"1977-03-09"');
  });
});

describe("locate", () => {
  it("trova il percorso esatto quando esiste", () => {
    expect(locate(pos, "people[0].birth")).toEqual(pos.get("people[0].birth" + KEY_SUFFIX));
  });

  it("risale al genitore quando il campo manca", () => {
    const at = locate(pos, "people[0].inesistente");
    expect(at).toEqual(pos.get("people[0]" + KEY_SUFFIX) ?? pos.get("people[0]"));
  });

  it("risale anche da un indice di lista", () => {
    expect(locate(pos, "people[99]")).not.toBeNull();
  });

  it("restituisce null se non c'è proprio nulla", () => {
    expect(locate(new Map(), "qualsiasi")).toBeNull();
  });
});
