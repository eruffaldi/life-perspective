/**
 * Cronologia ed età allineate: la stessa funzione, con l'asse traslato.
 *
 * In vista allineata ogni persona viene spostata di -nascita, così le vite si
 * sovrappongono a partire da zero. È l'unica prospettiva che permette di
 * confrontare le generazioni.
 */
import "./chart.css";
import { fmtDate } from "../core/date.js";
import { ageShort, ageText, distText } from "../core/age.js";
import { maxAge, nowDate, roleLabel } from "../core/model.js";
import { trackLabel } from "../core/tracks.js";
import { el } from "./dom.js";
import { attachTip, type TipContent } from "./tooltip.js";
import { t } from "../i18n/index.js";
import { assignLanes, labelBox, placeLabels } from "./labels.js";
import { model, state, visible } from "./state.js";
import type { EventItem, Mark, Model, Period, Person, Recurrence } from "../core/types.js";

/** Larghezza minima sotto la quale una barra diventa un segno pieno. */
const TINY_BAR = 4;
/**
 * Sotto questa larghezza dentro la barra non entra nemmeno una lettera, e
 * l'etichetta va cercata fuori. La soglia è bassa di proposito: fra una parola
 * troncata e una scritta che sborda di tre anni, il troncamento mente meno.
 */
const MIN_INSIDE = 18;
/** Banda in cui vivono l'arco di vita e i rombi degli eventi. */
const MARK_BAND = 22;
/** Altezza di una riga di etichette sotto la banda dei marcatori. */
const LANE_H = 14;

type Scale = (t: number) => number;

export function renderChart(pane: HTMLElement, aligned: boolean): void {
  const M = model();
  pane.textContent = "";

  const lo = aligned ? 0 : M.span.lo;
  const hi = aligned ? maxAge(M) : M.span.hi;
  const width = (hi - lo) * state.ppy;
  const X: Scale = t => (t - lo) * state.ppy;

  const inner = el("div", "inner");
  inner.style.width = "calc(var(--gutter) + " + width + "px)";
  inner.appendChild(grid(M, lo, hi, width, X, aligned));
  inner.appendChild(axis(lo, hi, width, aligned));

  for (const person of M.people) {
    inner.appendChild(personBlock(M, person, aligned ? -person.birth.mid : 0, X, width, aligned));
  }
  if (!aligned && visible("world") && (M.context.length || M.contextPeriods.length)) {
    inner.appendChild(contextBlock(M, X, width));
  }
  pane.appendChild(inner);
}

function grid(M: Model, lo: number, hi: number, width: number,
              X: Scale, aligned: boolean): HTMLElement {
  const box = el("div", "grid");
  box.style.width = width + "px";
  const step = state.ppy < 9 ? 10 : state.ppy < 22 ? 5 : 1;
  for (let y = Math.ceil(lo / step) * step; y <= hi; y += step) {
    const line = el("div", "gline" + (y % 10 === 0 ? " dec" : ""));
    line.style.left = X(y) + "px";
    box.appendChild(line);
  }
  if (!aligned) {
    const wash = el("div", "futurewash");
    wash.style.left = X(M.now) + "px";
    wash.style.width = Math.max(0, width - X(M.now)) + "px";
    box.appendChild(wash);
    const meridian = el("div", "meridian");
    meridian.style.left = X(M.now) + "px";
    meridian.dataset["label"] = t().app.today;
    box.appendChild(meridian);
  }
  return box;
}

function axis(lo: number, hi: number, width: number, aligned: boolean): HTMLElement {
  const box = el("div", "axis");
  box.appendChild(el("div", "axishead", aligned ? t().app.age : t().app.year));
  const row = el("div", "axisrow");
  row.style.width = width + "px";
  const step = state.ppy < 7 ? 20 : state.ppy < 14 ? 10 : state.ppy < 34 ? 5 : 1;
  for (let y = Math.ceil(lo / step) * step; y <= hi; y += step) {
    const tick = el("div", "tick" + (y % 10 === 0 ? " dec" : ""));
    tick.style.left = (y - lo) * state.ppy + "px";
    row.appendChild(tick);
    const label = el("div", "lab", String(y));
    label.style.left = (y - lo) * state.ppy + "px";
    row.appendChild(label);
  }
  box.appendChild(row);
  return box;
}

