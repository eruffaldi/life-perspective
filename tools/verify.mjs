/**
 * Verifica di autosufficienza dell'artefatto, ed e' un cancello di build:
 * un riferimento di rete e' un bug, non un compromesso.
 * Rinomina anche l'uscita di Vite nel nome con cui si distribuisce.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = path.resolve(import.meta.dirname, "..");
// Due uscite dallo stesso bundle, per due modi di vivere:
//   index.html        servito da GitHub Pages, installabile come PWA
//   prospettiva.html  autosufficiente, da aprire con un doppio clic
const DIST = path.join(ROOT, "dist");
const PAGE = path.join(DIST, "index.html");
const STANDALONE = path.join(DIST, "prospettiva.html");

function fail(msg) {
  console.error("verify: " + msg);
  process.exit(1);
}

if (!fs.existsSync(PAGE)) fail("nessun artefatto in dist/");

let html = fs.readFileSync(PAGE, "utf8");

// Il bundle e' IIFE: l'attributo `type="module"` residuo impedirebbe
// l'esecuzione da file:// in Chrome. Si toglie qui, e si verifica che non
// siano rimaste `import`/`export` di livello superiore.
html = html.replace(/<script\b[^>]*\btype="module"[^>]*>/g, "<script>");
if (/\btype=["']module["']/.test(html)) fail('resta uno script type="module"');
if (/^\s*(import|export)\s/m.test(html.replace(/<style[\s\S]*?<\/style>/g, ""))) {
  fail("sintassi di modulo nell'artefatto: il bundle non e' IIFE");
}

const external = html.match(/(?:src|href)\s*=\s*["']https?:\/\/[^"']+/gi);
if (external) fail("riferimenti esterni nell'artefatto:\n  " + external.join("\n  "));
if (/@import\s+url\(/i.test(html)) fail("@import di font o CSS esterni");
if (/<script[^>]+\bsrc=/i.test(html)) fail("script non inlineato");
if (/<link[^>]+rel=["']?stylesheet/i.test(html)) fail("foglio di stile non inlineato");

// L'alfabeto della codifica polyline occupa i caratteri 63..126: il
// separatore fra tratti deve restare fuori da quell'intervallo.
const coast = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "data", "coast.json"), "utf8"));
for (const layer of [coast.world, coast.euro]) {
  for (const key of ["all", "border"]) {
    for (const seg of layer[key].split(";")) {
      if (/[^\x3F-\x7E]/.test(seg)) fail("separatore in collisione con la codifica polyline");
    }
  }
}

// Il file autosufficiente non deve rimandare a nulla: niente manifest, che
// da file:// sarebbe solo un 404 nella console.
fs.writeFileSync(STANDALONE, html);

// La copia ospitata dichiara manifest e colore di tema.
const head = `<link rel="manifest" href="manifest.webmanifest">` +
             `<meta name="theme-color" content="#0D2B3A">` +
             `<meta name="apple-mobile-web-app-capable" content="yes">` +
             `<meta name="apple-mobile-web-app-status-bar-style" content="default">` +
             `<link rel="apple-touch-icon" href="icons/icon-192.png">`;
fs.writeFileSync(PAGE, html.replace("</head>", head + "</head>"));

// La cache del service worker prende il nome dall'impronta dell'artefatto:
// cambia l'artefatto, cambia la cache, il precarico si rifà da solo.
const build = crypto.createHash("sha256").update(html).digest("hex").slice(0, 12);
const swPath = path.join(DIST, "sw.js");
if (!fs.existsSync(swPath)) fail("manca dist/sw.js — public/sw.js non è stato copiato");
const sw = fs.readFileSync(swPath, "utf8");
if (!sw.includes("__BUILD__")) fail("segnaposto di build non trovato in sw.js");
// Sostituzione globale: una `replace` semplice colpirebbe la prima occorrenza,
// e basterebbe una menzione in un commento per lasciare il segnaposto nella
// costante — la cache non cambierebbe mai nome e gli aggiornamenti non
// arriverebbero.
const patched = sw.replaceAll("__BUILD__", build);
if (patched.includes("__BUILD__")) fail("segnaposto di build non sostituito");
fs.writeFileSync(swPath, patched);

for (const required of ["manifest.webmanifest", "icons/icon-192.png",
                        "icons/icon-512.png", "icons/icon-maskable-512.png"]) {
  if (!fs.existsSync(path.join(DIST, required))) fail("manca dist/" + required);
}

const kb = (fs.statSync(STANDALONE).size / 1024).toFixed(0);
console.log(`verify: dist/prospettiva.html — ${kb} KB, autosufficiente`);
console.log(`verify: dist/index.html + sw.js (build ${build}) — pronto per Pages`);
