/**
 * Validazione: ogni regola ha un caso che la fa scattare e la garanzia che
 * non scatti sui dati buoni. Un validatore con falsi positivi e' peggio di
 * nessun validatore (RNF4).
 *
 * Verifica anche che lo JSON Schema e il codice non divergano (docs/requisiti.md).
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { JSDOM } from "jsdom";
import Ajv from "ajv/dist/2020.js";

const ROOT = path.resolve(import.meta.dirname, "..");
const ARTIFACT = path.join(ROOT, "dist", "prospettiva.html");
if (!fs.existsSync(ARTIFACT)) {
  console.error("test: manca dist/prospettiva.html — esegui `make build`");
  process.exit(1);
}

let pass = 0, fail = 0;
const ok = (c, n, x) => c ? pass++ : (fail++, console.log("  FAIL: " + n + (x ? "  -> " + x : "")));
const eq = (a, b, n) => ok(a === b, n, JSON.stringify(a) + " != " + JSON.stringify(b));

const html = fs.readFileSync(ARTIFACT, "utf8");
const script = html.split("<script>")[1].split("</script>")[0];
const ctx = {
  console, Math, JSON, Object, Array, String, Number, Set, Map, Date, Infinity, isNaN,
  document: new JSDOM(html).window.document,
  window: {}, addEventListener() {}, requestAnimationFrame() {},
  module: { exports: {} }
};
vm.createContext(ctx);
try { vm.runInContext(script, ctx); } catch { }
const { validate, scanJSON, SAMPLE } = ctx.module.exports;

const clone = () => JSON.parse(JSON.stringify(SAMPLE));
/** Applica una mutazione e restituisce i codici emessi. */
const codes = mut => { const d = clone(); mut(d); return validate(d).map(x => x.code); };
const has = (mut, code, name) => {
  const c = codes(mut);
  ok(c.includes(code), name, "emessi: " + (c.join(" ") || "nessuno"));
};
const level = (mut, code) => {
  const d = clone(); mut(d);
  const found = validate(d).find(x => x.code === code);
  return found ? found.level : null;
};

/* ---------------------------------------------------------------- */
console.log("--- i dati buoni non producono nulla (RNF2)");
eq(validate(SAMPLE).length, 0, "l'esempio incluso e' pulito");

console.log("--- errori di struttura");
eq(validate(null).map(x => x.code).join(), "E001", "radice nulla");
eq(validate([]).map(x => x.code).join(), "E001", "radice che e' una lista");
eq(validate({}).map(x => x.code).join(), "E002", "senza `people`");
has(d => { d.people = []; }, "E002", "elenco vuoto");
has(d => { d.people[0] = 42; }, "E003", "voce che non e' un oggetto");
has(d => { delete d.people[0].name; }, "E003", "persona senza nome");
has(d => { delete d.people[0].birth; }, "E004", "persona senza nascita");
has(d => { d.places = [1, 2]; }, "E021", "`places` che e' una lista");
has(d => { d.events[0].who = "me"; }, "E021", "`who` che non e' una lista");

console.log("--- date");
has(d => { d.people[0].birth = "12/07/1978"; }, "E005", "formato non ISO");
has(d => { d.people[0].birth = "ieri"; }, "E005", "testo libero");
has(d => { d.people[0].birth = "1978-13-01"; }, "E006", "mese 13");
has(d => { d.people[0].birth = "1978-02-30"; }, "E006", "30 febbraio");
has(d => { d.people[0].birth = "1979-02-29"; }, "E006", "29 febbraio in anno non bisestile");
ok(!codes(d => { d.people[0].birth = "1980-02-29"; }).includes("E006"),
   "29 febbraio in anno bisestile: valido");
has(d => { d.people[0].birth = "1978-4-2"; }, "W010", "forma non canonica: avviso, non errore");
eq(level(d => { d.people[0].birth = "1978-4-2"; }, "W010"), "warning", "e resta un avviso");

