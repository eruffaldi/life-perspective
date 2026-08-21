/**
 * Filtri e diagnostica: le due parti dell'interfaccia che parlano dei dati
 * invece che del tempo.
 */
import "./panels.css";
import { TRACKS } from "../core/tracks.js";
import { validate, hasErrors } from "../validate/validate.js";
import { scanJSON, locate } from "../validate/scan.js";
import { el, must } from "./dom.js";
import { state, model } from "./state.js";
import { t } from "../i18n/index.js";
import { store, KEY_FILTERS } from "./store.js";
import type { Diagnostic, RawDocumentRoot, TrackKey } from "../core/types.js";

/* ------------------------------------------------------------------ *
 * Filtri                                                              *
 * ------------------------------------------------------------------ */

function countTrack(track: TrackKey): number {
  const M = state.model;
  if (!M) return 0;
  let n = 0;
  for (const p of M.people) {
    for (const q of p.periods.concat(p.shared)) if ((q.tk ?? q.track) === track) n++;
    for (const m of p.marks) if (m.tk === track) n++;
  }
  if (track === "world") n += M.context.length + M.contextPeriods.length;
  return n;
}

export function buildFilters(onChange: () => void): void {
  const box = must("#filters");
  box.textContent = "";
  box.appendChild(el("h4", undefined, t().filters.title));

  for (const track of TRACKS) {
    const n = countTrack(track.k);
    const label = el("label", n ? "" : "off");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = state.filters.has(track.k);
    checkbox.disabled = n === 0;
    checkbox.onchange = () => {
      if (checkbox.checked) state.filters.add(track.k);
      else state.filters.delete(track.k);
      void store.set(KEY_FILTERS, JSON.stringify([...state.filters])).catch(() => undefined);
      onChange();
    };
    label.appendChild(checkbox);
    label.appendChild(el("span", undefined, track.l));
    label.appendChild(el("span", "fcount", n ? String(n) : "—"));
    box.appendChild(label);
  }

  const buttons = el("div", "fbtns");
  const all = el("button", "btn", t().filters.all);
  all.onclick = () => {
    for (const t of TRACKS) state.filters.add(t.k);
    buildFilters(onChange);
    onChange();
  };
  const none = el("button", "btn", t().filters.none);
  none.onclick = () => {
    state.filters.clear();
    buildFilters(onChange);
    onChange();
  };
  buttons.appendChild(all);
  buttons.appendChild(none);
  box.appendChild(buttons);

  const off = TRACKS.filter(t => !state.filters.has(t.k)).length;
  const btn = must<HTMLButtonElement>("#btnFilt");
  btn.textContent = off ? t().filters.buttonCount(TRACKS.length - off, TRACKS.length)
                        : t().filters.button;
  btn.classList.toggle("on", off > 0);
}

/* ------------------------------------------------------------------ *
 * Diagnostica                                                         *
 * ------------------------------------------------------------------ */

/** Porta il cursore sul frammento responsabile, o sul genitore più vicino. */
export function jumpTo(path: string): void {
  const ta = must<HTMLTextAreaElement>("#json");
  const at = locate(scanJSON(ta.value), path);
  if (!at) return;
  ta.focus();
  ta.setSelectionRange(at[0], at[1]);
  // Le textarea non hanno scrollIntoView: si stima la riga.
  const lines = ta.value.split("\n").length;
  const before = ta.value.slice(0, at[0]).split("\n").length;
  ta.scrollTop = Math.max(0, (before - 4) * (ta.scrollHeight / Math.max(1, lines)));
}

export function renderDiagnostics(list: Diagnostic[], okMessage?: string): void {
  state.diagnostics = list;
  const box = must("#diags");
  const dataBtn = must<HTMLButtonElement>("#btnData");
  box.textContent = "";

  const errors = list.filter(d => d.level === "error");
  const warnings = list.filter(d => d.level === "warning");

  // Zero diagnostiche significa nessun pannello: un avviso permanente su dati
  // corretti insegna solo a ignorare gli avvisi.
  if (!list.length) {
    box.classList.remove("on");
    dataBtn.classList.remove("warn");
    dataBtn.textContent = t().data.button;
    if (okMessage) {
      const msg = must("#msg");
      msg.className = "";
      msg.textContent = okMessage;
    }
    return;
  }

  box.classList.add("on");
  const parts: string[] = [];
  if (errors.length) parts.push(t().diag.errors(errors.length));
  if (warnings.length) parts.push(t().diag.warnings(warnings.length));
  box.appendChild(el("div", "hd", parts.join(" · ") +
    (errors.length ? t().diag.blocked : t().diag.loaded)));

  for (const d of errors.concat(warnings)) {
    const row = el("div", "dg " + d.level);
    row.appendChild(el("div", "lv", d.code));
    row.appendChild(el("div", "ms", d.message));
    if (d.path) row.appendChild(el("div", "pt", d.path));
    if (d.hint) row.appendChild(el("div", "hn", d.hint));
    row.onclick = () => jumpTo(d.path);
    box.appendChild(row);
  }

  dataBtn.textContent = t().data.buttonCount(errors.length || warnings.length);
  dataBtn.classList.toggle("warn", errors.length > 0);
}

/**
 * Legge la textarea. Restituisce i dati solo se sono utilizzabili: gli errori
 * di sintassi diventano diagnostiche come tutti gli altri.
 */
export function readJSON(showOk?: string): RawDocumentRoot | null {
  const ta = must<HTMLTextAreaElement>("#json");
  const text = ta.value;
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const at = /position (\d+)/.exec(message);
    const offset = at?.[1] != null ? Number(at[1]) : null;
    const line = offset != null ? text.slice(0, offset).split("\n").length : null;
    renderDiagnostics([{
      level: "error",
      code: "E000",
      path: "",
      message: t().diag.syntax(line),
      hint: message
    }]);
    if (offset != null) {
      ta.focus();
      ta.setSelectionRange(offset, offset + 1);
    }
    return null;
  }
  const diags = validate(data);
  renderDiagnostics(diags, showOk);
  return hasErrors(diags) ? null : (data as RawDocumentRoot);
}

/** Riesportato per comodità dei chiamanti. */
export { model };
