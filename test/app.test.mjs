import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { JSDOM, VirtualConsole } from "jsdom";

const ROOT = path.resolve(import.meta.dirname, "..");
const ARTIFACT = path.join(ROOT, "dist", "prospettiva.html");
if (!fs.existsSync(ARTIFACT)) {
  console.error("test: manca dist/prospettiva.html — esegui `make build`");
  process.exit(1);
}

let pass = 0, fail = 0;
function ok(cond, name, extra) {
  if (cond) { pass++; }
  else { fail++; console.log("  FAIL: " + name + (extra ? "  -> " + extra : "")); }
}
function eq(a, b, name) { ok(a === b, name, JSON.stringify(a) + " != " + JSON.stringify(b)); }

const html = fs.readFileSync(ARTIFACT, "utf8");
const errors = [];
const vc = new VirtualConsole();
vc.on("jsdomError", e => errors.push(e.message));
vc.on("error", (...a) => errors.push(a.map(String).join(" ")));
const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, virtualConsole: vc });
const win = dom.window, doc = win.document;

// contesto separato per estrarre le funzioni pure, senza toccare il DOM sotto test
const sandboxDoc = new JSDOM(html).window.document;
const script = html.split("<script>")[1].split("</script>")[0];
const ctx = { window: win, document: sandboxDoc, module: { exports: {} }, console,
              setTimeout: win.setTimeout, requestAnimationFrame: win.requestAnimationFrame,
              addEventListener: () => {}, innerWidth: 1200, innerHeight: 800, Blob: win.Blob,
              URL: win.URL, FileReader: win.FileReader, Date, Math, JSON, Object, Array, String, Number, Set, Map, Infinity, isNaN };
vm.createContext(ctx);
vm.runInContext(script, ctx);
const API = ctx.module.exports;

console.log("--- date a precisione variabile");
const dY = API.parseDate("1921"), dM = API.parseDate("2001-05"), dD = API.parseDate("2008-07-12");
eq(dY.prec, "y", "1921 -> precisione anno");
eq(dM.prec, "m", "1998-11 -> precisione mese");
eq(dD.prec, "d", "2008-07-12 -> precisione giorno");
eq(dY.t0, 1921, "t0 anno");
eq(dY.t1, 1922, "t1 anno");
ok(Math.abs(dM.t1 - dM.t0 - 1/12) < 0.002, "mese dura ~1/12 di anno");
ok(Math.abs(dD.t1 - dD.t0 - 1/365) < 0.002, "giorno dura ~1/365 di anno");
ok(dD.t0 < dD.mid && dD.mid < dD.t1, "mid dentro l'intervallo");
let threw = false; try { API.parseDate("12/07/2008"); } catch (e) { threw = true; }
ok(threw, "formato non ISO viene rifiutato");

console.log("--- scuola italiana generata");
const anna = { school: { system: "it", through: "bachelor" } };
const g = API.generateSchool(anna, API.parseDate("2012-09-03"));
const stages = Object.fromEntries(g.periods.map(p => [p.key, p]));
eq(stages.primary.start.y, 2018, "Sofia (2012) entra in prima elementare nel 2018");
eq(stages.primary.start.m, 9, "inizio a settembre");
eq(stages.highschool.start.y, 2026, "liceo dal 2026");
eq(stages.highschool.end.y, 2031, "liceo fino al 2031");
eq(stages.highschool.end.m, 6, "fine liceo a giugno");
eq(stages.bachelor.end.y, 2034, "triennale fino al 2034");
ok(!stages.master, "through:bachelor si ferma alla triennale");
const mat = g.events.find(e => e.label === "Maturità");
eq(mat.date.y, 2031, "maturità nel 2031");

