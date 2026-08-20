/**
 * Genera src/coast.json: la base cartografica incorporata nell'artefatto.
 *
 * Origine: Natural Earth via il pacchetto npm `world-atlas` (public domain).
 * Due livelli di dettaglio:
 *   world — tutto il globo, tolleranza grossa, per inquadrature ampie
 *   euro  — Europa e Mediterraneo, tolleranza fine, dove servono le coste vere
 *
 * Ogni tratto e' semplificato con Douglas-Peucker e codificato in polilinee
 * (delta interi, precisione 1e-3 gradi). ATTENZIONE: l'alfabeto della codifica
 * occupa i caratteri 63..126, quindi il separatore fra tratti deve stare
 * fuori da quell'intervallo — `|` (124) ci cade dentro e spezza le linee.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import * as topojson from "topojson-client";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(import.meta.dirname, "..");
const SEP = ";"; // 59: fuori dall'alfabeto della codifica

const LAYERS = {
  world: { file: "countries-50m.json", tol: 0.09, bbox: null },
  euro:  { file: "countries-10m.json", tol: 0.005, bbox: [-11, 30, 40, 60] }
};

/** Douglas-Peucker iterativo, tolleranza in gradi. */
function simplify(pts, tol) {
  const keep = new Array(pts.length).fill(false);
  keep[0] = keep[pts.length - 1] = true;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [i, j] = stack.pop();
    if (j - i < 2) continue;
    const [ax, ay] = pts[i], [bx, by] = pts[j];
    const dx = bx - ax, dy = by - ay, den = Math.hypot(dx, dy) || 1;
    let max = -1, at = -1;
    for (let t = i + 1; t < j; t++) {
      const d = Math.abs(dy * pts[t][0] - dx * pts[t][1] + bx * ay - by * ax) / den;
      if (d > max) { max = d; at = t; }
    }
    if (max > tol) { keep[at] = true; stack.push([i, at], [at, j]); }
  }
  return pts.filter((_, i) => keep[i]);
}

/** Spezza un tratto sui segmenti che escono dal riquadro. */
function clip(line, bb) {
  const out = [];
  let cur = [];
  const inside = p => p[0] >= bb[0] && p[0] <= bb[2] && p[1] >= bb[1] && p[1] <= bb[3];
  for (let i = 0; i < line.length; i++) {
    if (inside(line[i])) {
      if (!cur.length && i > 0) cur.push(line[i - 1]);
      cur.push(line[i]);
    } else if (cur.length) {
      cur.push(line[i]); out.push(cur); cur = [];
    }
  }
  if (cur.length) out.push(cur);
  return out.filter(l => l.length >= 2);
}

function encode(pts, precision = 1000) {
  let out = "", px = 0, py = 0;
  const num = v => {
    v = v < 0 ? ~(v << 1) : (v << 1);
    let s = "";
    while (v >= 0x20) { s += String.fromCharCode((0x20 | (v & 0x1f)) + 63); v >>= 5; }
    return s + String.fromCharCode(v + 63);
  };
  for (const [lon, lat] of pts) {
    const x = Math.round(lon * precision), y = Math.round(lat * precision);
    out += num(x - px) + num(y - py);
    px = x; py = y;
  }
  return out;
}

function buildLayer({ file, tol, bbox }) {
  const topo = JSON.parse(fs.readFileSync(require.resolve("world-atlas/" + file), "utf8"));
  const obj = topo.objects.countries;
  const grab = filter => {
    const m = topojson.mesh(topo, obj, filter);
    return m.type === "MultiLineString" ? m.coordinates : [m.coordinates];
  };
  const process = lines => {
    const out = [];
    for (const line of lines)
      for (const part of (bbox ? clip(line, bbox) : [line])) {
        const s = simplify(part, tol);
        if (s.length >= 2) out.push(s);
      }
    return out;
  };
  const all = process(grab());                       // coste + confini
  const border = process(grab((a, b) => a !== b));   // solo confini interni
  return {
    all: all.map(l => encode(l)).join(SEP),
    border: border.map(l => encode(l)).join(SEP),
    stats: { lines: all.length, points: all.reduce((a, b) => a + b.length, 0) }
  };
}

const world = buildLayer(LAYERS.world);
const euro = buildLayer(LAYERS.euro);

for (const layer of [world, euro])
  for (const key of ["all", "border"])
    for (const seg of layer[key].split(SEP))
      if (/[^\x3F-\x7E]/.test(seg)) {
        console.error("gen-coast: il separatore collide con l'alfabeto della codifica");
        process.exit(1);
      }

const out = {
  world: { all: world.all, border: world.border },
  euro: { bbox: LAYERS.euro.bbox, all: euro.all, border: euro.border }
};
const dest = path.join(ROOT, "src", "coast.json");
fs.writeFileSync(dest, JSON.stringify(out));

console.log(`gen-coast: world ${world.stats.lines} tratti / ${world.stats.points} vertici`);
console.log(`gen-coast: euro  ${euro.stats.lines} tratti / ${euro.stats.points} vertici`);
console.log(`gen-coast: src/coast.json — ${(fs.statSync(dest).size / 1024).toFixed(0)} KB`);