function personBlock(M: Model, person: Person, offset: number, X: Scale,
                     width: number, aligned: boolean): HTMLElement {
  const box = el("div", "person");
  box.style.color = person.color;

  const head = el("div", "prow head");
  const label = el("div", "plabel");
  const swatch = el("div", "swatch");
  swatch.style.background = person.color;
  const names = el("div");
  names.appendChild(el("div", "pname", person.name));
  names.appendChild(el("div", "pmeta", aligned
    ? roleLabel(person.role)
    : fmtDate(person.birth) + (person.death ? " – " + fmtDate(person.death) : "")));
  label.appendChild(swatch);
  label.appendChild(names);

  const track = el("div", "track");
  track.style.width = width + "px";
  track.style.setProperty("--mark-y", (MARK_BAND / 2) + "px");
  track.appendChild(lifeBar(M, person, offset, X));
  const lanes = layoutMarks(M, person.marks.filter(m => visible(m.tk)), offset, X, track);
  track.style.height = (MARK_BAND + lanes * LANE_H) + "px";

  head.appendChild(label);
  head.appendChild(track);
  box.appendChild(head);

  for (const row of person.rows.filter(r => visible(r.track))) {
    const line = el("div", "prow");
    const rowLabel = el("div", "plabel");
    rowLabel.appendChild(el("div", "swatch"));
    rowLabel.appendChild(el("div", "tname", row.label ?? trackLabel(row.track)));
    const rowTrack = el("div", "track");
    rowTrack.style.width = width + "px";
    // La scritta sta DENTRO il rettangolo, troncata se non ci sta: un'etichetta
    // che sborda fa sembrare il periodo piu' lungo di quanto sia, ed e' un
    // errore di lettura peggiore di una parola tagliata.
    // Restano fuori solo le barre troppo strette per contenere qualsiasi cosa —
    // una vacanza di due settimane — e quelle si vagliano fra loro.
    const outside = row.items.filter(q => barWidth(M, q, offset, X) < MIN_INSIDE);
    const labelled = placeLabels(outside.map(period => ({
      item: period,
      box: labelBox(X(period.start.mid + offset), 0, barText(period), 6),
      priority: (period.end ? period.end.mid : M.now) - period.start.mid
    })));
    for (const period of row.items) {
      const wide = barWidth(M, period, offset, X) >= MIN_INSIDE;
      rowTrack.appendChild(bar(M, period, offset, X, wide || labelled.has(period), wide));
    }
    line.appendChild(rowLabel);
    line.appendChild(rowTrack);
    box.appendChild(line);
  }
  return box;
}

function lifeBar(M: Model, person: Person, offset: number, X: Scale): HTMLElement {
  const end = person.death ? person.death.mid : Math.min(M.horizon, Math.max(M.now, person.birth.mid));
  const node = el("div", "lifebar");
  node.style.left = X(person.birth.mid + offset) + "px";
  node.style.width = Math.max(2, (end - person.birth.mid) * state.ppy) + "px";
  node.style.background = person.color;
  node.style.opacity = ".22";
  attachTip(node, () => ({
    t: person.name,
    d: fmtDate(person.birth) + (person.death ? " – " + fmtDate(person.death) : ""),
    note: person.death
      ? t().chart.lived(Math.floor(person.death.mid - person.birth.mid))
      : t().chart.todayAge(ageText(person, nowDate(M), M.settings.ageDisplay).txt)
  }));
  return node;
}

function contextBlock(M: Model, X: Scale, width: number): HTMLElement {
  const box = el("div", "person contextlane");
  box.style.color = "#4E656D";

  const head = el("div", "prow head");
  const label = el("div", "plabel");
  label.appendChild(el("div", "swatch"));
  const names = el("div");
  names.appendChild(el("div", "pname", t().chart.context));
  label.appendChild(names);
  const track = el("div", "track");
  track.style.width = width + "px";
  track.style.setProperty("--mark-y", (MARK_BAND / 2) + "px");
  const lanes = layoutMarks(M, M.context.map(e => ({ kind: "event", e } as Mark)), 0, X, track);
  track.style.height = (MARK_BAND + lanes * LANE_H) + "px";
  head.appendChild(label);
  head.appendChild(track);
  box.appendChild(head);

  for (const period of M.contextPeriods) {
    const row = el("div", "prow");
    const rowLabel = el("div", "plabel");
    rowLabel.appendChild(el("div", "swatch"));
    rowLabel.appendChild(el("div", "tname", trackLabel(period.track)));
    const rowTrack = el("div", "track");
    rowTrack.style.width = width + "px";
    rowTrack.appendChild(bar(M, period, 0, X));
    row.appendChild(rowLabel);
    row.appendChild(rowTrack);
    box.appendChild(row);
  }
  return box;
}

/** Cosa c'è scritto su una barra: sui documenti conta la scadenza. */
function barText(period: Period): string {
  const isDoc = (period.tk ?? period.track) === "doc";
  return isDoc && period.end ? t().chart.expires(fmtDate(period.end)) : period.label;
}

/** Larghezza in pixel di una barra, con lo stesso minimo usato al disegno. */
function barWidth(M: Model, period: Period, offset: number, X: Scale): number {
  const t0 = period.start.mid + offset;
  const t1 = (period.end ? period.end.mid : M.now) + offset;
  return Math.max(3, X(t1) - X(t0));
}

