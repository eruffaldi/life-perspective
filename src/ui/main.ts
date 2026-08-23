/**
 * Avvio e orchestrazione: quale vista è attiva, cosa succede ai pulsanti.
 * Tutta la logica di dominio sta altrove; qui c'è solo il cablaggio.
 */
// Fondamenta e atomi condivisi. Ogni vista importa il proprio foglio.
import "../styles/tokens.css";
import "../styles/base.css";
import "../styles/typography.css";
import "./shell.css";
import { SAMPLE } from "../data/sample.js";
import { build, ModelError } from "../core/model.js";
import { ageText, } from "../core/age.js";
import { parseDate, fmtDate } from "../core/date.js";
import { defaultFilters, isTrackKey } from "../core/tracks.js";
import { nowDate } from "../core/model.js";
import { renderChart } from "./chart.js";
import { renderDense, renderMatrix } from "./dense.js";
import { renderPlaces } from "./places.js";
import { buildFilters, readJSON, renderDiagnostics } from "./panels.js";
import { validate, hasErrors } from "../validate/validate.js";
import { store, KEY_DATA, KEY_FILTERS, KEY_LANG } from "./store.js";
import { must } from "./dom.js";
import { applyStaticText, buildLanguagePicker } from "./text.js";
import { detectLanguage, locale, setLanguage, t } from "../i18n/index.js";
import { dismissTipOnStrayTap } from "./tooltip.js";
import { registerServiceWorker, requestPersistence, isHosted } from "./install.js";
import { createScaleControl, type ScaleControl } from "./scale.js";
import { state, type ViewName } from "./state.js";
import type { RawDocumentRoot, TrackKey } from "../core/types.js";

const PANES: Record<ViewName, string> = {
  chart: "#pane-chart",
  ages: "#pane-ages",
  places: "#pane-places",
  dense: "#pane-dense",
  matrix: "#pane-matrix"
};

let scale: ScaleControl | null = null;

function draw(): void {
  const pane = must(PANES[state.view]);
  switch (state.view) {
    case "chart": renderChart(pane, false); break;
    case "ages": renderChart(pane, true); break;
    case "places": renderPlaces(pane); break;
    case "dense": renderDense(pane); break;
    case "matrix": renderMatrix(pane); break;
  }
}

/**
 * Le due barre non hanno altezza fissa: dipendono da quante righe occupano i
 * comandi e da dove sono finite le schede. Si misurano invece di indovinarle.
 */
function measureChrome(): void {
  const root = document.documentElement.style;
  root.setProperty("--headh", must("#head").offsetHeight + "px");
  const nav = must("nav.views");
  // In fondo solo sul telefono: altrove le schede stanno nell'intestazione e
  // non sottraggono spazio alla vista.
  const atBottom = getComputedStyle(nav).position === "fixed";
  root.setProperty("--navh", atBottom ? nav.offsetHeight + "px" : "0px");
}

function setView(view: ViewName): void {
  state.view = view;
  for (const btn of document.querySelectorAll<HTMLButtonElement>("nav.views button")) {
    btn.setAttribute("aria-selected", String(btn.dataset["view"] === view));
  }
  for (const pane of document.querySelectorAll(".pane")) pane.classList.remove("on");
  must(PANES[view]).classList.add("on");

  // La scala vale solo dove c'è un asse del tempo da riscalare.
  const chartish = view === "chart" || view === "ages";
  must<HTMLButtonElement>("#btnScale").disabled = !chartish;
  if (!chartish) must("#scalebox").classList.remove("on");
  scale?.refresh();
  must("#legend").classList.toggle("on", chartish);
  measureChrome();

  draw();
  if (view === "chart") scrollToNow();
}

function scrollToNow(): void {
  if (!state.model) return;
  const pane = must("#pane-chart");
  const x = (state.model.now - state.model.span.lo) * state.ppy;
  pane.scrollLeft = Math.max(0, x - pane.clientWidth * 0.62);
}

