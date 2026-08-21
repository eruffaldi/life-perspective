import { describe, expect, it } from "vitest";
import {
  DateFormatError, decYear, fmtDate, parseDate, shiftYears, tryParseDate
} from "../src/core/date.js";

describe("parseDate", () => {
  it("deduce la precisione dalla lunghezza della stringa", () => {
    expect(parseDate("1921").prec).toBe("y");
    expect(parseDate("1998-11").prec).toBe("m");
    expect(parseDate("2008-07-12").prec).toBe("d");
  });

  it("tratta ogni data come un intervallo, non come un istante", () => {
    const anno = parseDate("1921");
    expect(anno.t0).toBe(1921);
    expect(anno.t1).toBe(1922);

    const mese = parseDate("1998-11");
    expect(mese.t1 - mese.t0).toBeCloseTo(1 / 12, 2);

    const giorno = parseDate("2008-07-12");
    expect(giorno.t1 - giorno.t0).toBeCloseTo(1 / 365, 3);
  });

  it("colloca `mid` dentro l'intervallo", () => {
    const d = parseDate("2008-07-12");
    expect(d.mid).toBeGreaterThan(d.t0);
    expect(d.mid).toBeLessThan(d.t1);
  });

  it("rifiuta i formati non ISO", () => {
    expect(() => parseDate("12/07/2008")).toThrow(DateFormatError);
    expect(() => parseDate("ieri")).toThrow(DateFormatError);
    expect(() => parseDate("")).toThrow(DateFormatError);
  });

  it("conserva la stringa originale", () => {
    expect(parseDate(" 1998-11 ").raw).toBe("1998-11");
  });

  it("tiene conto degli anni bisestili", () => {
    const bisestile = decYear(new Date(Date.UTC(2020, 6, 1)));
    const normale = decYear(new Date(Date.UTC(2021, 6, 1)));
    // Il 1º luglio cade a una frazione d'anno leggermente diversa.
    expect(bisestile - 2020).not.toBeCloseTo(normale - 2021, 5);
  });
});

describe("tryParseDate", () => {
  it("restituisce null invece di sollevare", () => {
    expect(tryParseDate("boh")).toBeNull();
    expect(tryParseDate(null)).toBeNull();
    expect(tryParseDate(undefined)).toBeNull();
    expect(tryParseDate("1921")?.y).toBe(1921);
  });
});

describe("fmtDate", () => {
  it("mostra solo ciò che la precisione consente", () => {
    expect(fmtDate(parseDate("1921"))).toBe("1921");
    expect(fmtDate(parseDate("1998-11"))).toBe("nov 1998");
    expect(fmtDate(parseDate("2008-07-12"))).toBe("12 lug 2008");
  });

  it("gestisce l'assenza di data", () => {
    expect(fmtDate(null)).toBe("—");
    expect(fmtDate(undefined)).toBe("—");
  });
});

describe("shiftYears", () => {
  it("conserva la precisione originale", () => {
    expect(shiftYears(parseDate("1921"), 10)).toBe("1931");
    expect(shiftYears(parseDate("1998-11"), 2)).toBe("2000-11");
    expect(shiftYears(parseDate("2008-07-12"), 25)).toBe("2033-07-12");
  });

  it("normalizza le cifre di mese e giorno", () => {
    expect(shiftYears(parseDate("2008-7-2"), 1)).toBe("2009-07-02");
  });

  it("accetta scostamenti negativi", () => {
    expect(shiftYears(parseDate("2028-04-12"), -10)).toBe("2018-04-12");
  });
});