console.log("--- coerenza temporale");
has(d => { d.people[4].death = "1900"; }, "E010", "morte prima della nascita");
has(d => { d.people[0].periods[0].end = "1990"; }, "E009", "fine prima dell'inizio");
has(d => { d.people[0].documents[0].expires = "1900"; }, "E009", "documento scaduto prima di nascere");
has(d => { d.people[0].events[0].date = "1950"; }, "W002", "evento prima della nascita: avviso");
has(d => { d.people[4].events[0].date = "2020"; }, "W002", "evento dopo la morte: avviso");
has(d => { d.events.push({ label: "Molto lontano", date: "2200" }); }, "W003", "oltre l'orizzonte");

console.log("--- riferimenti");
has(d => { d.people[1].id = "marta"; }, "E007", "id duplicato");
has(d => { d.events[0].who = ["marta", "nessuno"]; }, "E008", "`who` verso un id inesistente");
has(d => { d.meta.anchor = "fantasma"; }, "E020", "`anchor` verso un id inesistente");
has(d => { d.events[0].who = ["marta"]; }, "W004", "`who` con un solo nome: avviso");
has(d => { delete d.people[0].id; }, "W014", "persona senza id: avviso");
has(d => { d.people[1].name = "Marta"; }, "W007", "due persone con lo stesso nome");

console.log("--- eventi contro periodi");
has(d => { delete d.events[0].date; }, "E011", "evento senza data");
has(d => { d.events[0].end = "2010"; }, "E011", "evento con `end`");
has(d => { delete d.periods[0].start; }, "E011", "periodo senza inizio");
has(d => { d.periods[0].date = "2020"; }, "E011", "periodo con `date`");
has(d => { delete d.events[0].label; }, "W015", "evento senza etichetta: avviso");

console.log("--- scuola e documenti");
has(d => { d.people[2].school.through = "dottorato"; }, "E013", "ciclo sconosciuto");
has(d => { d.people[2].school.delays = { liceo: 1 }; }, "E014", "chiave di ritardo sconosciuta");
has(d => { d.people[2].school.delays = { middle: -1 }; }, "E014", "ritardo negativo");
has(d => { d.people[2].periods = [{ label: "X", start: "2026-09", replaces: "superiori" }]; },
    "E012", "`replaces` con ciclo sconosciuto");
has(d => { d.people[0].periods.push({ label: "X", start: "2000", replaces: "master" }); },
    "W011", "`replaces` su persona senza blocco `school`: avviso");
has(d => { delete d.people[0].documents[0].expires; }, "E017", "documento senza scadenza");
has(d => { d.people[0].documents[0].validity = 0; }, "E018", "validita' nulla");
has(d => { d.people[0].documents[0].type = "tessera"; }, "W016", "tipo senza regole note: avviso");
eq(codes(d => { d.people[0].documents[0].type = "tessera"; d.people[0].documents[0].validity = 4; })
     .filter(c => c === "W016").length, 0, "con `validity` esplicito nessun avviso");
has(d => { d.people[0].documents[0].expires = "2005-01-01"; }, "W008", "scadenza molto vecchia");
eq(codes(d => { d.people[0].documents[0].expires = "2029-01-01"; }).filter(c => c === "W008").length,
   0, "una scadenza futura non e' vecchia (regressione del bug della regola)");

console.log("--- luoghi");
has(d => { d.places["X"] = [200, 9]; }, "E015", "latitudine fuori scala");
has(d => { d.places["X"] = ["a", "b"]; }, "E015", "coordinate non numeriche");
// Limite dichiarato: due valori entrambi entro +/-90 sono ambigui, non c'e'
// modo di sapere se sono invertiti. Meglio nessuna diagnostica che una a caso.
ok(!codes(d => { d.events[0].place = { name: "Y", coord: [11.2, 42.4] }; }).includes("E015"),
   "coordinate invertite ma in scala: nessun falso allarme");
has(d => { d.events[0].place = { name: "Y", coord: [11.2, 200] }; }, "E015",
    "invertite e fuori scala: intercettate");
has(d => { d.places["Mai usato"] = [45, 9]; }, "W005", "voce di `places` inutilizzata");
has(d => { d.events[0].place = { coord: [45, 9] }; }, "E015", "luogo senza nome");
eq(codes(d => { d.events[0].place = "Verona"; }).filter(c => c === "E015").length, 0,
   "un luogo come stringa e' sempre valido");

