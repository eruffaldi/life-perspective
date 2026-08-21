/**
 * Un solo algoritmo per tre consumatori: marcatori, barre e pin della carta.
 * Prima erano tre criteri diversi, e due sbagliavano in entrambe le direzioni
 * — nascondevano scritte senza motivo e ne lasciavano accavallare altre.
 */
import { describe, expect, it } from "vitest";
import { estimateWidth, labelBox, placeLabels, type Box } from "../src/ui/labels.js";

const box = (x0: number, x1: number, y0 = 0, y1 = 10): Box => ({ x0, x1, y0, y1 });

describe("placeLabels", () => {
  it("colloca tutto quando c'è spazio", () => {
    const visible = placeLabels([
      { item: "a", box: box(0, 40), priority: 1 },
      { item: "b", box: box(60, 100), priority: 1 }
    ]);
    expect([...visible].sort()).toEqual(["a", "b"]);
  });

  it("scarta chi si accavalla", () => {
    const visible = placeLabels([
      { item: "a", box: box(0, 60), priority: 1 },
      { item: "b", box: box(50, 100), priority: 2 }
    ]);
    expect([...visible]).toEqual(["b"]);
  });

  it("dà la precedenza all'importanza, non all'ordine", () => {
    const visible = placeLabels([
      { item: "primo", box: box(0, 60), priority: 1 },
      { item: "importante", box: box(10, 70), priority: 9 }
    ]);
    expect([...visible]).toEqual(["importante"]);
  });

  it("non fa collidere chi sta su righe diverse", () => {
    const visible = placeLabels([
      { item: "sopra", box: box(0, 60, 0, 10), priority: 1 },
      { item: "sotto", box: box(0, 60, 20, 30), priority: 1 }
    ]);
    expect(visible.size).toBe(2);
  });

  it("rispetta il margine richiesto", () => {
    const attaccate = [
      { item: "a", box: box(0, 50), priority: 2 },
      { item: "b", box: box(52, 100), priority: 1 }
    ];
    expect(placeLabels(attaccate, 0).size).toBe(2);
    expect(placeLabels(attaccate, 10).size).toBe(1);
  });

  // Il difetto del vecchio criterio: si guardava lo spazio fino all'elemento
  // successivo, quindi un vicino nascosto continuava a occupare posto.
  it("riusa lo spazio lasciato libero da un'etichetta scartata", () => {
    const visible = placeLabels([
      { item: "vince", box: box(0, 30), priority: 5 },
      { item: "scartata", box: box(20, 50), priority: 1 },
      { item: "lontana", box: box(35, 60), priority: 3 }
    ]);
    expect(visible.has("vince")).toBe(true);
    expect(visible.has("scartata")).toBe(false);
    expect(visible.has("lontana")).toBe(true);
  });

  // L'altro difetto: una scritta lunga sborda oltre l'elemento che la segue.
  it("intercetta una scritta che sborda su chi viene dopo", () => {
    const visible = placeLabels([
      { item: "lunghissima", box: box(0, 200), priority: 5 },
      { item: "vicina", box: box(120, 160), priority: 1 }
    ]);
    expect([...visible]).toEqual(["lunghissima"]);
  });

  it("è stabile: stesso ingresso, stessa uscita", () => {
    const items = [
      { item: "a", box: box(0, 60), priority: 1 },
      { item: "b", box: box(50, 110), priority: 1 },
      { item: "c", box: box(100, 160), priority: 1 }
    ];
    const primo = [...placeLabels(items)];
    for (let i = 0; i < 5; i++) expect([...placeLabels(items)]).toEqual(primo);
  });

  it("regge l'elenco vuoto", () => {
    expect(placeLabels([]).size).toBe(0);
  });
});

describe("estimateWidth", () => {
  it("cresce con la lunghezza e con il corpo", () => {
    expect(estimateWidth("ab")).toBeLessThan(estimateWidth("abcdef"));
    expect(estimateWidth("abc", 8)).toBeLessThan(estimateWidth("abc", 16));
  });

  it("stima per eccesso: meglio una scritta in meno che due sovrapposte", () => {
    // Un carattere di corpo 11 in una famiglia proporzionale sta sotto i 7px.
    expect(estimateWidth("m", 11)).toBeGreaterThan(5);
  });
});

describe("labelBox", () => {
  it("mette la scritta a destra del punto, con lo scostamento chiesto", () => {
    const b = labelBox(100, 50, "ciao", 9);
    expect(b.x0).toBe(109);
    expect(b.x1).toBeGreaterThan(b.x0);
  });

  it("centra il rettangolo sulla riga", () => {
    const b = labelBox(0, 50, "x", 0);
    expect((b.y0 + b.y1) / 2).toBeCloseTo(50, 6);
  });
});
