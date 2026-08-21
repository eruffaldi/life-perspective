/**
 * Carta dei luoghi.
 *
 * La base cartografica è incorporata: nessuna tile, nessuna rete. Due livelli
 * di dettaglio, scelti in base all'inquadratura.
 *
 * TRAPPOLA: i tracciati memorizzano già `-y`. La trasformazione del gruppo usa
 * `scale(base)`, NON `scale(base, -base)` — un secondo ribaltamento spedisce
 * la costa fuori campo lasciando i pin al posto giusto.
 */
import "./places.css";
import { COAST } from "../data/coast.js";
import { decodeLines, merc } from "../geo/projection.js";
import { activeInYear, collectPlaces, homeTraces, type Place } from "../geo/places.js";
import { parseDate } from "../core/date.js";
import { ageShort } from "../core/age.js";
import { el, svgEl } from "./dom.js";
import { attachTip, hideTip, showTipAt } from "./tooltip.js";
import { bindGestures, isCoarse } from "./gestures.js";
import { labelBox, placeLabels } from "./labels.js";
import { t } from "../i18n/index.js";
import { model, state, visible } from "./state.js";
import type { DateVal, Model } from "../core/types.js";

/** Estensione minima dell'inquadratura, per non zoomare su una via. */
const MIN_SPAN = 1.6;
const PAD = 0.16;
/** Raggio entro cui un tocco conta come tocco su un pin. */
const TAP_RADIUS = 34;
const FALLBACK_W = 800;
const FALLBACK_H = 600;

interface ViewTransform {
  base: number;
  bx: number;
  by: number;
  k: number;
  tx: number;
  ty: number;
}

