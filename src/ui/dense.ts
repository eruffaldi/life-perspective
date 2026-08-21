/**
 * Anni densi e matrice: due letture dello stesso elenco di momenti.
 *
 * "Denso" significa che in un anno si accavallano due o più cose. È lì che si
 * vede la forma dei prossimi vent'anni, più che nel grafico.
 */
import "./dense.css";
import { fmtDate, parseDate, shiftYears } from "../core/date.js";
import { ageShort, distText } from "../core/age.js";
import { evTrack } from "../core/tracks.js";
import { el } from "./dom.js";
import { model, state, visible } from "./state.js";
import type { DateVal, EventItem, Model, Period, Person, Recurrence } from "../core/types.js";

/** Compleanni che vale la pena segnare: il resto è rumore. */
const ROUND_AGES = [18, 20, 30, 40, 50, 60, 65, 70, 80, 90, 100] as const;

export type MomentKind =
  | "event" | "rec" | "start" | "end" | "school" | "birthday" | "world";

export interface Moment {
  dt: DateVal;
  label: string;
  kind: MomentKind;
  color: string;
  person: Person | null;
  detail: string | null;
}

export function collectMoments(M: Model): Moment[] {
  const out: Moment[] = [];
  const push = (dt: DateVal, label: string, kind: MomentKind,
                color: string, person: Person | null, detail: string | null): void => {
    out.push({ dt, label, kind, color, person, detail });
  };

  for (const p of M.people) {
    for (const e of p.events) {
      if (!visible(evTrack(e))) continue;
      push(e.date, e.label, e.generated ? "school" : "event", p.color, p, p.name);
      for (const r of e.recs ?? []) push(r.date, r.label, "rec", p.color, p, p.name);
    }
    for (const q of p.periods) {
      if (!visible(q.tk ?? q.track)) continue;
      push(q.start, "Inizio — " + q.label, "start", p.color, p, p.name);
      if (q.end) push(q.end, "Fine — " + q.label, "end", p.color, p, p.name);
    }
    for (const q of p.shared) {
      if (!visible(q.tk ?? q.track)) continue;
      push(q.start, "Inizio — " + q.label, "start", p.color, p, null);
      if (q.end) push(q.end, "Fine — " + q.label, "end", p.color, p, null);
    }
    for (const e of p.sharedEvents) {
      if (!visible(evTrack(e))) continue;
      push(e.date, e.label, "event", p.color, p, null);
      for (const r of e.recs ?? []) push(r.date, r.label, "rec", p.color, p, null);
    }
    for (const age of ROUND_AGES) {
      const dt = parseDate(shiftYears(p.birth, age));
      if (dt.t0 > M.horizon) continue;
      if (p.death && dt.t0 >= p.death.t1) continue;
      push(dt, p.name + " compie " + age + " anni", "birthday", p.color, p, null);
    }
  }

  if (visible("world")) {
    for (const e of M.context) push(e.date, e.label, "world", "#4E656D", null, "il mondo");
    for (const q of M.contextPeriods) {
      push(q.start, "Inizio — " + q.label, "start", "#4E656D", null, null);
      if (q.end) push(q.end, "Fine — " + q.label, "end", "#4E656D", null, null);
    }
  }

  // Le voci condivise arrivano una volta per persona coinvolta.
  const seen = new Set<string>();
  const unique: Moment[] = [];
  for (const m of out) {
    const key = m.label + "|" + m.dt.raw;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(m);
  }
  unique.sort((a, b) => a.dt.t0 - b.dt.t0);
  return unique;
}

function ageStrip(M: Model, dt: DateVal): HTMLElement {
  const node = el("div", "agestrip");
  node.textContent = M.people
    .map(p => {
      const s = ageShort(p, dt, M.settings.ageDisplay);
      return p.name + " " + (s === "–" ? "—" : s);
    })
    .join("  ·  ");
  return node;
}

/**
 * I prossimi passaggi con la distanza da oggi: la risposta diretta a "quanto
 * manca alla maturità di …" senza dover leggere il grafico.
 */
function nextUp(M: Model, moments: readonly Moment[]): HTMLElement {
  const box = el("div", "nextup");
  const upcoming = moments.filter(m => m.dt.t1 > M.now && m.kind !== "start").slice(0, 6);
  if (!upcoming.length) return box;

  box.appendChild(el("h3", "subsec", "Prossimi passaggi"));
  const grid = el("div", "nextgrid");
  for (const m of upcoming) {
    const card = el("div", "nx");
    card.style.color = m.color;
    card.appendChild(el("div", "nxdist", distText(m.dt.mid, M.now)));
    const label = el("div", "nxlab", m.label);
    label.style.color = "var(--ink)";
    card.appendChild(label);
    card.appendChild(el("div", "iwhen", fmtDate(m.dt)));
    grid.appendChild(card);
  }
  box.appendChild(grid);
  return box;
}

