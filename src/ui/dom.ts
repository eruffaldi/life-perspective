/** Aiuti minimi per costruire DOM senza librerie. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, cls?: string, text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
}

export function svgEl<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
  return document.createElementNS("http://www.w3.org/2000/svg", tag);
}

/** Query che solleva se l'elemento manca: un id assente è un bug, non un caso. */
export function must<T extends Element = HTMLElement>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error("Elemento mancante nel markup: " + selector);
  return node;
}

export function clear(node: Element): void {
  node.textContent = "";
}