console.log("--- through, early, delays");
const marco = API.generateSchool({ school: { through: "highschool" } }, API.parseDate("2016-05-21"));
eq(marco.periods.length, 3, "through:highschool genera 3 cicli");
eq(marco.periods.find(p => p.key === "highschool").end.y, 2035, "Tommaso (2016) matura nel 2035");
const early = API.generateSchool({ school: { early: true, through: "primary" } }, API.parseDate("2012-01-15"));
eq(early.periods[0].start.y, 2017, "anticipo sposta di un anno indietro");
const late = API.generateSchool({ school: { through: "highschool", delays: { middle: 1 } } }, API.parseDate("2012-09-03"));
eq(late.periods.find(p => p.key === "highschool").end.y, 2032, "una bocciatura alle medie sposta la maturità");
eq(late.periods.find(p => p.key === "primary").end.y, 2023, "il ritardo non tocca i cicli precedenti");

console.log("--- replaces: il manuale sovrascrive il generato");
const M = API.build(API.SAMPLE);
const me = M.byId.marta;
const genSchool = me.periods.filter(p => p.generated && p.track === "school");
eq(genSchool.length, 0, "nessuna scuola generata per chi non ha il blocco school");
const anna2 = M.byId.sofia;
ok(anna2.periods.some(p => p.key === "highschool"), "Sofia ha il liceo generato");
const fake = JSON.parse(JSON.stringify(API.SAMPLE));
fake.people[2].periods = [{ label: "Liceo linguistico", start: "2026-09", end: "2031-06", track: "school", replaces: "highschool" }];
const M2 = API.build(fake);
const aSchool = M2.byId.sofia.periods.filter(p => p.track === "school" && p.key === "highschool");
eq(aSchool.length, 0, "il ciclo generato sparisce quando c'e' un replaces");
ok(M2.byId.sofia.periods.some(p => p.label === "Liceo linguistico"), "resta il periodo manuale");
ok(M2.byId.sofia.periods.some(p => p.key === "bachelor"), "gli altri cicli restano generati");

console.log("--- età con precisione mista");
const nonna = M.byId.elsa;
const a1 = API.ageShort(nonna, API.parseDate("2001-05"), "midpoint");
ok(a1.startsWith("~"), "età da anno-di-nascita e' approssimata (" + a1 + ")");
const a2 = API.ageShort(nonna, API.parseDate("2001-05"), "range");
ok(a2.includes("–"), "modalita' range mostra un intervallo (" + a2 + ")");
eq(API.ageShort(me, API.parseDate("2002-07-16"), "midpoint"), "25", "età esatta alla laurea");
eq(API.ageShort(M.byId.sofia, API.parseDate("2007-06-16"), "midpoint"), "–", "non ancora nata al matrimonio");
eq(API.ageShort(nonna, API.parseDate("2026-01-01"), "midpoint"), "†", "non piu' in vita");

console.log("--- eventi condivisi e ricorrenze");
const wed = M.people.find(p => p.id === "marta").sharedEvents.find(e => e.id === "wedding");
ok(wed, "il matrimonio è agganciato a Marta");
ok(M.byId.davide.sharedEvents.some(e => e.id === "wedding"), "e anche a Davide");
eq(wed.recs.length, 3, "tre ricorrenze generate");
eq(wed.recs[0].date.y, 2017, "10 anni -> 2017");
eq(wed.recs[2].date.y, 2057, "50 anni -> 2057");
ok(!M.context.some(e => e.id === "wedding"), "gli eventi con `who` non finiscono nel contesto");
ok(M.context.some(e => e.label === "Caduta del Muro"), "gli eventi senza `who` finiscono nel contesto");

console.log("--- mutuo condiviso");
const mort = M.byId.marta.shared.find(p => p.id === "mortgage");
ok(mort, "il mutuo è agganciato alla prima persona di `who`");
eq(mort.end.y, 2043, "ultima rata nel 2043");
eq(API.ageShort(me, mort.end, "midpoint"), "66", "età all'ultima rata");

console.log("--- distanze");
ok(API.distText(2044.4, 2026.6).startsWith("tra "), "il futuro e' 'tra ...'");
ok(API.distText(1989.8, 2026.6).endsWith(" fa"), "il passato e' '... fa'");

console.log("--- shiftYears preserva la precisione");
eq(API.shiftYears(API.parseDate("1921"), 10), "1931", "shift su anno");
eq(API.shiftYears(API.parseDate("2008-07-12"), 25), "2033-07-12", "shift su giorno");