function load(data: RawDocumentRoot): void {
  state.model = build(data);
  state.filters = defaultFilters(state.model.settings);
  buildFilters(draw);

  document.title = t().app.documentTitle(state.model.title);
  const anchor = state.model.anchor;
  // Chi non è più in vita non ha un'età «oggi»: mostrare un trattino sarebbe
  // corretto e inutile. Per queste persone si dice l'arco della vita.
  must("#anchorline").textContent = anchor.death
    ? anchor.name + " · " + t().app.lifespan(
        fmtDate(anchor.birth), fmtDate(anchor.death),
        Math.floor(anchor.death.mid - anchor.birth.mid))
    : anchor.name + " · " +
      ageText(anchor, nowDate(state.model), state.model.settings.ageDisplay).txt +
      " · " + t().app.today + " " +
      fmtDate(parseDate(new Date().toISOString().slice(0, 10)));

  draw();
  if (state.view === "chart") requestAnimationFrame(scrollToNow);
}

async function restore(): Promise<void> {
  const mode = await store.init();
  const saveBtn = must<HTMLButtonElement>("#btnSave");
  const forgetBtn = must<HTMLButtonElement>("#btnForget");
  if (mode === "none") {
    saveBtn.disabled = true;
    forgetBtn.disabled = true;
    saveBtn.title = t().data.saveUnavailable;
    return;
  }

  const savedLang = await store.get(KEY_LANG);
  if (savedLang) {
    setLanguage(savedLang);
    applyStaticText();
    buildLanguagePicker(code => {
      void store.set(KEY_LANG, code).catch(() => undefined);
      relabel();
    });
  }
  const savedFilters = await store.get(KEY_FILTERS);
  const savedData = await store.get(KEY_DATA);
  const msg = must("#msg");

  const applyFilters = (): void => {
    if (!savedFilters) return;
    try {
      const keys = (JSON.parse(savedFilters) as unknown[]).filter(isTrackKey);
      state.filters = new Set<TrackKey>(keys);
      buildFilters(draw);
      draw();
    } catch { /* filtri illeggibili: restano quelli di default */ }
  };

  if (savedData) {
    try {
      const parsed = JSON.parse(savedData) as RawDocumentRoot;
      must<HTMLTextAreaElement>("#json").value = savedData;
      const diags = validate(parsed);
      renderDiagnostics(diags);
      if (hasErrors(diags)) {
        msg.className = "err";
        msg.textContent = t().data.savedInvalid;
        return;
      }
      load(parsed);
      applyFilters();
      msg.textContent = t().data.savedRestored;
      return;
    } catch {
      msg.className = "err";
      msg.textContent = t().data.savedBroken;
    }
  }
  applyFilters();
}

/** Ridisegno completo: serve dopo un cambio di lingua. */
function relabel(): void {
  applyStaticText();
  buildFilters(draw);
  // Le etichette generate — cicli scolastici, ricorrenze — vivono nel modello:
  // vanno ricostruite, non solo ridisegnate. La textarea però può contenere
  // dati che l'utente sta ancora correggendo: se non si ricostruiscono, si
  // ridisegna e basta, invece di far cadere il cambio di lingua.
  const source = must<HTMLTextAreaElement>("#json").value;
  let rebuilt = false;
  if (state.model) {
    try {
      const parsed = JSON.parse(source) as RawDocumentRoot;
      if (!hasErrors(validate(parsed))) {
        load(parsed);
        rebuilt = true;
      }
    } catch { /* testo in corso di modifica */ }
  }
  if (!rebuilt) draw();
  measureChrome();
}

