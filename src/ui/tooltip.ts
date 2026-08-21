/**
 * Tooltip: il gesto centrale dell'applicazione. Sopra qualsiasi elemento
 * compare l'età di TUTTI in quel momento — è la ragione per cui il progetto
 * esiste, non un ornamento.
 */
import "./tooltip.css";
import { el, must } from "./dom.js";
import { isCoarse } from "./gestures.js";

export interface TipContent {
  t: string;
  d?: string;
  /** Coppie etichetta/valore, di solito nome e età. */
  rows?: [string, string][];
  note?: string;
}

let tip: HTMLElement | null = null;

function node(): HTMLElement {
  if (!tip) tip = must<HTMLElement>("#tip");
  return tip;
}

/**
 * Il tooltip è il gesto centrale dell'applicazione, e su un telefono l'hover
 * non esiste: con un puntatore grossolano si apre a tocco e si chiude toccando
 * altrove, con il mouse resta legato al passaggio sopra.
 */
export function attachTip(target: Element, content: () => TipContent): void {
  target.addEventListener("mouseenter", ev => {
    if (isCoarse()) return;
    show(content(), ev as MouseEvent);
  });
  target.addEventListener("mousemove", ev => {
    if (isCoarse()) return;
    move(ev as MouseEvent);
  });
  target.addEventListener("mouseleave", () => {
    if (isCoarse()) return;
    hideTip();
  });
  target.addEventListener("pointerup", ev => {
    const pe = ev as PointerEvent;
    if (pe.pointerType === "mouse") return;
    ev.stopPropagation();
    showTipAt(content(), { x: pe.clientX, y: pe.clientY });
  });
}

/** Apre il tooltip in un punto dato, senza bisogno di un evento del mouse. */
export function showTipAt(content: TipContent, at: { x: number; y: number } | [number, number],
                          origin?: Element): void {
  const point = Array.isArray(at) ? { x: at[0], y: at[1] } : at;
  let { x, y } = point;
  if (origin) {
    const rect = origin.getBoundingClientRect();
    x += rect.left;
    y += rect.top;
  }
  render(content);
  place(x, y);
}

export function hideTip(): void {
  node().classList.remove("on");
}

/** Un tocco che non finisce su nulla chiude il tooltip aperto. */
export function dismissTipOnStrayTap(): void {
  document.addEventListener("pointerup", ev => {
    if ((ev as PointerEvent).pointerType === "mouse") return;
    hideTip();
  });
}

export function show(content: TipContent, ev: MouseEvent): void {
  render(content);
  move(ev);
}

function render(content: TipContent): void {
  const box = node();
  box.textContent = "";
  box.appendChild(el("div", "t", content.t));
  if (content.d) box.appendChild(el("div", "d", content.d));
  if (content.rows?.length) {
    const grid = el("div", "ages");
    for (const [label, value] of content.rows) {
      grid.appendChild(el("b", undefined, label));
      grid.appendChild(el("i", undefined, value));
    }
    box.appendChild(grid);
  }
  if (content.note) box.appendChild(el("div", "note", content.note));
  box.classList.add("on");
}

export function move(ev: MouseEvent): void {
  place(ev.clientX, ev.clientY);
}

/** Colloca il riquadro accanto al punto, rientrando se sborda. */
function place(cx: number, cy: number): void {
  const box = node();
  const r = box.getBoundingClientRect();
  let x = cx + 14;
  let y = cy + 16;
  if (x + r.width > window.innerWidth - 8) x = cx - r.width - 14;
  if (y + r.height > window.innerHeight - 8) y = cy - r.height - 16;
  box.style.left = Math.max(8, x) + "px";
  box.style.top = Math.max(8, y) + "px";
}