setTimeout(() => {
console.log("--- rendering");
eq(errors.length, 0, "nessun errore in console al boot: " + errors.join("; "));
const panes = doc.querySelectorAll(".pane");
eq(panes.length, 5, "cinque viste");
const bars = doc.querySelectorAll("#pane-chart .bar");
ok(bars.length > 5, "la cronologia disegna le barre (" + bars.length + ")");
const marks = doc.querySelectorAll("#pane-chart .mk");
ok(marks.length > 5, "la cronologia disegna i marker (" + marks.length + ")");
ok(doc.querySelector("#pane-chart .meridian"), "c'è la linea di oggi");
ok(!doc.querySelector("#pane-chart .bar[style*='width: -']"), "nessuna barra a larghezza negativa");
ok(doc.querySelectorAll("#pane-chart .plabel").length > 5, "colonna nomi popolata");

// cambio vista
doc.querySelector('nav.views button[data-view="dense"]').click();
ok(doc.querySelector("#pane-dense").classList.contains("on"), "la vista anni densi si attiva");
ok(doc.querySelectorAll("#pane-dense .year").length > 0, "gli anni densi producono righe");
doc.querySelector('nav.views button[data-view="matrix"]').click();
ok(doc.querySelectorAll("#pane-matrix table.mx tbody tr").length > 5, "la matrice ha righe");
eq(doc.querySelectorAll("#pane-matrix table.mx thead th").length, 2 + API.SAMPLE.people.length, "colonne = 2 + persone");
doc.querySelector('nav.views button[data-view="ages"]').click();
ok(doc.querySelectorAll("#pane-ages .bar").length > 5, "la vista età allineate disegna le barre");
const axisAges = doc.querySelector("#pane-ages .axishead").textContent;
eq(axisAges, "Età", "asse etichettato Età nella vista allineata");

console.log("--- etichette e prossimi passaggi");
ok(doc.querySelectorAll("#pane-chart .mklab").length > 3, "alcuni marker sono etichettati");
ok(doc.querySelectorAll("#pane-chart .mklab").length <= doc.querySelectorAll("#pane-chart .mk").length,
   "mai piu' etichette che marker");
doc.querySelector('nav.views button[data-view="dense"]').click();
ok(doc.querySelectorAll("#pane-dense .nx").length > 0, "la strip dei prossimi passaggi è popolata");
ok(doc.querySelectorAll("#pane-dense .nx").length <= 6, "al massimo sei prossimi passaggi");
const firstNx = doc.querySelector("#pane-dense .nxdist").textContent;
ok(/^tra |^adesso/.test(firstNx), "il primo passaggio è nel futuro (" + firstNx + ")");
ok(!doc.querySelector("#legend").classList.contains("on"), "la legenda sparisce fuori dal grafico");
doc.querySelector('nav.views button[data-view="chart"]').click();
ok(doc.querySelector("#legend").classList.contains("on"), "e ricompare sul grafico");

// --- filtri ---
(function(){
  const box = doc.querySelector("#filters");
  const labels = [...box.querySelectorAll("label span:first-of-type")].map(x=>x.textContent);
  ok(labels.includes("Vacanze") && labels.includes("Documenti"), "il pannello elenca le nuove corsie");
  const cbs = [...box.querySelectorAll("input[type=checkbox]")];
  const ix = labels.indexOf("Documenti");
  ok(!cbs[ix].checked, "i documenti partono spenti");
  ok(cbs[labels.indexOf("Vacanze")].checked, "le vacanze partono accese");

  doc.querySelector('nav.views button[data-view="chart"]').click();
  const before = doc.querySelectorAll("#pane-chart .bar").length;
  cbs[ix].checked = true; cbs[ix].onchange();
  const after = doc.querySelectorAll("#pane-chart .bar").length;
  ok(after > before, "accendere i documenti aggiunge barre (" + before + " -> " + after + ")");
  cbs[ix].checked = false; cbs[ix].onchange();
  eq(doc.querySelectorAll("#pane-chart .bar").length, before, "spegnerli le toglie di nuovo");

  // le vacanze spariscono da tutte le viste, non solo dal grafico
  const iv = labels.indexOf("Vacanze");
  doc.querySelector('nav.views button[data-view="matrix"]').click();
  const rowsOn = doc.querySelectorAll("#pane-matrix tbody tr").length;
  cbs[iv].checked = false; cbs[iv].onchange();
  const rowsOff = doc.querySelectorAll("#pane-matrix tbody tr").length;
  ok(rowsOff < rowsOn, "il filtro agisce anche sulla matrice (" + rowsOn + " -> " + rowsOff + ")");

  doc.querySelector('nav.views button[data-view="places"]').click();
  const pinsOff = doc.querySelectorAll("#pane-places .pin").length;
  cbs[iv].checked = true; cbs[iv].onchange();
  doc.querySelector('nav.views button[data-view="places"]').click();
  const pinsOn = doc.querySelectorAll("#pane-places .pin").length;
  ok(pinsOn > pinsOff, "e sulla carta: le mete tornano (" + pinsOff + " -> " + pinsOn + ")");

  box.querySelectorAll(".fbtns button")[1].click();
  eq(doc.querySelectorAll("#pane-places .pin").length, 0, "'Niente' svuota la carta senza errori");
  box.querySelectorAll(".fbtns button")[0].click();
  eq(doc.querySelectorAll("#pane-places .pin").length, pinsOn, "'Tutto' ripristina i luoghi");
  // i documenti non hanno luoghi: li conto sul grafico, non sulla carta
  doc.querySelector('nav.views button[data-view="chart"]').click();
  ok(doc.querySelectorAll("#pane-chart .bar").length > before, "'Tutto' accende anche i documenti");
  ok([...box.querySelectorAll("input[type=checkbox]")].every(c => c.checked || c.disabled),
     "tutte le caselle attive risultano spuntate");
})();

doc.querySelector('nav.views button[data-view="places"]').click();
const geo = doc.querySelector("#pane-places");
ok(geo.querySelector("svg"), "la carta produce un svg");
ok(geo.querySelectorAll("path.coast").length > 100, "la costa è disegnata (" + geo.querySelectorAll("path.coast").length + " tratti)");

// Regressione: la costa deve finire DENTRO il riquadro, non solo esistere.
// Applico davvero la trasformazione del gruppo (funzione per funzione, in ordine
// inverso) a un campione di punti e conto quanti cadono nella finestra.
(function(){
  const tr = geo.querySelector("svg g").getAttribute("transform");
  const fns = [...tr.matchAll(/(translate|scale)\(([^)]*)\)/g)]
    .map(m => ({ f: m[1], a: m[2].split(/[ ,]+/).map(Number) }));
  ok(fns.length >= 3, "trasformazione leggibile: " + tr);
  const apply = (x, y) => {
    for (let i = fns.length - 1; i >= 0; i--) {
      const { f, a } = fns[i];
      if (f === "scale") { x *= a[0]; y *= (a.length > 1 ? a[1] : a[0]); }
      else { x += a[0]; y += (a.length > 1 ? a[1] : 0); }
    }
    return [x, y];
  };
  const W = 800, H = 600;   // in jsdom il fit ripiega su queste misure
  // Conto TUTTI i vertici, non solo il primo di ogni tratto: la finestra
  // inquadra il nord Italia, quindi la maggior parte dei tratti europei
  // comincia fuori campo pur attraversandola.
  let inside = 0, total = 0, nearPin = 0;
  const pinT = geo.querySelector(".pin").getAttribute("transform");
  const pc = /translate\((-?[\d.]+),(-?[\d.]+)\)/.exec(pinT).slice(1).map(Number);
  for (const path of geo.querySelectorAll("path.coast")) {
    for (const m of path.getAttribute("d").matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)) {
      total++;
      const [X, Y] = apply(+m[1], +m[2]);
      if (X >= 0 && X <= W && Y >= 0 && Y <= H) inside++;
      if (Math.hypot(X - pc[0], Y - pc[1]) < 200) nearPin++;
    }
  }
  ok(total > 5000, "campione di costa sufficiente (" + total + " vertici)");
  ok(inside > 150, "la costa cade nel riquadro: " + inside + " vertici su " + total);
  ok(nearPin > 20, "e passa vicino ai luoghi (" + nearPin + " vertici entro 200px dal primo pin)");
})();
ok(geo.querySelectorAll(".pin").length >= 5, "i luoghi diventano pin (" + geo.querySelectorAll(".pin").length + ")");
ok(geo.querySelectorAll(".plc").length >= 5, "l'elenco laterale è popolato");
ok(geo.querySelector(".scrub input[type=range]"), "c'è il cursore degli anni");
const pinTexts = [...geo.querySelectorAll(".pin text")].map(t => t.textContent);
ok(pinTexts.includes("Lerici"), "Lerici è sulla carta");
// le etichette che si sovrappongono vengono nascoste, ma i pin restano tutti
const visibili = [...geo.querySelectorAll(".pin text")].filter(t => t.style.display !== "none");
ok(visibili.length < geo.querySelectorAll(".pin").length,
   "alcune etichette sono nascoste per sovrapposizione (" + visibili.length + " visibili su " + geo.querySelectorAll(".pin").length + ")");
