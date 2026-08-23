/**
 * Ogni regola ha un caso che la fa scattare e la garanzia che non scatti sui
 * dati buoni (RNF4 in docs/requisiti.md). Un validatore con falsi positivi è
 * peggio di nessun validatore.
 */
import { describe, expect, it } from "vitest";
import Ajv from "ajv/dist/2020.js";
import fs from "node:fs";
import path from "node:path";
import { hasErrors, validate } from "../src/validate/validate.js";
import { SAMPLE } from "../src/data/sample.js";
import type { RawDocumentRoot } from "../src/core/types.js";

type Mutate = (d: RawDocumentRoot) => void;

const clone = (): RawDocumentRoot => JSON.parse(JSON.stringify(SAMPLE)) as RawDocumentRoot;
const mutated = (mut: Mutate): RawDocumentRoot => {
  const d = clone();
  mut(d);
  return d;
};
const codes = (mut: Mutate): string[] => validate(mutated(mut)).map(x => x.code);
const emits = (mut: Mutate, code: string): boolean => codes(mut).includes(code);
const levelOf = (mut: Mutate, code: string) =>
  validate(mutated(mut)).find(x => x.code === code)?.level;

describe("dati buoni", () => {
  // RNF2: un esempio che genera avvisi insegna che gli avvisi sono normali.
  it("l'esempio incluso non produce alcuna diagnostica", () => {
    expect(validate(SAMPLE)).toEqual([]);
  });
});

describe("struttura", () => {
  it("rifiuta una radice che non è un oggetto", () => {
    expect(validate(null).map(d => d.code)).toEqual(["E001"]);
    expect(validate([]).map(d => d.code)).toEqual(["E001"]);
    expect(validate("testo").map(d => d.code)).toEqual(["E001"]);
  });

  it("richiede l'elenco delle persone", () => {
    expect(validate({}).map(d => d.code)).toEqual(["E002"]);
    expect(emits(d => { d.people = []; }, "E002")).toBe(true);
  });

  it("segnala una voce che non è un oggetto", () => {
    expect(emits(d => { d.people![0] = 42 as never; }, "E003")).toBe(true);
  });

  it("richiede nome e nascita", () => {
    expect(emits(d => { delete d.people![0]!.name; }, "E003")).toBe(true);
    expect(emits(d => { delete d.people![0]!.birth; }, "E004")).toBe(true);
  });

  it("segnala i contenitori del tipo sbagliato", () => {
    expect(emits(d => { d.places = [1, 2] as never; }, "E021")).toBe(true);
    expect(emits(d => { d.events![0]!.who = "marta" as never; }, "E021")).toBe(true);
    expect(emits(d => { d.settings!.filters = "home" as never; }, "E021")).toBe(true);
  });
});

describe("date", () => {
  it("rifiuta i formati non riconoscibili", () => {
    expect(emits(d => { d.people![0]!.birth = "12/07/1978"; }, "E005")).toBe(true);
    expect(emits(d => { d.people![0]!.birth = "ieri"; }, "E005")).toBe(true);
  });

  it("rifiuta le date che non esistono", () => {
    expect(emits(d => { d.people![0]!.birth = "1978-13-01"; }, "E006")).toBe(true);
    expect(emits(d => { d.people![0]!.birth = "1978-02-30"; }, "E006")).toBe(true);
    expect(emits(d => { d.people![0]!.birth = "1979-02-29"; }, "E006")).toBe(true);
  });

  it("accetta il 29 febbraio negli anni bisestili", () => {
    expect(emits(d => { d.people![0]!.birth = "1980-02-29"; }, "E006")).toBe(false);
  });

  it("segnala la forma non canonica come avviso, non errore", () => {
    expect(emits(d => { d.people![0]!.birth = "1978-4-2"; }, "W010")).toBe(true);
    expect(levelOf(d => { d.people![0]!.birth = "1978-4-2"; }, "W010")).toBe("warning");
  });
});

describe("coerenza temporale", () => {
  it("intercetta morte prima della nascita", () => {
    expect(emits(d => { d.people![4]!.death = "1900"; }, "E010")).toBe(true);
  });

  // Senza questo, una data di morte impossibile genera un avviso «successivo
  // alla morte» per ogni evento e ogni periodo di quella persona: decine di
  // segnalazioni derivate che seppelliscono l'unica che conta.
  it("non moltiplica gli avvisi quando la causa è già un errore", () => {
    const rotto = codes(d => { d.people![0]!.death = "1900"; });
    expect(rotto).toContain("E010");
    expect(rotto.filter(c => c === "W002")).toEqual([]);
  });

  it("ma continua a segnalarli quando la vita è coerente", () => {
    expect(emits(d => { d.people![0]!.events![0]!.date = "1950"; }, "W002")).toBe(true);
  });

  it("intercetta fine prima dell'inizio", () => {
    expect(emits(d => { d.people![0]!.periods![0]!.end = "1900"; }, "E009")).toBe(true);
  });

  it("intercetta un documento scaduto prima della nascita", () => {
    expect(emits(d => { d.people![0]!.documents![0]!.expires = "1900"; }, "E009")).toBe(true);
  });

  it("avvisa su eventi fuori dalla vita della persona", () => {
    expect(emits(d => { d.people![0]!.events![0]!.date = "1950"; }, "W002")).toBe(true);
    expect(emits(d => { d.people![4]!.events![0]!.date = "2020"; }, "W002")).toBe(true);
  });

  it("avvisa su ciò che cade oltre l'orizzonte", () => {
    expect(emits(d => { d.events!.push({ label: "Lontano", date: "2200" }); }, "W003")).toBe(true);
  });
});

