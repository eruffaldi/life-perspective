/**
 * Scala temporale: comando esplicito, aperto su richiesta.
 *
 * Prima c'era un cursore sempre visibile nell'intestazione, e sul telefono una
 * pinch. Il cursore mangiava spazio a una barra già troppo alta; la pinch
 * dipendeva dal fatto che il browser rispettasse `touch-action`, e quando non
 * lo fa il codice non può rimediare — il gesto non arriva mai.
 *
 * Un pannello che si apre quando serve costa un tocco in più e funziona
 * ovunque, che ci sia un dito, un mouse o una tastiera.
 */
import { el, must } from "./dom.js";
import { state } from "./state.js";
import { t } from "../i18n/index.js";

/** Estremi della scala, in pixel per anno. */
export const MIN_PPY = 6;
export const MAX_PPY = 120;

export interface ScalePreset {
  readonly label: string;
  readonly hint: string;
  /** Pixel per anno, oppure `fit` per far entrare tutto nella finestra. */
  ppy: number | "fit";
}

export const PRESETS: readonly ScalePreset[] = [
  { get label() { return t().scale.presetAll; },
    get hint() { return t().scale.presetAllHint; }, ppy: "fit" },
  { get label() { return t().scale.presetDecades; },
    get hint() { return t().scale.presetDecadesHint; }, ppy: 12 },
  { get label() { return t().scale.presetYears; },
    get hint() { return t().scale.presetYearsHint; }, ppy: 40 },
  { get label() { return t().scale.presetMonths; },
    get hint() { return t().scale.presetMonthsHint; }, ppy: 100 }
];

export function clampPpy(value: number): number {
  return Math.max(MIN_PPY, Math.min(MAX_PPY, value));
}

/** Pixel per anno perché l'intero arco entri nella larghezza disponibile. */
export function fitPpy(spanYears: number, width: number): number {
  if (spanYears <= 0 || width <= 0) return MIN_PPY;
  return clampPpy(width / spanYears);
}

/** Un passo di zoom: la progressione è geometrica, come la percezione. */
export function step(value: number, direction: 1 | -1): number {
  return clampPpy(value * (direction > 0 ? 1.35 : 1 / 1.35));
}

export interface ScaleControl {
  /** Applica una scala conservando il punto al centro della finestra. */
  set(ppy: number): void;
  /** Ridisegna il pannello se aperto: i valori cambiano con la vista. */
  refresh(): void;
}

/**
 * @param pane la vista da riscalare, per conservare il punto centrale
 * @param redraw ridisegno della vista corrente
 */
export function createScaleControl(pane: () => HTMLElement, redraw: () => void): ScaleControl {
  const box = must("#scalebox");
  const button = must<HTMLButtonElement>("#btnScale");

  function set(next: number): void {
    const view = pane();
    const clamped = clampPpy(next);
    // Il punto al centro della finestra resta dov'è: senza questo, cambiare
    // scala fa saltare la vista a un altro secolo.
    const centre = (view.scrollLeft + view.clientWidth / 2) / state.ppy;
    state.ppy = clamped;
    redraw();
    view.scrollLeft = Math.max(0, centre * clamped - view.clientWidth / 2);
    render();
    button.textContent = t().scale.button;
  }

  function render(): void {
    box.textContent = "";
    box.appendChild(el("h4", undefined, t().scale.title));

    const row = el("div", "scalerow");
    const minus = el("button", "btn", "−");
    minus.title = t().scale.lessHint;
    minus.setAttribute("aria-label", t().scale.less);
    minus.onclick = () => set(step(state.ppy, -1));

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = String(MIN_PPY);
    slider.max = String(MAX_PPY);
    slider.step = "1";
    slider.value = String(Math.round(state.ppy));
    slider.setAttribute("aria-label", t().scale.label);
    slider.oninput = () => set(Number(slider.value));

    const plus = el("button", "btn", "+");
    plus.title = t().scale.moreHint;
    plus.setAttribute("aria-label", t().scale.more);
    plus.onclick = () => set(step(state.ppy, 1));

    row.appendChild(minus);
    row.appendChild(slider);
    row.appendChild(plus);
    box.appendChild(row);

    const presets = el("div", "presets");
    for (const preset of PRESETS) {
      const btn = el("button", "btn", preset.label);
      btn.title = preset.hint;
      btn.onclick = () => {
        const view = pane();
        set(preset.ppy === "fit"
          ? fitPpy(state.model ? state.model.span.hi - state.model.span.lo : 1,
                   view.clientWidth || 800)
          : preset.ppy);
      };
      presets.appendChild(btn);
    }
    box.appendChild(presets);

    box.appendChild(el("div", "scaleval", t().scale.readout(
      Math.round(state.ppy),
      Math.max(1, Math.round((pane().clientWidth || 800) / state.ppy)))));
  }

  button.onclick = ev => {
    ev.stopPropagation();
    box.style.top = (must("#head").offsetHeight - 6) + "px";
    box.classList.toggle("on");
    if (box.classList.contains("on")) render();
  };
  document.addEventListener("click", ev => {
    const target = ev.target as Node;
    if (!box.contains(target) && target !== button) box.classList.remove("on");
  });

  // La tastiera resta la via più rapida per chi ce l'ha, senza aprire nulla.
  document.addEventListener("keydown", ev => {
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const tag = (ev.target as HTMLElement | null)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (ev.key === "+" || ev.key === "=") { set(step(state.ppy, 1)); ev.preventDefault(); }
    else if (ev.key === "-" || ev.key === "_") { set(step(state.ppy, -1)); ev.preventDefault(); }
  });

  return { set, refresh: () => { if (box.classList.contains("on")) render(); } };
}