ok(visibili.length >= 3, "ma non spariscono tutte");
const nomiVis = visibili.map(t => t.textContent);
ok(nomiVis.includes("Bologna") && !nomiVis.includes("Università di Bologna"),
   "vince il cerchio piu' grande fra due luoghi coincidenti");
ok(pinTexts.includes("Barcellona"), "anche i luoghi esteri (Erasmus di Davide)");
ok(geo.querySelectorAll("path.trace").length >= 2, "le tracce dei traslochi sono due");
// il cursore spegne i luoghi non attivi
const rng2 = geo.querySelector(".scrub input[type=range]");
rng2.value = "1985"; rng2.dispatchEvent(new win.Event("input"));
const dimmed = geo.querySelectorAll(".pin.dim").length;
ok(dimmed > 0 && dimmed < geo.querySelectorAll(".pin").length, "nel 1985 alcuni luoghi si spengono e altri no (" + dimmed + ")");
ok(geo.querySelector(".scrubyear").textContent === "1985", "l'anno mostrato segue il cursore");
const attivi85 = [...geo.querySelectorAll(".pin")].filter(p => !p.classList.contains("dim"))
  .map(p => p.querySelector("text").textContent);
ok(attivi85.includes("Siena"), "nel 1985 Siena è accesa (casa dei genitori)");
ok(!attivi85.includes("Barcellona"), "e Barcellona no (Erasmus nel 2003)");
// regressione: i periodi senza `end` non devono spegnersi negli anni futuri
rng2.value = "2040"; rng2.dispatchEvent(new win.Event("input"));
const attivi40 = [...geo.querySelectorAll(".pin")].filter(p => !p.classList.contains("dim"))
  .map(p => p.querySelector("text").textContent);
