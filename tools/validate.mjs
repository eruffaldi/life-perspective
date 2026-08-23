/**
 * Valida un file di dati con lo stesso validatore che gira nell'applicazione.
 *
 * Le regole non sono duplicate: si importano dal sorgente TypeScript tramite
 * vite-node, così riga di comando e interfaccia non possono divergere.
 *
 *   npm run validate -- miei-dati.json
 */
import fs from "node:fs";
import path from "node:path";
import { createServer } from "vite";

const ROOT = path.resolve(import.meta.dirname, "..");
const file = process.argv[2];

if (!file) {
  console.error("uso: node tools/validate.mjs <file.json>");
  process.exit(2);
}
if (!fs.existsSync(file)) {
  console.error("file non trovato: " + file);
  process.exit(2);
}

// `noDiscovery` evita che esbuild scandagli le dipendenze: qui serve solo
// caricare un modulo, e la scansione emette rumore sui percorsi con .js.
const server = await createServer({
  root: ROOT,
  appType: "custom",
  logLevel: "error",
  server: { middlewareMode: true },
  optimizeDeps: { noDiscovery: true, include: [] }
});
const { validate } = await server.ssrLoadModule("/src/validate/validate.ts");
await server.close();

const text = fs.readFileSync(file, "utf8");
let data;
try {
  data = JSON.parse(text);
} catch (e) {
  const at = /position (\d+)/.exec(e.message);
  const line = at ? text.slice(0, Number(at[1])).split("\n").length : null;
  console.error(`E000  ${file}${line ? ":" + line : ""}  JSON non valido`);
  console.error(`      ${e.message}`);
  process.exit(1);
}

const diags = validate(data);
const errors = diags.filter(d => d.level === "error");
const warnings = diags.filter(d => d.level === "warning");

for (const d of errors.concat(warnings)) {
  const colour = d.level === "error" ? "\x1b[31m" : "\x1b[33m";
  console.log(`${colour}${d.code}\x1b[0m  ${d.path || "(radice)"}`);
  console.log(`      ${d.message}`);
  if (d.hint) console.log(`      \x1b[2m${d.hint}\x1b[0m`);
}

if (!diags.length) console.log(`\x1b[32mok\x1b[0m    ${file}: nessun problema rilevato.`);
else console.log(`\n${errors.length} errori, ${warnings.length} avvisi.`);

process.exit(errors.length ? 1 : 0);
