import { describe, expect, it } from "vitest";
import { LINE_SEPARATOR, decodeLines, isEncodingSafe, merc } from "../src/geo/projection.js";
import { COAST } from "../src/data/coast.js";

describe("merc", () => {
  it("mette l'equatore a zero", () => {
    expect(merc(0, 12)[1]).toBeCloseTo(0, 6);
    expect(merc(0, 12)[0]).toBe(12);
  });

  it("dilata alle alte latitudini", () => {
    expect(merc(60, 0)[1]).toBeGreaterThan(60);
    expect(merc(-45, 0)[1]).toBeLessThan(0);
  });

  it("taglia ai poli invece di divergere", () => {
    expect(Number.isFinite(merc(90, 0)[1])).toBe(true);
    expect(merc(90, 0)[1]).toBe(merc(85, 0)[1]);
  });

  it("è monotona in latitudine", () => {
    expect(merc(45, 0)[1]).toBeGreaterThan(merc(44, 0)[1]);
  });
});

describe("decodeLines", () => {
  it("restituisce nulla su stringa vuota", () => {
    expect(decodeLines("")).toEqual([]);
  });

  it("ricostruisce coordinate plausibili dal livello europeo", () => {
    const lines = decodeLines(COAST.euro.all);
    expect(lines.length).toBeGreaterThan(300);
    let lonMin = Infinity, lonMax = -Infinity, latMin = Infinity, latMax = -Infinity;
    for (const line of lines) {
      for (const [lon, lat] of line) {
        lonMin = Math.min(lonMin, lon); lonMax = Math.max(lonMax, lon);
        latMin = Math.min(latMin, lat); latMax = Math.max(latMax, lat);
      }
    }
    // Il riquadro dichiarato, con la tolleranza della semplificazione.
    expect(lonMin).toBeGreaterThan(-12);
    expect(lonMax).toBeLessThan(41);
    expect(latMin).toBeGreaterThan(29);
    expect(latMax).toBeLessThan(61);
  });

  it("tiene le latitudini del mondo dentro i limiti fisici", () => {
    for (const line of decodeLines(COAST.world.all)) {
      for (const [, lat] of line) {
        expect(lat).toBeGreaterThanOrEqual(-90.1);
        expect(lat).toBeLessThanOrEqual(90.1);
      }
    }
  });

  it("non produce tratti degeneri", () => {
    expect(decodeLines(COAST.euro.border).every(l => l.length >= 2)).toBe(true);
  });
});

describe("codifica delle polilinee", () => {
  // Regressione: `|` è il carattere 124, dentro l'alfabeto 63..126. Usarlo
  // come separatore spezzava i tratti e produceva geometria assurda.
  it("usa un separatore fuori dall'alfabeto", () => {
    const code = LINE_SEPARATOR.charCodeAt(0);
    expect(code < 63 || code > 126).toBe(true);
  });

  it("verifica che i dati incorporati siano codificati in modo sicuro", () => {
    for (const layer of [COAST.world, COAST.euro]) {
      expect(isEncodingSafe(layer.all)).toBe(true);
      expect(isEncodingSafe(layer.border)).toBe(true);
    }
  });

  it("intercetta un separatore che cadrebbe nell'alfabeto", () => {
    expect(isEncodingSafe("abc\u0001def")).toBe(false);
  });
});