export function renderPlaces(pane: HTMLElement): void {
  const M = model();
  const { placed, unplaced } = collectPlaces(M, visible);
  pane.textContent = "";

  const root = el("div", "geo");
  const mapBox = el("div", "geomap");
  const side = el("div", "geoside");
  root.appendChild(mapBox);
  root.appendChild(side);
  pane.appendChild(root);

  if (!placed.length) {
    side.appendChild(el("h2", "sec", t().places.none));
    side.appendChild(el("p", "lede", t().places.noneLede));
    if (unplaced.length) side.appendChild(unplacedBox(unplaced));
    return;
  }

  const home = frame(placed);
  const svg = svgEl("svg");
  const world = svgEl("g");
  const pins = svgEl("g");
  const traceLayer = svgEl("g");
  world.appendChild(traceLayer);
  svg.appendChild(world);
  svg.appendChild(pins);
  mapBox.appendChild(svg);

  drawCoast(world, home);

  const view: ViewTransform = { base: 1, bx: 0, by: 0, k: 1, tx: 0, ty: 0 };
  let year = state.mapYear ?? Math.round(M.now);
  let selected: Place | null = null;
  let showTraces = true;

  const traces = homeTraces(M, placed);
  const maxYears = Math.max(1, ...placed.map(p => p.years));
  const radius = (p: Place): number => 5 + 11 * Math.sqrt(p.years / maxYears);
  const project = (p: Place): [number, number] => {
    const [x, y] = merc(p.coord[0], p.coord[1]);
    return [(view.base * x + view.bx) * view.k + view.tx,
            (-view.base * y + view.by) * view.k + view.ty];
  };

  const nodes = new Map<Place, SVGGElement>();
  for (const place of placed) {
    const g = svgEl("g");
    g.setAttribute("class", "pin");
    const circle = svgEl("circle");
    const owner = [...place.people][0];
    circle.setAttribute("fill", owner ? owner.color : "#4E656D");
    circle.setAttribute("fill-opacity", "0.78");
    circle.setAttribute("r", radius(place).toFixed(1));
    // Bersaglio invisibile per il dito: acceso solo dai puntatori grossolani,
    // altrimenti sul desktop i cerchi si ruberebbero i tooltip a vicenda.
    const grab = svgEl("circle");
    grab.setAttribute("class", "grab");
    grab.setAttribute("r", (radius(place) + 14).toFixed(1));
    g.appendChild(grab);
    const text = svgEl("text");
    text.textContent = place.name;
    text.setAttribute("dx", (radius(place) + 5).toFixed(1));
    text.setAttribute("dy", "3.5");
    g.appendChild(circle);
    g.appendChild(text);
    attachTip(g, () => tipForPlace(place));
    g.addEventListener("click", () => {
      selected = selected === place ? null : place;
      drawPins();
      paintSide();
    });
    pins.appendChild(g);
    nodes.set(place, g);
  }

  function drawPins(): void {
    // Stesso vaglio del grafico: vince il cerchio piu' grande, e il luogo
    // selezionato ha comunque la precedenza.
    const shown = placeLabels(placed.map(place => {
      const [x, y] = project(place);
      const r = radius(place);
      return {
        item: place,
        box: labelBox(x, y, place.name, r + 5),
        priority: place === selected ? Infinity : r
      };
    }));
    for (const place of placed) {
      const g = nodes.get(place);
      if (!g) continue;
      const [x, y] = project(place);
      g.setAttribute("transform", "translate(" + x.toFixed(1) + "," + y.toFixed(1) + ")");
      g.classList.toggle("dim", !activeInYear(place, year));
      g.classList.toggle("sel", selected === place);
      const label = g.querySelector("text");
      if (label instanceof SVGElement) label.style.display = shown.has(place) ? "" : "none";
    }
  }

  function drawTraces(): void {
    traceLayer.textContent = "";
    if (!showTraces) return;
    for (const trace of traces) {
      const path = svgEl("path");
      let d = "";
      trace.stops.forEach((stop, i) => {
        const [x, y] = merc(stop.coord[0], stop.coord[1]);
        d += (i ? "L" : "M") + x.toFixed(3) + " " + (-y).toFixed(3);
      });
      path.setAttribute("d", d);
      path.setAttribute("class", "trace");
      path.setAttribute("stroke", trace.person.color);
      traceLayer.appendChild(path);
    }
  }

  function fit(): void {
    const w = mapBox.clientWidth || FALLBACK_W;
    const h = mapBox.clientHeight || FALLBACK_H;
    view.base = Math.min(w / (home.x1 - home.x0), h / (home.y1 - home.y0));
    view.bx = w / 2 - view.base * (home.x0 + home.x1) / 2;
    view.by = h / 2 + view.base * (home.y0 + home.y1) / 2;
    view.k = 1;
    view.tx = 0;
    view.ty = 0;
  }

  function apply(): void {
    world.setAttribute("transform",
      "translate(" + view.tx + "," + view.ty + ") scale(" + view.k + ") " +
      "translate(" + view.bx + "," + view.by + ") scale(" + view.base + ")");
    drawPins();
    drawTraces();
  }

  // Pan e pinch dagli stessi eventi, mouse o dito che sia. Lo zoom da
  // rotellina resta, ma non e' piu' l'unica via: su touch `wheel` non esiste.
  bindGestures(mapBox, {
    onPan(dx, dy) {
      view.tx += dx;
      view.ty += dy;
      apply();
    },
    onZoom(factor, centre) {
      const k2 = Math.max(0.4, Math.min(400, view.k * factor));
      const g = k2 / view.k;
      view.tx = centre.x - g * (centre.x - view.tx);
      view.ty = centre.y - g * (centre.y - view.ty);
      view.k = k2;
      apply();
    },
    onTap(at) {
      // Senza hover il tooltip va aperto e chiuso a tocchi: si cerca il pin
      // piu' vicino entro un raggio da polpastrello.
      if (!isCoarse()) return;
      let best: Place | null = null;
      let bestDist = TAP_RADIUS;
      for (const place of placed) {
        const [x, y] = project(place);
        const d = Math.hypot(x - at.x, y - at.y);
        if (d < bestDist) { best = place; bestDist = d; }
      }
      if (!best) { hideTip(); return; }
      selected = selected === best ? null : best;
      drawPins();
      paintSide();
      if (selected) showTipAt(tipForPlace(best), project(best), mapBox);
      else hideTip();
    }
  });

  // Comandi espliciti: la rotellina e la pinch restano, ma non sono l'unica
  // via. Su un telefono dove il browser non rispetta `touch-action` erano
  // l'unica, e la carta diventava inutilizzabile.
  function zoomBy(direction: 1 | -1): void {
    const factor = direction > 0 ? 1.4 : 1 / 1.4;
    const centre = { x: (mapBox.clientWidth || FALLBACK_W) / 2,
                     y: (mapBox.clientHeight || FALLBACK_H) / 2 };
    const k2 = Math.max(0.4, Math.min(400, view.k * factor));
    const g = k2 / view.k;
    view.tx = centre.x - g * (centre.x - view.tx);
    view.ty = centre.y - g * (centre.y - view.ty);
    view.k = k2;
    apply();
  }

  const controls = el("div", "geoctl");
  const zoomButtons = el("div", "geozoom");
  const zoomIn = el("button", "btn", "+");
  zoomIn.setAttribute("aria-label", t().places.zoomIn);
  zoomIn.onclick = () => zoomBy(1);
  const zoomOut = el("button", "btn", "−");
  zoomOut.setAttribute("aria-label", t().places.zoomOut);
  zoomOut.onclick = () => zoomBy(-1);
  zoomButtons.appendChild(zoomIn);
  zoomButtons.appendChild(zoomOut);
  controls.appendChild(zoomButtons);

  const fitBtn = el("button", "btn", t().places.fit);
  fitBtn.onclick = () => { fit(); apply(); };
  controls.appendChild(fitBtn);
  if (traces.length) {
    const traceBtn = el("button", "btn on", t().places.traces);
    traceBtn.onclick = () => {
      showTraces = !showTraces;
      traceBtn.classList.toggle("on", showTraces);
      drawTraces();
    };
    controls.appendChild(traceBtn);
  }
  mapBox.appendChild(controls);

  const scrub = el("div", "scrub");
  const top = el("div", "top");
  const yearLabel = el("div", "scrubyear", String(year));
  const range = document.createElement("input");
  range.type = "range";
  range.min = String(M.span.lo);
  range.max = String(Math.ceil(M.horizon));
  range.step = "1";
  range.value = String(year);
  const nowBtn = el("button", "btn", t().places.now);
  top.appendChild(yearLabel);
  top.appendChild(range);
  top.appendChild(nowBtn);
  let strip = ageStrip(M, parseDate(String(year)));
  scrub.appendChild(top);
  scrub.appendChild(strip);
  range.oninput = () => {
    year = Number(range.value);
    state.mapYear = year;
    yearLabel.textContent = range.value;
    const next = ageStrip(M, parseDate(String(year)));
    strip.replaceWith(next);
    strip = next;
    drawPins();
  };
  nowBtn.onclick = () => {
    range.value = String(Math.round(M.now));
    range.oninput?.(new Event("input"));
  };
  mapBox.appendChild(scrub);

  function paintSide(): void {
    side.textContent = "";
    side.appendChild(el("h2", "sec", t().places.title));
    side.appendChild(el("p", "lede", t().places.lede));
    for (const place of placed) {
      const card = el("div", "plc" + (selected === place ? " sel" : ""));
      const title = el("div", "pn");
      const dot = el("span");
      const owner = [...place.people][0];
      dot.style.cssText = "width:9px;height:9px;border-radius:50%;background:" +
        (owner ? owner.color : "#4E656D");
      title.appendChild(dot);
      title.appendChild(el("b", undefined, place.name));
      if (place.years >= 0.5) {
        title.appendChild(el("div", "yrs", t().places.years(Math.round(place.years))));
      }
      card.appendChild(title);
      card.appendChild(el("div", "src", place.src));
      const list = el("ul");
      for (const entry of place.entries.slice().sort((a, b) => a.t0 - b.t0)) {
        const li = el("li");
        li.appendChild(el("div", undefined,
          (entry.person ? entry.person.name + " — " : "") + entry.label));
        li.appendChild(el("span", undefined, entry.when));
        list.appendChild(li);
      }
      card.appendChild(list);
      card.onclick = () => {
        selected = selected === place ? null : place;
        drawPins();
        paintSide();
      };
      side.appendChild(card);
    }
    if (unplaced.length) side.appendChild(unplacedBox(unplaced));
  }

  paintSide();
  // Posiziona subito, poi ricalcola quando il riquadro ha una dimensione vera.
  fit();
  apply();
  requestAnimationFrame(() => { fit(); apply(); });
}

