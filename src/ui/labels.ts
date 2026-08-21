/**
 * Collocazione delle etichette.
 *
 * Il problema è sempre lo stesso — molte scritte, poco spazio, nessuna deve
 * accavallarsi — e va risolto una volta sola. Prima ce n'erano tre versioni:
 * la carta faceva un confronto vero fra rettangoli, il grafico si limitava a
 * guardare quanto spazio c'era fino all'elemento successivo. Quel secondo
 * criterio sbaglia in entrambe le direzioni: nasconde un'etichetta perché il
 * vicino è troppo vicino, anche quando il vicino è a sua volta nascosto e non
 * occupa nulla; e non accorge nulla quando è la scritta a sborda in avanti
 * oltre l'elemento che la segue.
 *
 * L'algoritmo è avido: si ordina per importanza e si colloca chi non collide
 * con quanto già collocato. Non è ottimo, ma è stabile — la stessa scritta
 * resta visibile mentre si zooma — ed è l'unica proprietà che conta qui.
 */

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface LabelCandidate<T> {
  item: T;
  box: Box;
  /** Più alto viene collocato prima e vince le collisioni. */
  priority: number;
}

function overlaps(a: Box, b: Box): boolean {
  return a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
}

/**
 * @param gap margine minimo fra due etichette, in pixel
 * @returns gli elementi le cui etichette possono comparire
 */
export function placeLabels<T>(candidates: readonly LabelCandidate<T>[], gap = 4): Set<T> {
  const placed: Box[] = [];
  const visible = new Set<T>();
  const order = candidates.slice().sort((a, b) =>
    b.priority - a.priority || a.box.x0 - b.box.x0);

  for (const candidate of order) {
    const padded: Box = {
      x0: candidate.box.x0 - gap / 2, x1: candidate.box.x1 + gap / 2,
      y0: candidate.box.y0, y1: candidate.box.y1
    };
    if (placed.some(b => overlaps(padded, b))) continue;
    placed.push(padded);
    visible.add(candidate.item);
  }
  return visible;
}

/**
 * Larghezza stimata di una scritta. Misurarla davvero costringerebbe a un
 * reflow per etichetta, centinaia per ridisegno: la stima per eccesso costa
 * qualche scritta nascosta di troppo e nessuna sovrapposizione.
 */
export function estimateWidth(text: string, fontSize = 11): number {
  return text.length * fontSize * 0.55;
}

/** Rettangolo di un'etichetta posta a destra di un punto. */
export function labelBox(x: number, y: number, text: string,
                         offset: number, fontSize = 11): Box {
  const height = fontSize * 1.25;
  return {
    x0: x + offset,
    x1: x + offset + estimateWidth(text, fontSize),
    y0: y - height / 2,
    y1: y + height / 2
  };
}
