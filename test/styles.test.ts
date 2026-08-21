/**
 * Il CSS è l'unica cosa rimasta a legare fra loro moduli altrimenti
 * indipendenti: senza un presidio, una classe rinominata in TypeScript lascia
 * dietro di sé una regola morta che nessun compilatore segnala.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const SHEETS = [
  "src/styles/tokens.css", "src/styles/base.css", "src/styles/typography.css",
  "src/ui/shell.css", "src/ui/chart.css", "src/ui/tooltip.css",
  "src/ui/dense.css", "src/ui/panels.css", "src/ui/places.css"
];

const read = (p: string) => fs.readFileSync(path.resolve(p), "utf8");
const strip = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const allCss = strip(SHEETS.map(read).join("\n"));

const sources = [
  ...fs.readdirSync("src/core"), ...fs.readdirSync("src/ui"),
  ...fs.readdirSync("src/geo"), ...fs.readdirSync("src/validate")
].length > 0
  ? ["core", "ui", "geo", "validate"]
      .flatMap(d => fs.readdirSync(path.resolve("src", d))
        .filter(f => f.endsWith(".ts"))
        .map(f => read(path.join("src", d, f))))
      .join("\n") + read("index.html")
  : "";

describe("fogli di stile", () => {
  it("esistono tutti", () => {
    for (const s of SHEETS) expect(fs.existsSync(s), s).toBe(true);
  });

  it("non è rimasto un foglio monolitico", () => {
    expect(fs.existsSync("src/styles.css")).toBe(false);
  });

  it("ogni foglio di vista è importato dal suo modulo", () => {
    const pairs: [string, string][] = [
      ["src/ui/chart.ts", "./chart.css"],
      ["src/ui/dense.ts", "./dense.css"],
      ["src/ui/places.ts", "./places.css"],
      ["src/ui/panels.ts", "./panels.css"],
      ["src/ui/tooltip.ts", "./tooltip.css"]
    ];
    for (const [mod, sheet] of pairs) {
      expect(read(mod), mod).toContain(`import "${sheet}"`);
    }
    const main = read("src/ui/main.ts");
    for (const sheet of ["tokens.css", "base.css", "typography.css", "shell.css"]) {
      expect(main, sheet).toContain(sheet);
    }
  });
});

describe("token", () => {
  it("solo `tokens.css` dichiara colori e caratteri", () => {
    for (const sheet of SHEETS) {
      if (sheet.endsWith("tokens.css")) continue;
      const css = strip(read(sheet));
      // I colori letterali ammessi sono quelli con alfa o interni all'SVG,
      // dichiarati caso per caso: qui si vieta solo il ritorno dei token.
      const hex = css.match(/#[0-9a-fA-F]{6}\b/g) ?? [];
      expect(hex.length, sheet + " usa colori esadecimali: " + hex.join(" "))
        .toBeLessThanOrEqual(3);
    }
  });

  it("non lascia riferimenti a variabili mai definite", () => {
    const defined = new Set([...strip(read("src/styles/tokens.css"))
      .matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]!));
    // Misurate a runtime da `measureChrome`, non dichiarate nei token.
    defined.add("--headh");
    defined.add("--navh");
    const used = new Set([...allCss.matchAll(/var\((--[\w-]+)/g)].map(m => m[1]!));
    for (const v of used) expect(defined.has(v), v + " non è definita").toBe(true);
  });
});

describe("regole vive", () => {
  it("ogni classe del CSS compare nel sorgente", () => {
    const classes = new Set([...allCss.matchAll(/\.([a-zA-Z][\w-]*)/g)].map(m => m[1]!));
    const morte = [...classes].filter(c =>
      !new RegExp(`["'\\s.]${c}["'\\s.]`).test(sources));
    expect(morte, "classi senza uso: " + morte.join(" ")).toEqual([]);
  });

  it("ogni id del CSS esiste nel markup", () => {
    const html = read("index.html");
    const ids = [...allCss.matchAll(/#([a-zA-Z][\w-]*)/g)]
      .map(m => m[1]!)
      // I colori esadecimali hanno la stessa forma di un selettore di id.
      .filter(x => !/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$|^[0-9a-fA-F]{8}$/.test(x));
    expect(new Set(ids).size).toBeGreaterThanOrEqual(4);   // tip, drawer, msg, diags…
    for (const id of new Set(ids)) expect(html, "#" + id).toContain(`id="${id}"`);
  });
});

describe("cascata", () => {
  // Regressione: `.geoctl .btn` sovrascriveva lo sfondo di `.btn.on` ma non il
  // colore, e il pulsante acceso risultava chiaro su chiaro — sembrava senza
  // testo. Chi ridefinisce lo sfondo di un pulsante deve dire cosa succede
  // allo stato acceso.
  it("chi ridefinisce lo sfondo dei pulsanti tratta anche lo stato acceso", () => {
    const rules = [...allCss.matchAll(/([^{}]*\.btn[^{},]*)\{([^}]*)\}/g)];
    for (const [, selector, body] of rules) {
      const sel = selector!.trim();
      if (!/background/.test(body!)) continue;
      if (/\.on\b/.test(sel) || /:not\(\.on\)/.test(sel)) continue;
      // Un selettore discendente che colora lo sfondo dei pulsanti generici
      // deve escludere lo stato acceso o ridefinirlo altrove.
      if (/\s\.btn$/.test(sel)) {
        expect(allCss, sel + " non dice cosa fare con .btn.on")
          .toMatch(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\.on\\{"));
      }
    }
  });
});

describe("artefatto", () => {
  it("inlinea il CSS senza foglio esterno", () => {
    const html = read("dist/prospettiva.html");
    expect(html).toMatch(/<style/);
    expect(html).not.toMatch(/<link[^>]+stylesheet/i);
    expect(html).toContain("--paper");
  });

  it("conserva la proprietà che regge il disegno della carta", () => {
    // Senza `non-scaling-stroke` gli spessori si moltiplicano per la scala
    // del gruppo, ~66: la costa diventa un blocco pieno.
    const html = read("dist/prospettiva.html");
    expect(html).toContain("non-scaling-stroke");
  });
});