describe("riferimenti", () => {
  it("richiede id univoci", () => {
    expect(emits(d => { d.people![1]!.id = "marta"; }, "E007")).toBe(true);
  });

  it("verifica che `who` punti a qualcuno", () => {
    expect(emits(d => { d.events![0]!.who = ["marta", "nessuno"]; }, "E008")).toBe(true);
    expect(emits(d => { d.meta!.anchor = "fantasma"; }, "E020")).toBe(true);
  });

  it("suggerisce di spostare ciò che riguarda una persona sola", () => {
    expect(emits(d => { d.events![0]!.who = ["marta"]; }, "W004")).toBe(true);
  });

  // L'avviso W004 non deve accavallarsi all'errore E008.
  it("tace su `who` singolo se l'id non esiste", () => {
    const c = codes(d => { d.events![0]!.who = ["nessuno"]; });
    expect(c).toContain("E008");
    expect(c).not.toContain("W004");
  });

  it("avvisa su persone senza id o con lo stesso nome", () => {
    expect(emits(d => { delete d.people![0]!.id; }, "W014")).toBe(true);
    expect(emits(d => { d.people![1]!.name = "Marta"; }, "W007")).toBe(true);
  });
});

describe("eventi contro periodi", () => {
  it("richiede `date` agli eventi e `start` ai periodi", () => {
    expect(emits(d => { delete d.events![0]!.date; }, "E011")).toBe(true);
    expect(emits(d => { delete d.periods![0]!.start; }, "E011")).toBe(true);
  });

  it("non lascia mescolare le due forme", () => {
    expect(emits(d => { d.events![0]!.end = "2010"; }, "E011")).toBe(true);
    expect(emits(d => { d.periods![0]!.date = "2020"; }, "E011")).toBe(true);
  });

  it("avvisa sulle voci senza etichetta", () => {
    expect(emits(d => { delete d.events![0]!.label; }, "W015")).toBe(true);
    expect(emits(d => { delete d.periods![0]!.label; }, "W015")).toBe(true);
  });
});

describe("scuola", () => {
  it("chiude il vocabolario dei cicli", () => {
    expect(emits(d => { d.people![2]!.school!.through = "dottorato"; }, "E013")).toBe(true);
    expect(emits(d => {
      d.people![2]!.periods = [{ label: "X", start: "2026-09", replaces: "superiori" }];
    }, "E012")).toBe(true);
  });

  it("verifica chiavi e valori dei ritardi", () => {
    expect(emits(d => { d.people![2]!.school!.delays = { liceo: 1 }; }, "E014")).toBe(true);
    expect(emits(d => { d.people![2]!.school!.delays = { middle: -1 }; }, "E014")).toBe(true);
  });

  it("avvisa su `replaces` senza blocco `school`", () => {
    expect(emits(d => {
      d.people![0]!.periods!.push({ label: "X", start: "2000", replaces: "master" });
    }, "W011")).toBe(true);
  });
});

describe("documenti", () => {
  it("richiede la scadenza e una validità sensata", () => {
    expect(emits(d => { delete d.people![0]!.documents![0]!.expires; }, "E017")).toBe(true);
    expect(emits(d => { d.people![0]!.documents![0]!.validity = 0; }, "E018")).toBe(true);
  });

  it("avvisa sui tipi senza regole note", () => {
    expect(emits(d => { d.people![0]!.documents![0]!.type = "tessera"; }, "W016")).toBe(true);
  });

  it("tace se `validity` è dichiarata", () => {
    expect(emits(d => {
      d.people![0]!.documents![0]!.type = "tessera";
      d.people![0]!.documents![0]!.validity = 4;
    }, "W016")).toBe(false);
  });

  it("segnala le scadenze molto vecchie", () => {
    expect(emits(d => { d.people![0]!.documents![0]!.expires = "2005-01-01"; }, "W008")).toBe(true);
  });

  // Regressione: la regola confrontava con l'orizzonte invece che con oggi, e
  // giudicava "molto vecchia" una patente ancora valida per anni.
  it("non considera vecchia una scadenza futura", () => {
    expect(emits(d => { d.people![0]!.documents![0]!.expires = "2029-01-01"; }, "W008")).toBe(false);
  });
});

