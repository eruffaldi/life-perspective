/**
 * La matematica dei gesti della carta, senza browser. Vale per il trascinamento
 * e per la pinch sull'elemento che non scorre; sulle viste a scorrimento i
 * gesti sono stati tolti in favore di un comando esplicito — `scale.ts`.
 */
import { describe, expect, it } from "vitest";
import { GestureTracker, wheelFactor, type Point } from "../src/ui/gestures.js";

interface Recorder {
  pans: [number, number][];
  zooms: { factor: number; centre: Point }[];
  taps: Point[];
}

function tracker(startTime = 0) {
  const rec: Recorder = { pans: [], zooms: [], taps: [] };
  let clock = startTime;
  const t = new GestureTracker({
    onPan: (dx, dy) => rec.pans.push([dx, dy]),
    onZoom: (factor, centre) => rec.zooms.push({ factor, centre }),
    onTap: at => rec.taps.push(at)
  }, () => clock);
  return { t, rec, tick: (ms: number) => { clock += ms; } };
}

describe("trascinamento con un dito", () => {
  it("riporta lo spostamento incrementale", () => {
    const { t, rec } = tracker();
    t.down(1, { x: 100, y: 100 });
    t.move(1, { x: 110, y: 95 });
    t.move(1, { x: 115, y: 95 });
    t.up(1);
    expect(rec.pans).toEqual([[10, -5], [5, 0]]);
    expect(rec.zooms).toEqual([]);
  });

  it("ignora i movimenti di un puntatore mai sceso", () => {
    const { t, rec } = tracker();
    t.move(9, { x: 10, y: 10 });
    expect(rec.pans).toEqual([]);
  });

  it("non emette spostamenti nulli", () => {
    const { t, rec } = tracker();
    t.down(1, { x: 5, y: 5 });
    t.move(1, { x: 5, y: 5 });
    t.up(1);
    expect(rec.pans).toEqual([]);
  });
});

describe("tap", () => {
  it("riconosce un tocco secco", () => {
    const { t, rec, tick } = tracker();
    t.down(1, { x: 40, y: 60 });
    tick(90);
    t.up(1);
    expect(rec.taps).toEqual([{ x: 40, y: 60 }]);
  });

  it("tollera il tremolio del dito", () => {
    const { t, rec } = tracker();
    t.down(1, { x: 40, y: 60 });
    t.move(1, { x: 43, y: 62 });
    t.up(1);
    expect(rec.taps).toHaveLength(1);
  });

  it("non è un tap se il dito è andato lontano", () => {
    const { t, rec } = tracker();
    t.down(1, { x: 40, y: 60 });
    t.move(1, { x: 80, y: 60 });
    t.up(1);
    expect(rec.taps).toEqual([]);
  });

  it("non è un tap se il dito è rimasto giù a lungo", () => {
    const { t, rec, tick } = tracker();
    t.down(1, { x: 40, y: 60 });
    tick(900);
    t.up(1);
    expect(rec.taps).toEqual([]);
  });

  it("non è un tap se è arrivato un secondo dito", () => {
    const { t, rec } = tracker();
    t.down(1, { x: 40, y: 60 });
    t.down(2, { x: 140, y: 60 });
    t.up(2);
    t.up(1);
    expect(rec.taps).toEqual([]);
  });
});

describe("pinch", () => {
  it("allarga quando le dita si allontanano", () => {
    const { t, rec } = tracker();
    t.down(1, { x: 100, y: 100 });
    t.down(2, { x: 200, y: 100 });      // distanza 100
    t.move(2, { x: 300, y: 100 });      // distanza 200
    expect(rec.zooms).toHaveLength(1);
    expect(rec.zooms[0]!.factor).toBeCloseTo(2, 6);
  });

  it("stringe quando si avvicinano", () => {
    const { t, rec } = tracker();
    t.down(1, { x: 100, y: 100 });
    t.down(2, { x: 300, y: 100 });
    t.move(2, { x: 200, y: 100 });
    expect(rec.zooms[0]!.factor).toBeCloseTo(0.5, 6);
  });

  it("zooma attorno al centro fra le dita", () => {
    const { t, rec } = tracker();
    t.down(1, { x: 100, y: 100 });
    t.down(2, { x: 200, y: 200 });
    t.move(2, { x: 300, y: 300 });
    expect(rec.zooms[0]!.centre).toEqual({ x: 200, y: 200 });
  });

  it("tratta lo spostamento del centro come una traslazione", () => {
    const { t, rec } = tracker();
    t.down(1, { x: 100, y: 100 });
    t.down(2, { x: 200, y: 100 });
    // Entrambe le dita si spostano di 50 senza cambiare distanza. Gli eventi
    // però arrivano un puntatore alla volta, quindi fra i due la distanza
    // cambia davvero: lo zoom oscilla e si compensa. È il netto a contare.
    t.move(1, { x: 150, y: 100 });
    t.move(2, { x: 250, y: 100 });
    const spostamento = rec.pans.reduce((a, [dx]) => a + dx, 0);
    expect(spostamento).toBeCloseTo(50, 6);
    const zoomNetto = rec.zooms.reduce((a, z) => a * z.factor, 1);
    expect(zoomNetto).toBeCloseTo(1, 9);
  });

  it("non salta la vista quando si alza un dito solo", () => {
    const { t, rec } = tracker();
    t.down(1, { x: 100, y: 100 });
    t.down(2, { x: 200, y: 100 });
    t.move(2, { x: 240, y: 100 });
    const prima = rec.pans.length;
    t.up(2);
    t.move(1, { x: 105, y: 100 });
    expect(rec.pans.length).toBe(prima + 1);
    expect(rec.pans[rec.pans.length - 1]).toEqual([5, 0]);
  });
});

describe("stato", () => {
  it("conta i puntatori attivi", () => {
    const { t } = tracker();
    expect(t.active).toBe(0);
    t.down(1, { x: 0, y: 0 });
    t.down(2, { x: 1, y: 1 });
    expect(t.active).toBe(2);
    t.up(1);
    expect(t.active).toBe(1);
  });

  it("si azzera su annullamento", () => {
    const { t, rec } = tracker();
    t.down(1, { x: 0, y: 0 });
    t.cancel();
    t.up(1);
    expect(t.active).toBe(0);
    expect(rec.taps).toEqual([]);
  });
});

describe("wheelFactor", () => {
  it("allarga verso l'alto e stringe verso il basso", () => {
    expect(wheelFactor(-100)).toBeGreaterThan(1);
    expect(wheelFactor(100)).toBeLessThan(1);
    expect(wheelFactor(0)).toBe(1);
  });

  it("è simmetrico: un colpo avanti e uno indietro tornano al punto", () => {
    expect(wheelFactor(120) * wheelFactor(-120)).toBeCloseTo(1, 9);
  });
});
