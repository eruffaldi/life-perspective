/**
 * Scadenze dei documenti.
 *
 * Non si elencano i rinnovi: si dichiara la scadenza corrente e il tipo, e la
 * catena si proietta fino all'orizzonte. La validità dipende dall'età AL
 * RILASCIO, non da quella attuale — una patente che scade dopo i cinquant'anni
 * si rinnova per cinque anni, non per dieci.
 */
import { parseDate, shiftYears } from "./date.js";
import type { DateVal, Period, RawDocument } from "./types.js";
import { DOC_TYPES, type DocType } from "./types.js";

export function isDocType(v: unknown): v is DocType {
  return typeof v === "string" && (DOC_TYPES as readonly string[]).includes(v);
}

/** Anni di validità, o null se il tipo non ha regole note. */
export function docValidity(type: string | undefined, ageAtIssue: number): number | null {
  if (type === "patente") {
    if (ageAtIssue < 50) return 10;
    if (ageAtIssue < 70) return 5;
    if (ageAtIssue < 80) return 3;
    return 2;
  }
  if (type === "passaporto" || type === "identita") {
    if (ageAtIssue < 3) return 3;
    if (ageAtIssue < 18) return 5;
    return 10;
  }
  return null;
}

const FALLBACK_VALIDITY = 10;
const MAX_RENEWALS = 40;

export class DocumentError extends Error {}

export function generateDocs(
  documents: readonly RawDocument[] | undefined,
  birth: DateVal,
  horizon: number
): Period[] {
  const out: Period[] = [];
  for (const doc of documents ?? []) {
    if (!doc.expires) {
      throw new DocumentError("Documento senza `expires`: " + (doc.label ?? doc.type ?? "?"));
    }
    let expiry = parseDate(doc.expires);
    for (let guard = 0; guard < MAX_RENEWALS; guard++) {
      const back = doc.validity
        ?? docValidity(doc.type, Math.floor(expiry.mid - birth.mid))
        ?? FALLBACK_VALIDITY;
      out.push({
        label: doc.label ?? doc.type ?? "Documento",
        start: parseDate(shiftYears(expiry, -back)),
        end: expiry,
        track: "doc",
        placeName: null,
        circa: false,
        generated: true
      });
      if (expiry.t0 > horizon) break;
      const ageAtIssue = Math.floor(expiry.mid - birth.mid);
      const forward = doc.validity ?? docValidity(doc.type, ageAtIssue) ?? FALLBACK_VALIDITY;
      expiry = parseDate(shiftYears(expiry, forward));
    }
  }
  return out;
}