console.log("--- vocabolari aperti");
has(d => { d.events[0].category = "misteriosa"; }, "W006", "categoria fuori vocabolario: avviso");
has(d => { d.periods[0].track = "sconosciuta"; }, "W006", "corsia fuori vocabolario: avviso");
has(d => { d.people[0].color = "blu"; }, "W009", "colore non esadecimale: avviso");
has(d => { d.settings.ageDisplay = "preciso"; }, "E019", "ageDisplay fuori vocabolario");
has(d => { d.settings.milestones = [0]; }, "E016", "milestone non positiva");
has(d => { d.events[0].recurrences = ["dieci"]; }, "E016", "ricorrenze non numeriche");
eq(codes(d => { d.events[0].recurrences = true; }).filter(c => c === "E016").length, 0,
   "`recurrences: true` e' ammesso");

console.log("--- gli avvisi non bloccano, gli errori si (RF2)");
const soloAvvisi = clone(); soloAvvisi.people[0].color = "blu";
ok(validate(soloAvvisi).every(x => x.level === "warning"), "un colore sbagliato non e' un errore");
const conErrore = clone(); delete conErrore.people[0].birth;
ok(validate(conErrore).some(x => x.level === "error"), "una nascita mancante lo e'");

console.log("--- raccolta completa in una passata (RF1)");
const multi = clone();
delete multi.people[0].birth;
multi.people[1].birth = "boh";
multi.events[0].who = ["nessuno"];
const mc = validate(multi).map(x => x.code);
ok(mc.filter(c => c[0] === "E").length >= 3, "tre errori indipendenti riportati insieme: " + mc.join(" "));

console.log("--- forma delle diagnostiche (RF3)");
for (const d of validate(multi)) {
  ok(typeof d.code === "string" && /^[EW]\d{3}$/.test(d.code), "codice ben formato: " + d.code);
  ok(typeof d.message === "string" && d.message.length > 10, "messaggio non vuoto: " + d.code);
  ok(typeof d.path === "string", "percorso presente: " + d.code);
}

console.log("--- localizzazione nel testo (RF4)");
const text = JSON.stringify(SAMPLE, null, 2);
const pos = scanJSON(text);
const at = pos.get("people[0].birth");
ok(at != null, "il percorso di una data e' localizzato");
eq(text.slice(at[0], at[1]), '"1977-03-09"', "e punta al valore giusto");
const at2 = pos.get("people[2].school.through");
ok(at2 && text.slice(at2[0], at2[1]) === '"bachelor"', "anche nei rami annidati");
const at3 = pos.get("events[0].who[1]");
ok(at3 && text.slice(at3[0], at3[1]) === '"davide"', "e dentro le liste");
ok(pos.get("people[0].birth\u0000key") != null, "la chiave e' localizzata separatamente dal valore");

console.log("--- lo schema e il codice restano allineati");
const schema = JSON.parse(fs.readFileSync(path.join(ROOT, "schema", "prospettiva.schema.json"), "utf8"));
const ajv = new Ajv({ strict: false, allErrors: true });
const check = ajv.compile(schema);
ok(check(SAMPLE), "i dati d'esempio soddisfano lo schema: " + JSON.stringify(check.errors || []).slice(0, 300));

// lo schema deve rifiutare cio' che il validatore chiama errore di forma
ok(!check((() => { const d = clone(); delete d.people[0].birth; return d; })()),
   "lo schema rifiuta una persona senza nascita");
ok(!check((() => { const d = clone(); d.people[0].birth = "12/07/1978"; return d; })()),
   "lo schema rifiuta una data non ISO");
ok(!check((() => { const d = clone(); d.people[2].school.through = "dottorato"; return d; })()),
   "lo schema rifiuta un ciclo sconosciuto");
ok(!check((() => { const d = clone(); d.places["X"] = [200, 9]; return d; })()),
   "lo schema rifiuta una latitudine fuori scala");

// e deve LASCIAR PASSARE cio' che solo il validatore puo' vedere
ok(check((() => { const d = clone(); d.events[0].who = ["nessuno"]; return d; })()),
   "lo schema non puo' controllare i riferimenti `who`: se ne occupa il validatore");
ok(check((() => { const d = clone(); d.people[0].birth = "1978-02-30"; return d; })()),
   "ne' l'esistenza reale di una data");

console.log("\n" + pass + " passati, " + fail + " falliti");
process.exit(fail ? 1 : 0);