function bar(M: Model, period: Period, offset: number, X: Scale,
             showLabel = true, inside = true): HTMLElement {
  const t0 = period.start.mid + offset;
  const t1 = (period.end ? period.end.mid : M.now) + offset;
  const width = Math.max(3, (t1 - t0) * state.ppy);

  const holder = el("div");
  holder.style.display = "contents";

  const node = el("div", "bar"
    + (period.end ? "" : " open")
    + (period.circa ? " circa" : "")
    + ((period.tk ?? period.track) === "doc" ? " doc" : "")
    + (width <= TINY_BAR ? " tiny" : ""));
  node.style.left = X(t0) + "px";
  node.style.width = width + "px";

  const wrap = el("div", "barwrap" + (inside ? " inside" : ""));
  wrap.style.left = X(t0) + "px";
  wrap.style.width = width + "px";
  if (showLabel) wrap.appendChild(el("div", "barlab", barText(period)));
  attachTip(wrap, () => tipForPeriod(M, period));

  holder.appendChild(node);
  holder.appendChild(wrap);
  return holder;
}

/**
 * I marcatori restano tutti in vista: quando le scritte non ci stanno una
 * accanto all'altra, scendono su una riga in più invece di sparire. Un rigo
 * verticale collega il rombo alla sua etichetta, altrimenti con tre righe non
 * si capisce più quale appartiene a chi.
 *
 * @returns quante righe di etichette servono, per dimensionare la corsia
 */
function layoutMarks(M: Model, marks: readonly Mark[], offset: number,
                     X: Scale, track: HTMLElement): number {
  const xs = marks.map(m => X(m.e.date.mid + offset));
  const lanes = assignLanes(marks.map((mark, i) => {
    const source = mark.kind === "rec" ? (mark.e as Recurrence).of : (mark.e as EventItem);
    return {
      item: mark,
      box: labelBox(xs[i]!, 0, mark.e.label, 9),
      priority: mark.kind === "rec" ? 0 : source.generated ? 1 : 2
    };
  }));
  marks.forEach((mark, i) => {
    track.appendChild(markNode(M, mark, xs[i]!, lanes.get(mark)));
  });
  return lanes.size ? Math.max(...lanes.values()) + 1 : 0;
}

function markNode(M: Model, mark: Mark, x: number, lane: number | undefined): HTMLElement {
  const isRec = mark.kind === "rec";
  const source = isRec ? (mark.e as Recurrence).of : (mark.e as EventItem);
  const holder = el("div");
  holder.style.display = "contents";

  const node = el("div", "mk" + (isRec ? " rec" : "") + (source.generated ? " soft" : ""));
  node.style.left = x + "px";
  // La larghezza viene dal CSS: sotto un puntatore grossolano cresce fino a
  // una misura da polpastrello.
  const hit = el("div", "hit");
  hit.style.left = x + "px";
  hit.style.height = MARK_BAND + "px";
  attachTip(hit, () => tipForMoment(M, mark, isRec));

  holder.appendChild(node);
  holder.appendChild(hit);
  if (lane != null) {
    const text = el("div", "mklab", mark.e.label);
    text.style.left = x + "px";
    text.style.top = (MARK_BAND / 2 + 6 + lane * LANE_H) + "px";
    if (source.generated || isRec) text.style.color = "var(--ink-soft)";
    holder.appendChild(text);
    if (lane > 0) {
      const leader = el("div", "mkline");
      leader.style.left = x + "px";
      leader.style.top = (MARK_BAND / 2 + 4) + "px";
      leader.style.height = (lane * LANE_H) + "px";
      holder.appendChild(leader);
    }
  }
  return holder;
}

export function agesAt(M: Model, dt: Parameters<typeof ageShort>[1]): [string, string][] {
  return M.people.map(p => [p.name, ageShort(p, dt, M.settings.ageDisplay)]);
}

function tipForMoment(M: Model, mark: Mark, isRec: boolean): TipContent {
  const item = mark.e;
  const source = isRec ? (item as Recurrence).of : (item as EventItem);
  const circa = source.circa;
  const place = source.placeName;
  const tip: TipContent = {
    t: item.label,
    d: fmtDate(item.date) + (circa ? t().chart.circa : "") + (place ? " · " + place : ""),
    rows: agesAt(M, item.date),
    note: distText(item.date.mid, M.now) + (isRec ? t().chart.recurrenceNote : "")
  };
  return tip;
}

function tipForPeriod(M: Model, period: Period): TipContent {
  const mode = M.settings.ageDisplay;
  const rows: [string, string][] = M.people.map(p => [
    p.name,
    ageShort(p, period.start, mode) + (period.end ? " → " + ageShort(p, period.end, mode) : "")
  ]);
  let note: string;
  if (period.end) {
    note = period.end.t0 > M.now
      ? t().chart.endsIn(distText(period.end.mid, M.now))
      : t().chart.lasted(Math.max(1, Math.round(period.end.mid - period.start.mid)));
  } else {
    note = t().chart.startedOngoing(distText(period.start.mid, M.now));
  }
  return {
    t: period.label,
    d: fmtDate(period.start) + " – " + (period.end ? fmtDate(period.end) : t().chart.ongoing)
       + (period.placeName ? " · " + period.placeName : ""),
    rows,
    note
  };
}