ok(attivi40.includes("Milano"), "nel 2040 Milano resta accesa: 'in corso' non scade oggi");
ok(geo.querySelector(".scrubyear").textContent === "2040", "il cursore non si blocca dopo il primo uso");

console.log("--- carta dei luoghi");
// risoluzione delle coordinate, in ordine di precedenza
const dict = {"Bologna":[1,2], "Università di Bologna":[3,4]};
eq(API.resolvePlace("Bologna", dict).coord[0], 1, "il tuo elenco batte il repertorio");
eq(API.resolvePlace("Roma", dict).src, "dal repertorio", "fallback sul repertorio");
eq(API.resolvePlace("Università di Bologna", dict).coord[0], 3, "nome esatto batte la deduzione");
const ded = API.resolvePlace("Ospedale di Bergamo", null);
ok(ded && /dedotto/.test(ded.src), "deduce la citta' contenuta nel nome (" + (ded&&ded.src) + ")");
eq(API.resolvePlace("Contrada Fantasia", null), null, "nome sconosciuto resta senza coordinate");
const amb = API.resolvePlace("Porto Ercole marina", null);
ok(amb && amb.src.indexOf("Porto Ercole") > 0, "sceglie la corrispondenza piu' lunga");

// decodifica della base cartografica
const lines = API.decodeLines(ctx.COAST ? ctx.COAST.euro.all : "");
ok(true, "placeholder");

