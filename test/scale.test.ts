/**
 * La scala si cambia da un comando esplicito, non da un gesto: la pinch
 * dipendeva dal fatto che il browser rispettasse `touch-action`, e quando non
 * lo fa il codice non può rimediare. Qui si verifica la matematica; il
 * pannello è verificato sull'artefatto.
 */
import { describe, expect, it } from "vitest";
import { MAX_PPY, MIN_PPY, PRESETS, clampPpy, fitPpy, step } from "../src/ui/scale.js";

describe("clampPpy", () => {
  it("tiene la scala dentro gli estremi", () => {
    expect(clampPpy(1)).toBe(MIN_PPY);
    expect(clampPpy(9999)).toBe(MAX_PPY);
    expect(clampPpy(30)).toBe(30);
  });
});

describe("step", () => {
  it("procede in progressione geometrica, come la percezione", () => {
    const a = step(20, 1);
    const b = step(a, 1);
    expect(a / 20).toBeCloseTo(b / a, 6);
  });

  it("è reversibile", () => {
    expect(step(step(30, 1), -1)).toBeCloseTo(30, 6);
  });

  it("non esce dagli estremi", () => {
    let v = MIN_PPY;
    for (let i = 0; i < 40; i++) v = step(v, -1);
    expect(v).toBe(MIN_PPY);
    for (let i = 0; i < 40; i++) v = step(v, 1);
    expect(v).toBe(MAX_PPY);
  });
});

describe("fitPpy", () => {
  it("fa entrare l'arco nella larghezza disponibile", () => {
    // 140 anni in 1400 pixel: dieci pixel per anno.
    expect(fitPpy(140, 1400)).toBe(10);
  });

  it("resta dentro gli estremi anche con archi assurdi", () => {
    expect(fitPpy(10000, 800)).toBe(MIN_PPY);
    expect(fitPpy(2, 4000)).toBe(MAX_PPY);
  });

  it("regge misure mancanti invece di produrre NaN", () => {
    expect(fitPpy(0, 800)).toBe(MIN_PPY);
    expect(fitPpy(140, 0)).toBe(MIN_PPY);
  });
});

describe("presets", () => {
  it("coprono l'arco dal secolo al mese", () => {
    expect(PRESETS.length).toBeGreaterThanOrEqual(3);
    expect(PRESETS.some(p => p.ppy === "fit")).toBe(true);
    const numerici = PRESETS.map(p => p.ppy).filter((p): p is number => typeof p === "number");
    expect(Math.min(...numerici)).toBeLessThan(20);
    expect(Math.max(...numerici)).toBeGreaterThan(60);
  });

  it("sono ordinati dal più largo al più stretto", () => {
    const numerici = PRESETS.map(p => p.ppy).filter((p): p is number => typeof p === "number");
    expect(numerici).toEqual([...numerici].sort((a, b) => a - b));
  });

  it("stanno tutti dentro gli estremi", () => {
    for (const p of PRESETS) {
      if (typeof p.ppy === "number") {
        expect(p.ppy, p.label).toBeGreaterThanOrEqual(MIN_PPY);
        expect(p.ppy, p.label).toBeLessThanOrEqual(MAX_PPY);
      }
    }
  });

  it("spiegano cosa fanno, non come si chiamano", () => {
    for (const p of PRESETS) expect(p.hint.length, p.label).toBeGreaterThan(10);
  });
});
