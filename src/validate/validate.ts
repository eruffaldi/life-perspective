/**
 * Validazione.
 *
 * Raccoglie TUTTE le diagnostiche in una passata invece di fermarsi alla
 * prima: chi incolla un JSON deve poter arrivare a un documento valido senza
 * un ciclo correggi-riprova per ogni virgola fuori posto.
 *
 * Gli errori bloccano il caricamento, gli avvisi no. I codici sono stabili e
 * catalogati in docs/requisiti.md: non vanno riusati per significati diversi.
 */
import { fmtDate, parseDate, todayDec } from "../core/date.js";
import { KNOWN_CATEGORIES, TRACKS, isTrackKey } from "../core/tracks.js";
import { isStageKey } from "../core/school.js";
import { isDocType } from "../core/documents.js";
import { STAGE_KEYS, DOC_TYPES } from "../core/types.js";
import { t } from "../i18n/index.js";
import type {
  DateVal, Diagnostic, RawDocumentRoot, RawEvent, RawPeriod, RawPlace
} from "../core/types.js";

const TRACK_LIST = TRACKS.map(t => t.k).join(", ");
const STAGE_LIST = STAGE_KEYS.join(", ");

/** Anni oltre i quali una scadenza passata è probabilmente un dato vecchio. */
const STALE_YEARS = 10;
/** Durata oltre la quale una "vacanza" è più probabilmente un trasferimento. */
const LONG_HOLIDAY = 0.5;

