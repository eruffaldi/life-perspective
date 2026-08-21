import { describe, expect, it } from "vitest";
import { parseDate } from "../src/core/date.js";
import { ageRange, ageShort, ageText, distText } from "../src/core/age.js";
import type { Person } from "../src/core/types.js";

const person = (birth: string, death?: string): Person => ({
  id: "x", name: "X", role: "", birth: parseDate(birth),
  death: death ? parseDate(death) : null, color: "#000",
  periods: [], events: [], shared: [], sharedEvents: [], rows: [], marks: []
});

describe("ageRange", () => {
  it("dà un valore netto quando entrambe le date sono precise", () => {
    const a = ageRange(person("1977-03-09"), parseDate("2002-07-16"));
    expect(a.min).toBe(25);
    expect(a.max).toBe(25);
  });

  it("resta un intervallo quando la nascita è nota solo all'anno", () => {
    const a = ageRange(person("1924"), parseDate("2001-05"));
    expect(a.min).toBe(76);
    expect(a.max).toBe(77);
  });

  it("va in negativo prima della nascita", () => {
    expect(ageRange(person("2012-09-03"), parseDate("2007-06-16")).max).toBeLessThan(0);
  });
});

describe("ageShort", () => {
  const nonna = person("1924", "2001-05");

  it("approssima con il tilde in modalità midpoint", () => {
    expect(ageShort(nonna, parseDate("2001-05"), "midpoint")).toMatch(/^~\d+$/);
  });

  it("mostra gli estremi in modalità range", () => {
    expect(ageShort(nonna, parseDate("2001-05"), "range")).toBe("76–77");
  });

  it("non approssima ciò che è certo", () => {
    expect(ageShort(person("1977-03-09"), parseDate("2002-07-16"), "midpoint")).toBe("25");
  });

  it("distingue chi non è ancora nato da chi non c'è più", () => {
    expect(ageShort(person("2012-09-03"), parseDate("2007-06-16"), "midpoint")).toBe("–");
    expect(ageShort(nonna, parseDate("2026-01-01"), "midpoint")).toBe("†");
  });
});

describe("ageText", () => {
  it("spiega a parole i casi limite", () => {
    expect(ageText(person("2012-09-03"), parseDate("2007"), "midpoint").note)
      .toBe("non ancora nato");
    expect(ageText(person("1924", "2001-05"), parseDate("2026"), "midpoint").note)
      .toBe("non più in vita");
    expect(ageText(person("1977-03-09"), parseDate("2002-07-16"), "midpoint").txt)
      .toBe("25 anni");
  });
});

describe("distText", () => {
  const now = 2026.6;

  it("distingue passato e futuro", () => {
    expect(distText(2044.4, now)).toMatch(/^tra /);
    expect(distText(1989.8, now)).toMatch(/ fa$/);
  });

  it("collassa le distanze minime", () => {
    expect(distText(now + 0.01, now)).toBe("adesso");
  });

  it("usa i mesi sotto l'anno", () => {
    expect(distText(now + 0.25, now)).toMatch(/mesi/);
  });

  it("arrotonda agli anni quando la distanza è grande", () => {
    expect(distText(now + 18.4, now)).toBe("tra 18 anni");
  });

  it("accorda il singolare", () => {
    expect(distText(now + 1.08, now)).toMatch(/1 anno e 1 mese/);
  });
});