// proiezione
const eq0 = API.merc(0, 12);
eq(Math.round(eq0[1]), 0, "all'equatore la y di Mercatore è zero");
ok(API.merc(60, 0)[1] > 60, "alle alte latitudini Mercatore dilata");
ok(API.merc(-45, 0)[1] < 0, "emisfero sud negativo");

let badPlaces = why(d => { d.places = { "X": ["a","b"] }; });
ok(/lat, lon/.test(badPlaces||""), "coordinate malformate: messaggio utile");

console.log("--- filtri");
setTimeout(()=>{}, 0);
console.log("--- scadenze dei documenti");
// la patente B si accorcia con l'eta': 10 anni fino a 50, poi 5, 3, 2
const dv = (t,a)=>API.docValidity(t,a);
eq(dv("patente",34), 10, "patente a 34 anni: 10 anni");
eq(dv("patente",52), 5,  "patente a 52 anni: 5 anni");
eq(dv("patente",72), 3,  "patente a 72 anni: 3 anni");
eq(dv("patente",83), 2,  "patente a 83 anni: 2 anni");
eq(dv("passaporto",30), 10, "passaporto adulto: 10 anni");
eq(dv("passaporto",10), 5,  "passaporto 3-18 anni: 5");
eq(dv("identita",1), 3,     "carta d'identita' sotto i 3 anni: 3");
eq(dv("badge",30), null,    "tipo sconosciuto: nessuna regola");

const meDocs = M.byId.marta.periods.filter(q => q.track === "doc" && q.label === "Patente B")
  .sort((a,b)=>a.end.t0-b.end.t0);
ok(meDocs.length >= 3, "la patente si proietta in avanti (" + meDocs.length + " rinnovi)");
eq(meDocs[0].end.y, 2029, "prima scadenza dal JSON");
// nata nel 1977, la patente scade nel 2029 quando ha 52: da li' in poi 5 anni
eq(meDocs[1].end.y, 2034, "rinnovata dopo i 50: +5, non +10");
eq(meDocs[2].end.y, 2039, "e cosi' via ogni 5 anni");
const annaDocs = M.byId.sofia.periods.filter(q => q.track === "doc").sort((a,b)=>a.end.t0-b.end.t0);
eq(annaDocs[0].end.y, 2027, "prima carta d'identita' di Sofia");
eq(annaDocs[1].end.y, 2032, "a 15 anni la successiva dura 5 anni");
eq(annaDocs[2].end.y, 2042, "a 20 anni passa a 10");
ok(meDocs[meDocs.length-1].end.t0 > M.horizon - 6, "la catena arriva fino all'orizzonte");
const noType = API.build(Object.assign(JSON.parse(JSON.stringify(API.SAMPLE)), {})); // sanity
ok(noType, "build resta stabile");
const withVal = JSON.parse(JSON.stringify(API.SAMPLE));
withVal.people[0].documents = [{label:"Tessera", expires:"2030-01-01", validity:4}];
const MV = API.build(withVal);
const tes = MV.byId.marta.periods.filter(q=>q.label==="Tessera").sort((a,b)=>a.end.t0-b.end.t0);
eq(tes[1].end.y, 2034, "`validity` esplicito ha la precedenza");
ok(/expires/.test(why(d => { d.people[0].documents = [{label:"X"}]; })), "documento senza expires: messaggio utile");

// una riga per documento, non una sola corsia sovraffollata
const docRows = M.byId.marta.rows.filter(r => r.track === "doc");
eq(docRows.length, 3, "tre righe: patente, passaporto, carta d'identita'");
ok(docRows.every(r => r.label), "ogni riga porta il nome del documento");
ok(docRows.every(r => new Set(r.items.map(q=>q.label)).size === 1), "nessuna riga mescola documenti diversi");

console.log("--- vacanze");
const vac = M.byId.marta.shared.filter(q => q.track === "holiday");
eq(vac.length, 5, "le vacanze diventano periodi condivisi");
ok(vac.every(q => q.category === "holiday"), "categoria coerente");
ok(M.byId.marta.rows.some(r => r.track === "holiday"), "hanno una corsia propria");