function wire(): void {
  setLanguage(detectLanguage());
  applyStaticText();
  buildLanguagePicker(code => {
    void store.set(KEY_LANG, code).catch(() => undefined);
    relabel();
  });
  measureChrome();
  dismissTipOnStrayTap();
  window.addEventListener("resize", measureChrome);

  must<HTMLTextAreaElement>("#json").value = JSON.stringify(SAMPLE, null, 2);
  try {
    load(SAMPLE);
  } catch (e) {
    console.error(e);
  }

  for (const btn of document.querySelectorAll<HTMLButtonElement>("nav.views button")) {
    btn.onclick = () => setView((btn.dataset["view"] ?? "chart") as ViewName);
  }

  scale = createScaleControl(
    () => must(state.view === "ages" ? "#pane-ages" : "#pane-chart"),
    draw);

  must<HTMLButtonElement>("#btnNow").onclick = () => {
    if (state.view !== "chart") setView("chart");
    else scrollToNow();
  };

  const filtersBox = must("#filters");
  must<HTMLButtonElement>("#btnFilt").onclick = ev => {
    ev.stopPropagation();
    filtersBox.style.top = (must("#head").offsetHeight - 6) + "px";
    filtersBox.classList.toggle("on");
  };
  document.addEventListener("click", ev => {
    const target = ev.target as Node;
    if (!filtersBox.contains(target) && target !== must("#btnFilt")) {
      filtersBox.classList.remove("on");
    }
  });

  const drawer = must("#drawer");
  const dataBtn = must<HTMLButtonElement>("#btnData");
  const msg = must("#msg");
  const say = (text: string, isError = false): void => {
    msg.className = isError ? "err" : "";
    msg.textContent = text;
  };

  dataBtn.onclick = () => {
    drawer.classList.toggle("on");
    dataBtn.classList.toggle("on");
  };
  must<HTMLButtonElement>("#btnClose").onclick = () => {
    drawer.classList.remove("on");
    dataBtn.classList.remove("on");
  };

  must<HTMLButtonElement>("#btnApply").onclick = () => {
    say("");
    const data = readJSON();
    if (!data) {
      say(t().data.fixErrors, true);
      return;
    }
    try {
      load(data);
      const warnings = state.diagnostics.length;
      say(t().data.applied(data.people?.length ?? 0) +
          (warnings ? t().data.appliedWarnings(warnings) : ""));
      if (!warnings) {
        drawer.classList.remove("on");
        dataBtn.classList.remove("on");
      }
    } catch (e) {
      // Rete di sicurezza: se una condizione sfugge al validatore si vede qui.
      const detail = e instanceof ModelError || e instanceof Error ? e.message : String(e);
      renderDiagnostics([{
        level: "error", code: "E999", path: "",
        message: t().diag.unexpected, hint: detail
      }]);
      say(detail, true);
    }
  };

  must<HTMLButtonElement>("#btnCheck").onclick = () => { readJSON(t().data.noProblems); };

  must<HTMLButtonElement>("#btnSave").onclick = async () => {
    if (!readJSON()) {
      say(t().data.saveRefused, true);
      return;
    }
    try {
      await store.set(KEY_DATA, must<HTMLTextAreaElement>("#json").value);
      await store.set(KEY_FILTERS, JSON.stringify([...state.filters]));
      say(t().data.saved(new Date().toLocaleString(locale())));
    } catch (e) {
      say(e instanceof Error ? e.message : String(e), true);
    }
  };

  must<HTMLButtonElement>("#btnForget").onclick = async () => {
    await store.delete(KEY_DATA);
    await store.delete(KEY_FILTERS);
    say(t().data.forgotten);
  };

  must<HTMLButtonElement>("#btnReset").onclick = () => {
    must<HTMLTextAreaElement>("#json").value = JSON.stringify(SAMPLE, null, 2);
    say(t().data.resetDone);
  };

  must<HTMLButtonElement>("#btnDownload").onclick = () => {
    const blob = new Blob([must<HTMLTextAreaElement>("#json").value], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "prospettiva.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const file = must<HTMLInputElement>("#file");
  must<HTMLButtonElement>("#btnUpload").onclick = () => file.click();
  file.onchange = () => {
    const chosen = file.files?.[0];
    if (!chosen) return;
    const reader = new FileReader();
    reader.onload = () => {
      must<HTMLTextAreaElement>("#json").value = String(reader.result);
      must<HTMLButtonElement>("#btnApply").click();
    };
    reader.readAsText(chosen);
  };

  void restore();

  // Solo quando la pagina è ospitata: da file:// non c'è nulla da registrare.
  registerServiceWorker();
  if (isHosted()) void requestPersistence();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire);
else wire();
