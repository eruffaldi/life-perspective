/**
 * Multilingua. Il compilatore garantisce che i cataloghi abbiano le stesse
 * voci con gli stessi parametri; qui si verifica ciò che il tipo non vede —
 * che nessuna voce sia rimasta in italiano per distrazione, e che il domìnio
 * non venga tradotto insieme all'interfaccia.
 */
import { afterEach, describe, expect, it } from "vitest";
import { CATALOGUES, DEFAULT_LANGUAGE, LANGUAGES, detectLanguage, language, locale, setLanguage } from "../src/i18n/index.js";
import { it as itMessages } from "../src/i18n/it.js";
import { en } from "../src/i18n/en.js";
import { parseDate, fmtDate } from "../src/core/date.js";
import { docValidity } from "../src/core/documents.js";
import { generateSchool } from "../src/core/school.js";
import { build, roleLabel } from "../src/core/model.js";
import { trackLabel } from "../src/core/tracks.js";
import { distText } from "../src/core/age.js";
import { SAMPLE } from "../src/data/sample.js";

// `t()` è stato globale: chi lo tocca deve rimetterlo com'era.
afterEach(() => setLanguage(DEFAULT_LANGUAGE));

/** Percorsi foglia di un catalogo, per confrontarne due. */
function leaves(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [prefix];
  if (Array.isArray(obj)) return [prefix];
  return Object.entries(obj).flatMap(([k, v]) =>
    leaves(v, prefix ? prefix + "." + k : k));
}

describe("cataloghi", () => {
  it("hanno esattamente le stesse voci", () => {
    expect(leaves(en).sort()).toEqual(leaves(itMessages).sort());
  });

  it("dichiarano dodici mesi ciascuno", () => {
    for (const cat of Object.values(CATALOGUES)) {
      expect(cat.months.length, cat.code).toBe(12);
      expect(new Set(cat.months).size, cat.code).toBe(12);
    }
  });

  it("si presentano nella propria lingua", () => {
    expect(LANGUAGES.map(l => l.code).sort()).toEqual(["en", "it"]);
    expect(CATALOGUES["it"]!.name).toBe("Italiano");
    expect(CATALOGUES["en"]!.name).toBe("English");
  });

  // Il difetto tipico di una traduzione: una voce che nessuno ha toccato.
  it("l'inglese non ha voci rimaste in italiano", () => {
    const italianismi = /\b(anni|anno|mese|mesi|Scala|Dati|Filtri|Luoghi|Applica|Chiudi|Oggi|Tutto|Niente|errore|errori|avviso|avvisi)\b/;
    const sospette: string[] = [];
    const walk = (obj: unknown, path: string): void => {
      if (typeof obj === "string") {
        if (italianismi.test(obj)) sospette.push(path + ": " + obj);
        return;
      }
      if (typeof obj === "function") {
        const out = String((obj as (...a: unknown[]) => string)(2, "x"));
        if (italianismi.test(out)) sospette.push(path + ": " + out);
        return;
      }
      if (Array.isArray(obj)) return;
      if (typeof obj === "object" && obj) {
        for (const [k, v] of Object.entries(obj)) walk(v, path ? path + "." + k : k);
      }
    };
    walk(en, "");
    expect(sospette).toEqual([]);
  });
});

describe("rilevamento", () => {
  it("segue la preferenza del browser quando la conosce", () => {
    expect(detectLanguage(["en-GB", "it"])).toBe("en");
    expect(detectLanguage(["it-IT"])).toBe("it");
  });

  it("ignora le lingue che non ha e ricade sull'italiano", () => {
    expect(detectLanguage(["de-DE", "fr"])).toBe(DEFAULT_LANGUAGE);
    expect(detectLanguage([])).toBe(DEFAULT_LANGUAGE);
  });

  it("dà un codice locale utile alle funzioni del browser", () => {
    setLanguage("it");
    expect(locale()).toMatch(/^it/);
    setLanguage("en");
    expect(locale()).toMatch(/^en/);
  });

  it("ricade sull'italiano su un codice sconosciuto", () => {
    setLanguage("xx");
    expect(language()).toBe("it");
  });
});

