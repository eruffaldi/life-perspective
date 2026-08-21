/**
 * Gesti di navigazione della carta, indipendenti dal dispositivo.
 *
 * Qui sta solo la matematica, senza DOM, così è verificabile senza simulare un
 * browser; il collegamento agli eventi è in `bindGestures`.
 *
 * La pinch è rimasta soltanto sulla carta, dove l'elemento non scorre e il
 * gesto può essere preso per intero. Sulle viste a scorrimento è stata tolta:
 * dipendeva dal fatto che il browser rispettasse `touch-action`, e quando non
 * lo fa non c'è nulla da fare dal lato del codice. La scala del grafico si
 * cambia da un comando esplicito — vedi `scale.ts`.
 *
 * `bindGestures` marca il contenitore con la classe `drag` mentre un puntatore
 * è a terra: serve al cursore a manina sul desktop.
 */

export interface Point {
  x: number;
  y: number;
}

export interface GestureHandlers {
  /** Trascinamento: spostamento in pixel dall'ultimo evento. */
  onPan(dx: number, dy: number): void;
  /** Zoom attorno a un centro: `factor` è moltiplicativo. */
  onZoom(factor: number, centre: Point): void;
  /** Tocco secco, senza trascinamento: serve per i tooltip. */
  onTap?(at: Point): void;
}

/** Spostamento oltre il quale un tocco non è più un tap. */
const TAP_SLOP = 8;
/** Durata oltre la quale un tocco non è più un tap. */
const TAP_MS = 500;

export class GestureTracker {
  private readonly points = new Map<number, Point>();
  private start: { at: Point; time: number } | null = null;
  private moved = false;
  private pinch: { distance: number; centre: Point } | null = null;

  constructor(private readonly handlers: GestureHandlers,
              private readonly now: () => number = () => Date.now()) {}

  get active(): number {
    return this.points.size;
  }

  down(id: number, at: Point): void {
    this.points.set(id, { ...at });
    if (this.points.size === 1) {
      this.start = { at: { ...at }, time: this.now() };
      this.moved = false;
    } else if (this.points.size === 2) {
      // Il secondo dito annulla il tap e apre la pinch.
      this.moved = true;
      this.pinch = this.measure();
    }
  }

  move(id: number, at: Point): void {
    const previous = this.points.get(id);
    if (!previous) return;
    this.points.set(id, { ...at });

    if (this.points.size >= 2) {
      const next = this.measure();
      if (this.pinch && next && this.pinch.distance > 0) {
        const factor = next.distance / this.pinch.distance;
        // Il centro fra le dita si sposta: è anche una traslazione.
        this.handlers.onPan(next.centre.x - this.pinch.centre.x,
                            next.centre.y - this.pinch.centre.y);
        if (factor !== 1) this.handlers.onZoom(factor, next.centre);
      }
      this.pinch = next;
      return;
    }

    const dx = at.x - previous.x;
    const dy = at.y - previous.y;
    if (this.start && !this.moved) {
      const far = Math.hypot(at.x - this.start.at.x, at.y - this.start.at.y);
      if (far > TAP_SLOP) this.moved = true;
    }
    if (dx || dy) this.handlers.onPan(dx, dy);
  }

  up(id: number): void {
    const wasSingle = this.points.size === 1;
    this.points.delete(id);
    if (this.points.size < 2) this.pinch = null;
    if (this.points.size >= 1) {
      // Restano dita a terra: si riparte dalla posizione corrente per non
      // far saltare la vista quando si alza un dito solo.
      this.pinch = this.measure();
      return;
    }
    if (wasSingle && !this.moved && this.start &&
        this.now() - this.start.time <= TAP_MS) {
      this.handlers.onTap?.(this.start.at);
    }
    this.start = null;
    this.moved = false;
  }

  cancel(): void {
    this.points.clear();
    this.pinch = null;
    this.start = null;
    this.moved = false;
  }

  private measure(): { distance: number; centre: Point } | null {
    const [a, b] = [...this.points.values()];
    if (!a || !b) return null;
    return {
      distance: Math.hypot(b.x - a.x, b.y - a.y),
      centre: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    };
  }
}

/** Fattore di zoom da una rotellina, con la stessa curva di prima. */
export function wheelFactor(deltaY: number): number {
  return Math.exp(-deltaY * 0.0016);
}

/** Il dispositivo non ha un puntatore che sa passare sopra le cose. */
export function isCoarse(): boolean {
  return typeof matchMedia === "function" && matchMedia("(hover: none)").matches;
}

/**
 * Collega il tracker a un elemento. `touch-action: none` sul contenitore è
 * indispensabile: senza, il browser si prende il gesto e lo trasforma in
 * scorrimento della pagina prima che arrivi qui.
 */
export function bindGestures(target: HTMLElement, handlers: GestureHandlers): () => void {
  const tracker = new GestureTracker(handlers);
  const local = (ev: PointerEvent): Point => {
    const rect = target.getBoundingClientRect();
    return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
  };

  const down = (ev: PointerEvent): void => {
    target.setPointerCapture?.(ev.pointerId);
    target.classList.add("drag");
    tracker.down(ev.pointerId, local(ev));
  };
  const move = (ev: PointerEvent): void => {
    if (tracker.active) ev.preventDefault();
    tracker.move(ev.pointerId, local(ev));
  };
  const up = (ev: PointerEvent): void => {
    tracker.up(ev.pointerId);
    target.releasePointerCapture?.(ev.pointerId);
    if (!tracker.active) target.classList.remove("drag");
  };
  const cancel = (): void => {
    tracker.cancel();
    target.classList.remove("drag");
  };
  const wheel = (ev: WheelEvent): void => {
    ev.preventDefault();
    const rect = target.getBoundingClientRect();
    handlers.onZoom(wheelFactor(ev.deltaY),
                    { x: ev.clientX - rect.left, y: ev.clientY - rect.top });
  };

  target.addEventListener("pointerdown", down);
  target.addEventListener("pointermove", move, { passive: false });
  target.addEventListener("pointerup", up);
  target.addEventListener("pointercancel", cancel);
  target.addEventListener("wheel", wheel, { passive: false });

  return () => {
    target.removeEventListener("pointerdown", down);
    target.removeEventListener("pointermove", move);
    target.removeEventListener("pointerup", up);
    target.removeEventListener("pointercancel", cancel);
    target.removeEventListener("wheel", wheel);
  };
}