export function renderDense(pane: HTMLElement): void {
  const M = model();
  pane.textContent = "";
  const wrap = el("div", "wrap");

  wrap.appendChild(el("h2", "sec", "Anni densi"));
  wrap.appendChild(el("p", "lede",
    "Gli anni in cui si accavallano due o più cose. È qui che si vede la forma " +
    "dei prossimi vent'anni: le maturità, la fine del mutuo, i compleanni tondi " +
    "che cadono insieme."));

  const toggle = el("button", "btn" + (state.densePast ? " on" : ""),
    state.densePast ? "Mostra solo dall'anno in corso" : "Includi anche il passato");
  toggle.onclick = () => {
    state.densePast = !state.densePast;
    renderDense(pane);
  };
  wrap.appendChild(toggle);

  const moments = collectMoments(M);
  wrap.appendChild(nextUp(M, moments));

  const currentYear = new Date().getFullYear();
  const byYear = new Map<number, Moment[]>();
  for (const m of moments) {
    if (!state.densePast && m.dt.y < currentYear) continue;
    const list = byYear.get(m.dt.y);
    if (list) list.push(m);
    else byYear.set(m.dt.y, [m]);
  }
  const years = [...byYear.keys()].sort((a, b) => a - b)
    .filter(y => (byYear.get(y)?.length ?? 0) >= 2);

  if (!years.length) {
    wrap.appendChild(el("p", "lede", "Nessun anno con due o più eventi in questo intervallo."));
    pane.appendChild(wrap);
    return;
  }

  const list = el("div");
  list.style.marginTop = "18px";
  for (const year of years) {
    const row = el("div", "year");
    const left = el("div");
    left.appendChild(el("div", "ynum" + (year < currentYear ? " past" : ""), String(year)));
    left.appendChild(el("div", "ydist",
      year === currentYear ? "quest'anno" : distText(year + 0.5, M.now)));

    const items = el("div", "ylist");
    for (const m of byYear.get(year) ?? []) {
      const item = el("div", "itm");
      item.style.color = m.color;
      item.appendChild(el("div", "dot"));
      const text = el("div", "itxt");
      const line = el("div");
      line.style.color = "var(--ink)";
      line.textContent = m.label;
      text.appendChild(line);
      text.appendChild(el("div", "iwhen", fmtDate(m.dt) + (m.detail ? " · " + m.detail : "")));
      text.appendChild(ageStrip(M, m.dt));
      item.appendChild(text);
      items.appendChild(item);
    }
    row.appendChild(left);
    row.appendChild(items);
    list.appendChild(row);
  }
  wrap.appendChild(list);
  pane.appendChild(wrap);
}

export function renderMatrix(pane: HTMLElement): void {
  const M = model();
  pane.textContent = "";
  const wrap = el("div", "wrap");

  wrap.appendChild(el("h2", "sec", "Matrice delle età"));
  wrap.appendChild(el("p", "lede",
    "Ogni riga è un momento, ogni colonna una persona: la cella dice quanti " +
    "anni aveva o avrà. Il trattino segna chi non era ancora nato, la croce " +
    "chi non c'era più."));

  const moments = collectMoments(M).filter(m => m.kind !== "birthday");
  const table = el("table", "mx");

  const head = el("thead");
  const headRow = el("tr");
  headRow.appendChild(el("th", undefined, "Momento"));
  headRow.appendChild(el("th", undefined, "Quando"));
  for (const p of M.people) headRow.appendChild(el("th", "n", p.name));
  head.appendChild(headRow);
  table.appendChild(head);

  const body = el("tbody");
  for (const m of moments) {
    const row = el("tr");
    const first = el("td");
    const label = el("div", "mxlab");
    const dot = el("div", "dot");
    dot.style.color = m.color;
    dot.style.flex = "0 0 7px";
    label.appendChild(dot);
    label.appendChild(el("span", undefined, m.label));
    first.appendChild(label);
    row.appendChild(first);
    row.appendChild(el("td", "when", fmtDate(m.dt)));
    for (const p of M.people) {
      const cell = el("td", "n", ageShort(p, m.dt, M.settings.ageDisplay));
      if (cell.textContent === "–" || cell.textContent === "†") cell.style.color = "var(--rule)";
      row.appendChild(cell);
    }
    body.appendChild(row);
  }
  table.appendChild(body);
  wrap.appendChild(table);
  pane.appendChild(wrap);
}

/** Riesportato per i test: i tipi di `Period`/`EventItem` restano interni. */
export type { Period, EventItem, Recurrence };
