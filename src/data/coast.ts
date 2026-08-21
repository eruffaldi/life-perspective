/**
 * Base cartografica incorporata. Non si scrive a mano: si rigenera con
 * `npm run coast` da Natural Earth (public domain, via `world-atlas`).
 */
import raw from "./coast.json";

export interface CoastLayer {
  /** Coste e confini insieme, disegnati come tratto principale. */
  all: string;
  /** Solo confini interni, sovrapposti in tono più chiaro. */
  border: string;
}

export interface CoastData {
  world: CoastLayer;
  /** Livello fine, valido solo dentro il riquadro [ovest, sud, est, nord]. */
  euro: CoastLayer & { bbox: [number, number, number, number] };
}

export const COAST = raw as CoastData;
