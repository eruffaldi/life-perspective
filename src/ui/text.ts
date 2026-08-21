/**
 * Scrittura dei testi nel markup.
 *
 * L'HTML non porta più stringhe: le scrive il catalogo all'avvio e a ogni
 * cambio di lingua. Tenerle nel markup avrebbe significato una seconda copia
 * da tradurre, che diverge alla prima modifica.
 */
import { LANGUAGES, language, setLanguage, t } from "../i18n/index.js";
import { el, must } from "./dom.js";

/** Testi che stanno nell'HTML e non vengono ridisegnati dalle viste. */
export function applyStaticText(): void {
  const m = t();
  document.documentElement.lang = language();

  const viewLabels: Record<string, [string, string]> = {
    chart: [m.views.chart, m.views.chartShort],
    ages: [m.views.ages, m.views.agesShort],
    places: [m.views.places, m.views.placesShort],
    dense: [m.views.dense, m.views.denseShort],
    matrix: [m.views.matrix, m.views.matrixShort]
  };
  for (const btn of document.querySelectorAll<HTMLButtonElement>("nav.views button")) {
    const pair = viewLabels[btn.dataset["view"] ?? ""];
    if (!pair) continue;
    const long = btn.querySelector(".lg");
    const short = btn.querySelector(".sm");
    if (long) long.textContent = pair[0];
    if (short) short.textContent = pair[1];
  }

  const text: Record<string, string> = {
    "#btnScale": m.scale.button,
    "#btnFilt": m.filters.button,
    "#btnData": m.data.button,
    "#btnNow": m.now,
    "#btnApply": m.data.apply,
    "#btnCheck": m.data.check,
    "#btnSave": m.data.save,
    "#btnForget": m.data.forget,
    "#btnDownload": m.data.download,
    "#btnUpload": m.data.upload,
    "#btnReset": m.data.reset,
    "#btnClose": m.data.close,
    "#dataTitle": m.data.title,
    "#dataLede": m.data.lede
  };
  for (const [selector, value] of Object.entries(text)) {
    const node = document.querySelector(selector);
    if (node) node.textContent = value;
  }

  renderLegend();
}

/** La legenda: forme e colori con il loro nome. */
function renderLegend(): void {
  const m = t();
  const box = must("#legend");
  box.textContent = "";
  const entry = (icon: string, label: string, dim = false): HTMLElement => {
    const span = el("span");
    if (dim) span.style.opacity = ".6";
    span.innerHTML = icon;
    span.appendChild(document.createTextNode(label));
    return span;
  };
  box.appendChild(entry('<i class="sq"></i>', m.chart.legendPeriod));
  box.appendChild(entry("<i></i>", m.chart.legendEvent));
  box.appendChild(entry('<i class="ci"></i>', m.chart.legendRecurrence));
  box.appendChild(entry('<i class="sq" style="border-style:dashed"></i>', m.chart.legendCirca, true));
  box.appendChild(entry('<i class="ln"></i>', m.chart.legendToday));
  box.appendChild(el("span", "hint", m.chart.legendHint));
}

/**
 * Selettore di lingua. Cambiare lingua ridisegna tutto: le etichette sono
 * lette al momento del disegno, non memorizzate nel modello.
 */
export function buildLanguagePicker(onChange: (code: string) => void): void {
  const select = must<HTMLSelectElement>("#lang");
  select.textContent = "";
  for (const lang of LANGUAGES) {
    const option = document.createElement("option");
    option.value = lang.code;
    option.textContent = lang.name;
    select.appendChild(option);
  }
  select.value = language();
  select.onchange = () => {
    setLanguage(select.value);
    onChange(select.value);
  };
}