interface Frame { x0: number; y0: number; x1: number; y1: number }

function frame(placed: readonly Place[]): Frame {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const place of placed) {
    const [x, y] = merc(place.coord[0], place.coord[1]);
    x0 = Math.min(x0, x); x1 = Math.max(x1, x);
    y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  if (x1 - x0 < MIN_SPAN) { const c = (x0 + x1) / 2; x0 = c - MIN_SPAN / 2; x1 = c + MIN_SPAN / 2; }
  if (y1 - y0 < MIN_SPAN) { const c = (y0 + y1) / 2; y0 = c - MIN_SPAN / 2; y1 = c + MIN_SPAN / 2; }
  const px = (x1 - x0) * PAD;
  const py = (y1 - y0) * PAD;
  return { x0: x0 - px, x1: x1 + px, y0: y0 - py, y1: y1 + py };
}

function drawCoast(world: SVGGElement, home: Frame): void {
  const bb = COAST.euro.bbox;
  const inEuro = home.x0 > bb[0] && home.x1 < bb[2] &&
                 home.y0 > merc(bb[1], 0)[1] && home.y1 < merc(bb[3], 0)[1];
  const layer = inEuro ? COAST.euro : COAST.world;
  for (const [key, cls] of [["all", "coast"], ["border", "bord"]] as const) {
    for (const line of decodeLines(layer[key])) {
      const path = svgEl("path");
      let d = "";
      for (let i = 0; i < line.length; i++) {
        const point = line[i]!;
        const [x, y] = merc(point[1], point[0]);
        d += (i ? "L" : "M") + x.toFixed(3) + " " + (-y).toFixed(3);
      }
      path.setAttribute("d", d);
      path.setAttribute("class", cls);
      world.insertBefore(path, world.firstChild);
    }
  }
}

