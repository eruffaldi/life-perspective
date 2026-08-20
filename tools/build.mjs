/**
 * Costruisce l'artefatto finale: un solo file HTML, senza riferimenti esterni.
 *
 * L'unico passo di build e' l'iniezione della base cartografica generata
 * (src/coast.json) al posto del segnaposto __COAST__. Non c'e' bundler:
 * il sorgente e' gia' un file singolo e non ha dipendenze a runtime.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "src", "index.html");
const COAST = path.join(ROOT, "src", "coast.json");
const OUT_DIR = path.join(ROOT, "dist");
const OUT = path.join(OUT_DIR, "prospettiva.html");

function fail(msg) {
  console.error("build: " + msg);
  process.exit(1);
}

if (!fs.existsSync(COAST)) fail("manca src/coast.json — esegui `make coast`");

const html = fs.readFileSync(SRC, "utf8");
const coast = fs.readFileSync(COAST, "utf8").trim();

if (!html.includes("__COAST__")) fail("segnaposto __COAST__ non trovato in src/index.html");

// La costa e' codificata in polilinee: il separatore fra tratti deve restare
// fuori dall'alfabeto 63..126, altrimenti lo split spezza le linee a meta'.
const parsed = JSON.parse(coast);
for (const layer of [parsed.world, parsed.euro]) {
  for (const key of ["all", "border"]) {
    for (const seg of layer[key].split(";")) {
      if (/[^\x3F-\x7E]/.test(seg)) fail("separatore in collisione con la codifica polyline");
    }
  }
}

let out = html.replace("__COAST__", () => coast);

// Autosufficienza: nessun riferimento di rete, nessuna risorsa esterna.
const external = out.match(/(?:src|href)\s*=\s*["']https?:\/\/[^"']+/gi);
if (external) fail("riferimenti esterni nell'artefatto:\n  " + external.join("\n  "));
if (/@import\s+url\(/i.test(out)) fail("@import di font o CSS esterni");
if (out.includes("__COAST__")) fail("segnaposto non sostituito");

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, out);

const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
console.log(`build: dist/prospettiva.html — ${kb} KB, autosufficiente`);
