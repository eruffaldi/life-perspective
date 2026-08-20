/**
 * Valida un file JSON con lo stesso validatore che gira nell'applicazione.
 *
 * Le regole non sono duplicate: si estraggono da dist/prospettiva.html, cosi'
 * la riga di comando e l'interfaccia non possono divergere.
 *
 *   node tools/validate.mjs miei-dati.json
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { JSDOM } from "jsdom";

const ROOT = path.resolve(import.meta.dirname, "..");
const ARTIFACT = path.join(ROOT, "dist", "prospettiva.html");

const file = process.argv[2];
if (!file) {
  console.error("uso: node tools/validate.mjs <file.json>");
  process.exit(2);
}
if (!fs.existsSync(ARTIFACT)) {
  console.error("manca dist/prospettiva.html — esegui `make build`");
  process.exit(2);
}

const html = fs.readFileSync(ARTIFACT, "utf8");
const script = html.split("<script>")[1].split("</script>")[0];
const ctx = {
  console, Math, JSON, Object, Array, String, Number, Set, Map, Date, Infinity, isNaN,
  document: new JSDOM(html).window.document,
  window: {}, addEventListener() {}, requestAnimationFrame() {},
  module: { exports: {} }
};
vm.createContext(ctx);
try { vm.runInContext(script, ctx); } catch { /* il boot non serve qui */ }
const { validate } = ctx.module.exports;

const text = fs.readFileSync(file, "utf8");
let data;
try {
  data = JSON.parse(text);
} catch (e) {
  const at = /position (\d+)/.exec(e.message);
  const line = at ? text.slice(0, +at[1]).split("\n").length : null;
  console.error(`E000  ${file}${line ? ":" + line : ""}  JSON non valido`);
  console.error(`      ${e.message}`);
  process.exit(1);
}

const diags = validate(data);
const errors = diags.filter(d => d.level === "error");
const warns = diags.filter(d => d.level === "warning");

for (const d of errors.concat(warns)) {
  const tag = d.level === "error" ? "\x1b[31m" + d.code + "\x1b[0m" : "\x1b[33m" + d.code + "\x1b[0m";
  console.log(`${tag}  ${d.path || "(radice)"}`);
  console.log(`      ${d.message}`);
  if (d.hint) console.log(`      \x1b[2m${d.hint}\x1b[0m`);
}

if (!diags.length) console.log(`\x1b[32mok\x1b[0m    ${file}: nessun problema rilevato.`);
else console.log(`\n${errors.length} errori, ${warns.length} avvisi.`);

process.exit(errors.length ? 1 : 0);