console.log("--- errori di dati leggibili");
function why(mut) {
  const d = JSON.parse(JSON.stringify(API.SAMPLE)); mut(d);
  try { API.build(d); return null; } catch (e) { return e.message; }
}
ok(/birth/.test(why(d => { delete d.people[0].birth; })), "persona senza birth: messaggio utile");
ok(/Data non riconosciuta/.test(why(d => { d.people[0].birth = "12-1978"; })), "data malformata: messaggio utile");
ok(/date/i.test(why(d => { delete d.events[0].date; })), "evento senza date: messaggio utile");
ok(/start/i.test(why(d => { delete d.people[0].periods[0].start; })), "periodo senza start: messaggio utile");

console.log("--- recurrences: true usa settings.milestones");
const dm = JSON.parse(JSON.stringify(API.SAMPLE));
dm.settings.milestones = [1, 7];
dm.events[0].recurrences = true;
const M3 = API.build(dm);
const w3 = M3.byId.marta.sharedEvents.find(e => e.id === "wedding");
eq(w3.recs.length, 2, "due ricorrenze dai milestones");
eq(w3.recs[1].date.y, 2014, "7 anni dopo il 2007");

// applica dal drawer
doc.querySelector("#btnData").click();
doc.querySelector("#json").value = JSON.stringify({
  version: 1, meta: { anchor: "x" },
  people: [{ id: "x", name: "Test", birth: "1990-01-01", school: { through: "master" } }]
}, null, 2);
doc.querySelector("#btnApply").click();
ok(!doc.querySelector("#msg").classList.contains("err"), "JSON minimo accettato: " + doc.querySelector("#msg").textContent);
doc.querySelector("#json").value = "{ non json";
doc.querySelector("#btnApply").click();
ok(doc.querySelector("#msg").classList.contains("err"), "JSON rotto segnalato senza rompere la pagina");
ok(doc.querySelector("#diags").classList.contains("on"), "e il pannello diagnostiche si apre");
ok(/E000/.test(doc.querySelector("#diags").textContent), "con il codice di sintassi");
ok(/riga \d+/.test(doc.querySelector("#diags").textContent), "e il numero di riga");

// errori: niente caricamento. Avvisi: si carica lo stesso.
const ancoraVivo = doc.querySelectorAll("#pane-chart .bar").length;
doc.querySelector("#json").value = JSON.stringify({ people: [{ name: "X" }] });
doc.querySelector("#btnApply").click();
ok(/E004/.test(doc.querySelector("#diags").textContent), "persona senza nascita: errore elencato");
eq(doc.querySelectorAll("#pane-chart .bar").length, ancoraVivo, "i dati precedenti restano a schermo");

doc.querySelector("#json").value = JSON.stringify({
  people: [{ id: "x", name: "X", birth: "1990-01-01", color: "blu" }]
});
doc.querySelector("#btnApply").click();
ok(/W009/.test(doc.querySelector("#diags").textContent), "colore sbagliato: solo avviso");
ok(/Applicato/.test(doc.querySelector("#msg").textContent), "e i dati vengono caricati lo stesso");

// il pulsante Controlla non sostituisce nulla
doc.querySelector("#json").value = JSON.stringify({ people: [{ name: "Y" }] });
doc.querySelector("#btnCheck").click();
ok(/E004/.test(doc.querySelector("#diags").textContent), "Controlla elenca i problemi");
ok(/X/.test(doc.querySelector("#anchorline").textContent), "senza toccare i dati caricati");

// dati puliti: nessun pannello (RF10)
doc.querySelector("#json").value = JSON.stringify({
  people: [{ id: "z", name: "Z", birth: "1990-01-01" }]
});
doc.querySelector("#btnCheck").click();
ok(!doc.querySelector("#diags").classList.contains("on"), "dati puliti: nessun pannello");
eq(doc.querySelector("#btnData").textContent, "Dati", "e nessun contatore sul pulsante");

console.log("\n" + pass + " passati, " + fail + " falliti");
process.exit(fail ? 1 : 0);
}, 80);
