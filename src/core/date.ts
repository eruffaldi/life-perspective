/**
 * Date a precisione variabile.
 *
 * La precisione si deduce dalla lunghezza della stringa e non esiste un campo
 * separato che possa andare fuori sincrono con il valore. Ogni data è un
 * intervallo [t0, t1) in anni decimali: da qui discende che le età derivate da
 * una data imprecisa sono a loro volta imprecise, e vengono marcate come tali.
 */
import type { DateVal, Precision } from "./types.js";
import { t } from "../i18n/index.js";

export class DateFormatError extends Error {
  constructor(public readonly value: string) {
    super('Data non riconosciuta: "' + value + '" (usa AAAA, AAAA-MM o AAAA-MM-GG)');
    this.name = "DateFormatError";
  }
}

/** Anno decimale: la frazione tiene conto degli anni bisestili. */
export function decYear(d: Date): number {
  const y = d.getUTCFullYear();
  const a = Date.UTC(y, 0, 1);
  const b = Date.UTC(y + 1, 0, 1);
  return y + (d.getTime() - a) / (b - a);
}

function ymd(y: number, m: number, d: number): number {
  return decYear(new Date(Date.UTC(y, m - 1, d)));
}

function make(y: number, m: number, d: number, prec: Precision,
              t0: number, t1: number, raw: string): DateVal {
  return { y, m, d, prec, t0, t1, mid: (t0 + t1) / 2, raw };
}

export function parseDate(value: string | number): DateVal {
  const s = String(value).trim();
  let m: RegExpExecArray | null;
  if ((m = /^(-?\d{1,4})$/.exec(s))) {
    const y = Number(m[1]);
    return make(y, 1, 1, "y", y, y + 1, s);
  }
  if ((m = /^(-?\d{1,4})-(\d{1,2})$/.exec(s))) {
    const y = Number(m[1]), mo = Number(m[2]);
    return make(y, mo, 1, "m", ymd(y, mo, 1), ymd(y, mo + 1, 1), s);
  }
  if ((m = /^(-?\d{1,4})-(\d{1,2})-(\d{1,2})$/.exec(s))) {
    const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
    return make(y, mo, d, "d", ymd(y, mo, d), ymd(y, mo, d + 1), s);
  }
  throw new DateFormatError(s);
}

/** Come `parseDate`, ma restituisce null invece di sollevare. */
export function tryParseDate(value: string | number | null | undefined): DateVal | null {
  if (value == null) return null;
  try {
    return parseDate(value);
  } catch {
    return null;
  }
}

/**
 * I nomi dei mesi vengono dal catalogo attivo. La forma della data resta
 * quella italiana anche in inglese — giorno, mese, anno — perché la precisione
 * variabile si legge meglio così: "1921", "nov 1998", "12 lug 2008" degradano
 * togliendo pezzi da sinistra.
 */
export function fmtDate(dt: DateVal | null | undefined): string {
  if (!dt) return t().app.unknown;
  if (dt.prec === "y") return String(dt.y);
  const mon = t().months[dt.m - 1] ?? "?";
  if (dt.prec === "m") return mon + " " + dt.y;
  return dt.d + " " + mon + " " + dt.y;
}

/** Sposta di n anni conservando la precisione originale. */
export function shiftYears(dt: DateVal, n: number): string {
  const y = dt.y + n;
  if (dt.prec === "y") return String(y);
  const mm = String(dt.m).padStart(2, "0");
  if (dt.prec === "m") return y + "-" + mm;
  return y + "-" + mm + "-" + String(dt.d).padStart(2, "0");
}

export function todayDec(): number {
  return decYear(new Date());
}

/** Istante puntuale, per confronti con "adesso". */
export function instant(t: number): DateVal {
  return { y: Math.floor(t), m: 1, d: 1, prec: "d", t0: t, t1: t, mid: t, raw: String(t) };
}