describe("testi che cambiano con la lingua", () => {
  it("le date usano i mesi della lingua attiva", () => {
    const d = parseDate("2008-07-12");
    setLanguage("it");
    expect(fmtDate(d)).toBe("12 lug 2008");
    setLanguage("en");
    expect(fmtDate(d)).toBe("12 Jul 2008");
  });

  it("le distanze temporali si accordano", () => {
    setLanguage("it");
    expect(distText(2030, 2026)).toMatch(/^tra /);
    setLanguage("en");
    expect(distText(2030, 2026)).toMatch(/^in /);
    expect(distText(2020, 2026)).toMatch(/ago$/);
  });

  it("le corsie e i ruoli si traducono", () => {
    setLanguage("it");
    expect(trackLabel("doc")).toBe("Documenti");
    expect(roleLabel("child")).toBe("figlio/a");
    setLanguage("en");
    expect(trackLabel("doc")).toBe("Documents");
    expect(roleLabel("child")).toBe("child");
  });

  it("i ruoli inventati dall'utente restano com'erano", () => {
    setLanguage("en");
    expect(roleLabel("cugino")).toBe("cugino");
  });

  it("i cicli scolastici generati prendono il nome dalla lingua", () => {
    const birth = parseDate("2012-09-03");
    setLanguage("it");
    expect(generateSchool({ through: "highschool" }, birth).periods.map(p => p.label))
      .toContain("Liceo");
    setLanguage("en");
    expect(generateSchool({ through: "highschool" }, birth).periods.map(p => p.label))
      .toContain("High school");
  });

  it("le ricorrenze generate seguono la lingua", () => {
    setLanguage("en");
    const wed = build(SAMPLE).byId["marta"]!.sharedEvents.find(e => e.id === "wedding");
    expect(wed?.recs?.[0]?.label).toMatch(/years/);
  });
});

describe("il domìnio non si traduce", () => {
  // Le regole sono dello Stato italiano, non stringhe: cambiare lingua
  // all'interfaccia non le rende generiche.
  it("le validità dei documenti non dipendono dalla lingua", () => {
    setLanguage("en");
    expect(docValidity("patente", 34)).toBe(10);
    expect(docValidity("patente", 52)).toBe(5);
    expect(docValidity("passaporto", 10)).toBe(5);
  });

  it("i cicli scolastici restano quelli italiani", () => {
    setLanguage("en");
    const out = generateSchool({ through: "bachelor" }, parseDate("2012-09-03"));
    const highschool = out.periods.find(p => p.stage === "highschool");
    // Settembre dell'anno dei quattordici anni, giugno di quello dei diciannove.
    expect(highschool?.start.y).toBe(2026);
    expect(highschool?.end?.y).toBe(2031);
  });

  it("le chiavi del formato dati restano in inglese in entrambe le lingue", () => {
    setLanguage("it");
    const M = build(SAMPLE);
    expect(M.byId["marta"]!.periods.some(p => p.track === "school")).toBe(true);
  });
});

describe("diagnostica multilingua", () => {
  it("traduce messaggi e indicazioni insieme", async () => {
    const { validate } = await import("../src/validate/validate.js");
    const rotto = { people: [{ name: "X" }] };

    setLanguage("it");
    const italiano = validate(rotto);
    setLanguage("en");
    const inglese = validate(rotto);

    // Stessi codici, stesse posizioni: cambia solo la lingua.
    expect(inglese.map(d => d.code)).toEqual(italiano.map(d => d.code));
    expect(inglese.map(d => d.path)).toEqual(italiano.map(d => d.path));
    for (let i = 0; i < italiano.length; i++) {
      expect(inglese[i]!.message).not.toBe(italiano[i]!.message);
      expect(inglese[i]!.hint).not.toBe(italiano[i]!.hint);
    }
  });

  it("non lascia mezze frasi nella lingua sbagliata", async () => {
    const { validate } = await import("../src/validate/validate.js");
    const { SAMPLE: sample } = await import("../src/data/sample.js");
    const rotto = JSON.parse(JSON.stringify(sample));
    delete rotto.people[0].birth;
    rotto.people[1].birth = "boh";
    rotto.events[0].who = ["nessuno"];
    rotto.people[0].color = "blu";

    setLanguage("en");
    const italianismi = /\b(non|della|dalla|nella|deve|essere|persona|anni)\b/;
    for (const d of validate(rotto)) {
      expect(d.message, d.code).not.toMatch(italianismi);
      expect(d.hint ?? "", d.code).not.toMatch(italianismi);
    }
  });

  it("mantiene stabili i codici, che non sono testo", async () => {
    const { validate } = await import("../src/validate/validate.js");
    for (const lang of ["it", "en"]) {
      setLanguage(lang);
      const codes = validate({ people: [] }).map(d => d.code);
      expect(codes, lang).toEqual(["E002"]);
    }
  });
});
