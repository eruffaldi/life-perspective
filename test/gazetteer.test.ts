import { describe, expect, it } from "vitest";
import { GAZETTEER, resolvePlace } from "../src/geo/gazetteer.js";

describe("GAZETTEER", () => {
  it("ha coordinate plausibili ovunque", () => {
    for (const [name, [lat, lon]] of Object.entries(GAZETTEER)) {
      expect(lat, name).toBeGreaterThanOrEqual(-90);
      expect(lat, name).toBeLessThanOrEqual(90);
      expect(lon, name).toBeGreaterThanOrEqual(-180);
      expect(lon, name).toBeLessThanOrEqual(180);
    }
  });

  it("copre le città usate dai dati d'esempio", () => {
    for (const city of ["Milano", "Bologna", "Siena", "Padova", "Lerici", "Barcellona"]) {
      expect(GAZETTEER[city], city).toBeDefined();
    }
  });
});

describe("resolvePlace", () => {
  const dict = { Bologna: [1, 2] as const, "Università di Bologna": [3, 4] as const };

  it("dà la precedenza all'elenco dell'utente", () => {
    expect(resolvePlace("Bologna", dict)?.coord[0]).toBe(1);
    expect(resolvePlace("Bologna", dict)?.src).toBe("dal tuo elenco");
  });

  it("ricade sul repertorio", () => {
    expect(resolvePlace("Roma", dict)?.src).toBe("dal repertorio");
  });

  it("preferisce il nome esatto alla deduzione", () => {
    expect(resolvePlace("Università di Bologna", dict)?.coord[0]).toBe(3);
  });

  it("deduce la città contenuta nel nome", () => {
    const r = resolvePlace("Ospedale di Bergamo", null);
    expect(r?.src).toMatch(/^dedotto da Bergamo/);
  });

  it("sceglie la corrispondenza più lunga", () => {
    const r = resolvePlace("Porto Santo Stefano marina", null);
    expect(r?.src).toContain("Porto Santo Stefano");
  });

  it("restituisce null su nomi sconosciuti", () => {
    expect(resolvePlace("Contrada Fantasia", null)).toBeNull();
    expect(resolvePlace("", null)).toBeNull();
    expect(resolvePlace(null, null)).toBeNull();
  });

  it("non deduce da un nome più corto della chiave", () => {
    expect(resolvePlace("Roma", { Romagna: [1, 2] })?.src).toBe("dal repertorio");
  });
});