describe("luoghi", () => {
  it("verifica forma e scala delle coordinate", () => {
    expect(emits(d => { d.places!["X"] = [200, 9]; }, "E015")).toBe(true);
    expect(emits(d => { d.places!["X"] = ["a", "b"] as never; }, "E015")).toBe(true);
    expect(emits(d => { d.events![0]!.place = { name: "Y", coord: [11.2, 200] }; }, "E015")).toBe(true);
    expect(emits(d => { d.events![0]!.place = { coord: [45, 9] } as never; }, "E015")).toBe(true);
  });

  // Limite dichiarato: due valori entrambi entro ±90 sono ambigui.
  it("non inventa allarmi su coordinate invertite ma in scala", () => {
    expect(emits(d => { d.events![0]!.place = { name: "Y", coord: [11.2, 42.4] }; }, "E015")).toBe(false);
  });

  it("segnala le voci di `places` mai usate", () => {
    expect(emits(d => { d.places!["Mai usato"] = [45, 9]; }, "W005")).toBe(true);
  });

  it("accetta sempre un luogo come stringa", () => {
    expect(emits(d => { d.events![0]!.place = "Verona"; }, "E015")).toBe(false);
  });
});

describe("vocabolari aperti", () => {
  it("avvisa senza bloccare su categorie e corsie ignote", () => {
    expect(levelOf(d => { d.events![0]!.category = "misteriosa"; }, "W006")).toBe("warning");
    expect(levelOf(d => { d.periods![0]!.track = "sconosciuta"; }, "W006")).toBe("warning");
    expect(levelOf(d => { d.people![0]!.color = "blu"; }, "W009")).toBe("warning");
  });

  it("blocca sui vocabolari chiusi", () => {
    expect(emits(d => { d.settings!.ageDisplay = "preciso"; }, "E019")).toBe(true);
    expect(emits(d => { d.settings!.milestones = [0]; }, "E016")).toBe(true);
    expect(emits(d => { d.events![0]!.recurrences = ["dieci"] as never; }, "E016")).toBe(true);
  });

  it("ammette `recurrences: true`", () => {
    expect(emits(d => { d.events![0]!.recurrences = true; }, "E016")).toBe(false);
  });

  it("avvisa su una vacanza troppo lunga", () => {
    expect(emits(d => { d.holidays![0]!.end = "2021-08-18"; }, "W012")).toBe(true);
  });
});

describe("livelli e raccolta", () => {
  it("gli avvisi non bloccano, gli errori sì", () => {
    expect(hasErrors(validate(mutated(d => { d.people![0]!.color = "blu"; })))).toBe(false);
    expect(hasErrors(validate(mutated(d => { delete d.people![0]!.birth; })))).toBe(true);
  });

  // RF1: fermarsi al primo errore costringe a un ciclo correggi-riprova.
  it("raccoglie errori indipendenti in una sola passata", () => {
    const c = codes(d => {
      delete d.people![0]!.birth;
      d.people![1]!.birth = "boh";
      d.events![0]!.who = ["nessuno"];
    });
    expect(c.filter(x => x.startsWith("E")).length).toBeGreaterThanOrEqual(3);
  });

  // RF3: livello, codice, percorso, messaggio.
  it("dà a ogni diagnostica una forma completa", () => {
    for (const d of validate(mutated(m => { delete m.people![0]!.birth; }))) {
      expect(d.code).toMatch(/^[EW]\d{3}$/);
      expect(d.message.length).toBeGreaterThan(10);
      expect(typeof d.path).toBe("string");
    }
  });
});

describe("schema e codice restano allineati", () => {
  const schema = JSON.parse(
    fs.readFileSync(path.resolve("schema/prospettiva.schema.json"), "utf8")) as object;
  const ajv = new Ajv({ strict: false, allErrors: true });
  const check = ajv.compile(schema);

  it("i dati d'esempio soddisfano lo schema", () => {
    expect(check(SAMPLE), JSON.stringify(check.errors)).toBe(true);
  });

  it("lo schema rifiuta ciò che è verificabile sulla forma", () => {
    expect(check(mutated(d => { delete d.people![0]!.birth; }))).toBe(false);
    expect(check(mutated(d => { d.people![0]!.birth = "12/07/1978"; }))).toBe(false);
    expect(check(mutated(d => { d.people![2]!.school!.through = "dottorato"; }))).toBe(false);
    expect(check(mutated(d => { d.places!["X"] = [200, 9]; }))).toBe(false);
  });

  it("lascia al validatore ciò che lo schema non può esprimere", () => {
    expect(check(mutated(d => { d.events![0]!.who = ["nessuno"]; }))).toBe(true);
    expect(check(mutated(d => { d.people![0]!.birth = "1978-02-30"; }))).toBe(true);
  });
});