function ageStrip(M: Model, dt: DateVal): HTMLElement {
  const node = el("div", "agestrip");
  node.textContent = M.people
    .map(p => {
      const s = ageShort(p, dt, M.settings.ageDisplay);
      return p.name + " " + (s === "–" ? t().app.unknown : s);
    })
    .join("  ·  ");
  return node;
}

function unplacedBox(list: readonly { name: string }[]): HTMLElement {
  const box = el("div", "nocoord");
  box.appendChild(el("h3", "subsec", t().places.noCoords));
  const lede = el("p", "lede");
  lede.style.marginBottom = "8px";
  lede.textContent = t().places.noCoordsLede;
  box.appendChild(lede);
  const pre = el("div");
  pre.style.cssText = "font-family:var(--data);font-size:11.5px;line-height:1.7";
  pre.appendChild(el("div", undefined, '"places": {'));
  for (const item of list) {
    const row = el("div");
    row.appendChild(el("code", undefined, '  "' + item.name + '": [41.90, 12.50]'));
    pre.appendChild(row);
  }
  pre.appendChild(el("div", undefined, "}"));
  box.appendChild(pre);
  return box;
}

function tipForPlace(place: Place) {
  const rows: [string, string][] = place.entries.slice()
    .sort((a, b) => a.t0 - b.t0)
    .slice(0, 7)
    .map(e => [(e.person ? e.person.name + " — " : "") + e.label, e.when]);
  const note = place.years >= 0.5
    ? t().places.totalYears(Math.round(place.years))
    : t().places.moments(place.entries.length);
  return {
    t: place.name,
    d: place.coord[0].toFixed(3) + ", " + place.coord[1].toFixed(3) + " · " + place.src,
    rows,
    note
  };
}