export function validate(data: unknown): Diagnostic[] {
  const out: Diagnostic[] = [];
  const R = t().rules;
  /** Messaggio e indicazione arrivano insieme dal catalogo: non possono
   *  finire in lingue diverse. Il codice resta quello del catalogo delle
   *  regole, che è stabile e indipendente dalla lingua. */
  const say = (level: "error" | "warning", code: string, path: string,
               text: { m: string; h: string }): void => {
    out.push({ level, code, path, message: text.m, hint: text.h });
  };
  const err = (code: string, path: string, text: { m: string; h: string }): void =>
    say("error", code, path, text);
  const warn = (code: string, path: string, text: { m: string; h: string }): void =>
    say("warning", code, path, text);

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    err("E001", "", R.E001());
    return out;
  }
  const doc = data as RawDocumentRoot;

  /** Nomi di luogo effettivamente usati: serve per W005, a fine scansione. */
  const usedPlaces = new Set<string>();
  const ids = new Map<string, string>();
  const names = new Map<string, number>();
  const births = new Map<number, DateVal>();
  const deaths = new Map<number, DateVal>();
  /**
   * Persone la cui vita è già sbagliata alla radice. Senza questo, una data di
   * morte impossibile genera un avviso «successivo alla morte» per ogni evento
   * e ogni periodo: ventitré segnalazioni derivate che seppelliscono l'unica
   * che conta. Chi corregge la causa vede sparire tutto il resto da solo.
   */
  const brokenLifespan = new Set<number>();

  /* ---------------------------------------------------------------- *
   * Date                                                              *
   * ---------------------------------------------------------------- */
  function date(value: unknown, path: string, label: string): DateVal | null {
    if (value == null) return null;
    const s = String(value).trim();
    const m = /^(-?\d{1,4})(?:-(\d{1,2})(?:-(\d{1,2}))?)?$/.exec(s);
    if (!m) {
      err("E005", path, R.E005(label, s));
      return null;
    }
    const y = Number(m[1]);
    const mo = m[2] != null ? Number(m[2]) : null;
    const d = m[3] != null ? Number(m[3]) : null;

    if (mo != null && (mo < 1 || mo > 12)) {
      err("E006", path, R.E006month(label, mo));
      return null;
    }
    if (d != null && mo != null) {
      const last = new Date(Date.UTC(y, mo, 0)).getUTCDate();
      if (d < 1 || d > last) {
        err("E006", path, R.E006day(label, d, last));
        return null;
      }
    }
    if ((m[2] && m[2].length === 1) || (m[3] && m[3].length === 1)) {
      const canonical = y +
        (mo != null ? "-" + String(mo).padStart(2, "0") : "") +
        (d != null ? "-" + String(d).padStart(2, "0") : "");
      warn("W010", path, R.W010(label, s, canonical));
    }
    try {
      return parseDate(s);
    } catch {
      return null;
    }
  }

  /* ---------------------------------------------------------------- *
   * Impostazioni                                                      *
   * ---------------------------------------------------------------- */
  const settings = doc.settings ?? {};
  if (settings.ageDisplay && !["midpoint", "range"].includes(settings.ageDisplay)) {
    err("E019", "settings.ageDisplay", R.E019(settings.ageDisplay));
  }
  const horizon = settings.horizon != null
    ? date(settings.horizon, "settings.horizon", "Orizzonte")
    : parseDate("2060");
  if (settings.milestones != null &&
      (!Array.isArray(settings.milestones) ||
       settings.milestones.some(n => !Number.isInteger(n) || n <= 0))) {
    err("E016", "settings.milestones", R.E016milestones());
  }
  if (settings.filters != null && !Array.isArray(settings.filters)) {
    err("E021", "settings.filters", R.E021filters(TRACK_LIST));
  }

  /* ---------------------------------------------------------------- *
   * Helper condivisi                                                  *
   * ---------------------------------------------------------------- */
  function place(value: RawPlace | undefined, path: string): void {
    if (value == null) return;
    if (typeof value === "string") { usedPlaces.add(value); return; }
    if (typeof value !== "object" || !value.name) {
      err("E015", path, R.E015place());
      return;
    }
    usedPlaces.add(value.name);
    if (value.coord != null) checkCoord(value.coord, path + ".coord");
  }

  function checkCoord(coord: unknown, path: string): void {
    if (!Array.isArray(coord) || coord.length < 2 ||
        typeof coord[0] !== "number" || typeof coord[1] !== "number") {
      err("E015", path, R.E015coord());
      return;
    }
    const [lat, lon] = coord as [number, number];
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      err("E015", path, R.E015range(lat, lon));
    }
  }

  function whoRefs(x: { who?: string[] }, path: string): void {
    if (x.who == null) return;
    if (!Array.isArray(x.who)) {
      err("E021", path + ".who", R.E021who());
      return;
    }
    x.who.forEach((id, k) => {
      if (!ids.has(id)) {
        err("E008", path + ".who[" + k + "]", R.E008(id, [...ids.keys()].join(", ")));
      }
    });
    // Solo se l'id esiste: altrimenti l'avviso si accavallerebbe a E008.
    const first = x.who[0];
    if (x.who.length === 1 && first != null && ids.has(first)) {
      warn("W004", path + ".who", R.W004(ids.get(first) ?? first));
    }
  }

  function vocabulary(x: { category?: string; track?: string }, path: string): void {
    if (x.category != null && !KNOWN_CATEGORIES.includes(x.category)) {
      warn("W006", path + ".category", R.W006category(x.category, KNOWN_CATEGORIES.join(", ")));
    }
    if (x.track != null && !isTrackKey(x.track)) {
      warn("W006", path + ".track", R.W006track(x.track, TRACK_LIST));
    }
  }

  function withinLife(dt: DateVal | null, personIx: number | null,
                      path: string, label: string): void {
    if (personIx == null || !dt) return;
    if (brokenLifespan.has(personIx)) return;
    const b = births.get(personIx);
    const d = deaths.get(personIx);
    if (b && dt.t1 < b.t0) {
      warn("W002", path, R.W002before(label, fmtDate(b)));
    }
    if (d && dt.t0 > d.t1) {
      warn("W002", path, R.W002after(label, fmtDate(d)));
    }
  }

  function checkEvent(e: RawEvent, path: string, personIx: number | null): void {
    if (!e || typeof e !== "object") {
      err("E011", path, R.E011eventNotObject());
      return;
    }
    if (!e.label) warn("W015", path + ".label", R.W015event());
    if (e.date == null) {
      err("E011", path + ".date", R.E011noDate());
    }
    if (e.start != null || e.end != null) {
      err("E011", path, R.E011eventSpan());
    }
    const d = date(e.date, path + ".date", "Data");
    withinLife(d, personIx, path + ".date", "L'evento");
    if (d && horizon && d.t0 > horizon.t1) {
      warn("W003", path + ".date", R.W003(fmtDate(horizon)));
    }
    if (e.recurrences != null && e.recurrences !== true &&
        (!Array.isArray(e.recurrences) ||
         e.recurrences.some(n => !Number.isInteger(n) || n <= 0))) {
      err("E016", path + ".recurrences", R.E016recurrences());
    }
    place(e.place, path + ".place");
    whoRefs(e, path);
    vocabulary(e, path);
  }

  function checkPeriod(q: RawPeriod, path: string, personIx: number | null,
                       isHoliday = false): void {
    if (!q || typeof q !== "object") {
      err("E011", path, R.E011periodNotObject());
      return;
    }
    if (!q.label) warn("W015", path + ".label", R.W015period());
    if (q.start == null) {
      err("E011", path + ".start", R.E011noStart());
    }
    if (q.date != null) {
      err("E011", path + ".date", R.E011periodDate());
    }
    const s = date(q.start, path + ".start", "Inizio");
    const e = q.end != null ? date(q.end, path + ".end", "Fine") : null;
    if (s && e && e.t1 <= s.t0) {
      err("E009", path + ".end", R.E009end(fmtDate(s), fmtDate(e)));
    }
    withinLife(s, personIx, path + ".start", "Il periodo");
    if (s && horizon && s.t0 > horizon.t1) {
      warn("W003", path + ".start", R.W003(fmtDate(horizon)));
    }
    if (q.replaces != null && !isStageKey(q.replaces)) {
      err("E012", path + ".replaces", R.E012(String(q.replaces), STAGE_LIST));
    }
    if (q.replaces != null && personIx != null && !doc.people?.[personIx]?.school) {
      warn("W011", path + ".replaces", R.W011());
    }
    if (isHoliday && s && e && (e.mid - s.mid) > LONG_HOLIDAY) {
      warn("W012", path, R.W012());
    }
    place(q.place, path + ".place");
    whoRefs(q, path);
    vocabulary(q, path);
  }

  /* ---------------------------------------------------------------- *
   * Persone                                                           *
   * ---------------------------------------------------------------- */
  if (!Array.isArray(doc.people)) {
    err("E002", "people", R.E002missing());
    return out;
  }
  if (!doc.people.length) {
    err("E002", "people", R.E002empty());
  }

  doc.people.forEach((p, i) => {
    const P = "people[" + i + "]";
    if (!p || typeof p !== "object") {
      err("E003", P, R.E003notObject());
      return;
    }
    const who = p.name ?? p.id ?? "#" + i;
    if (!p.name) err("E003", P + ".name", R.E003noName());

    if (!p.id) {
      warn("W014", P + ".id", R.W014(who));
    } else if (ids.has(p.id)) {
      err("E007", P + ".id", R.E007(p.id, ids.get(p.id) ?? ""));
    } else {
      ids.set(p.id, who);
    }

    if (p.name) {
      if (names.has(p.name)) {
        warn("W007", P + ".name", R.W007(p.name));
      }
      names.set(p.name, i);
    }

    if (p.birth == null) {
      err("E004", P + ".birth", R.E004(who));
    }
    const b = date(p.birth, P + ".birth", "Nascita di " + who);
    if (b) births.set(i, b);
    const d = p.death != null ? date(p.death, P + ".death", "Morte di " + who) : null;
    if (d) deaths.set(i, d);
    if (b && d && d.t1 <= b.t0) {
      err("E010", P + ".death", R.E010(who, fmtDate(b), fmtDate(d)));
      brokenLifespan.add(i);
    }

    if (p.color != null && !/^#[0-9a-fA-F]{6}$/.test(String(p.color))) {
      warn("W009", P + ".color", R.W009(String(p.color)));
    }

    if (p.school != null) {
      if (typeof p.school !== "object") {
        err("E013", P + ".school", R.E013notObject());
      } else {
        if (p.school.through != null && !isStageKey(p.school.through)) {
          err("E013", P + ".school.through", R.E013stage(p.school.through, STAGE_LIST));
        }
        for (const [k, v] of Object.entries(p.school.delays ?? {})) {
          if (!isStageKey(k)) {
            err("E014", P + ".school.delays." + k, R.E014key(k, STAGE_LIST));
          } else if (!Number.isInteger(v) || v < 0) {
            err("E014", P + ".school.delays." + k, R.E014value());
          }
        }
      }
    }

    (p.documents ?? []).forEach((docItem, j) => {
      const Q = P + ".documents[" + j + "]";
      if (docItem.expires == null) {
        err("E017", Q + ".expires", R.E017());
      }
      const e = date(docItem.expires, Q + ".expires", "Scadenza");
      if (docItem.type != null && !isDocType(docItem.type) && docItem.validity == null) {
        warn("W016", Q + ".type", R.W016(docItem.type, DOC_TYPES.join(", ")));
      }
      if (docItem.validity != null &&
          (!Number.isInteger(docItem.validity) || docItem.validity <= 0)) {
        err("E018", Q + ".validity", R.E018());
      }
      if (e && b && e.t1 < b.t0) {
        err("E009", Q + ".expires", R.E009doc(fmtDate(b), fmtDate(e)));
      }
      if (e && e.t1 < todayDec() - STALE_YEARS) {
        warn("W008", Q + ".expires", R.W008(fmtDate(e)));
      }
    });

    (p.periods ?? []).forEach((q, j) => checkPeriod(q, P + ".periods[" + j + "]", i));
    (p.events ?? []).forEach((e, j) => checkEvent(e, P + ".events[" + j + "]", i));
  });

  /* ---------------------------------------------------------------- *
   * Radice                                                            *
   * ---------------------------------------------------------------- */
  (doc.events ?? []).forEach((e, i) => checkEvent(e, "events[" + i + "]", null));
  (doc.periods ?? []).forEach((q, i) => checkPeriod(q, "periods[" + i + "]", null));
  (doc.holidays ?? []).forEach((q, i) => checkPeriod(q, "holidays[" + i + "]", null, true));

  if (doc.meta?.anchor && !ids.has(doc.meta.anchor)) {
    err("E020", "meta.anchor", R.E020(doc.meta.anchor, [...ids.keys()].join(", ")));
  }

  if (doc.places != null) {
    if (typeof doc.places !== "object" || Array.isArray(doc.places)) {
      err("E021", "places", R.E021places());
    } else {
      for (const [k, v] of Object.entries(doc.places)) checkCoord(v, "places." + k);
      // `usedPlaces` è completo solo ora: i luoghi si raccolgono scorrendo
      // persone, eventi e periodi, che vengono prima.
      for (const k of Object.keys(doc.places)) {
        if (!usedPlaces.has(k)) {
          warn("W005", "places." + k, R.W005(k));
        }
      }
    }
  }

  return out;
}

export function hasErrors(diags: readonly Diagnostic[]): boolean {
  return diags.some(d => d.level === "error");
}
