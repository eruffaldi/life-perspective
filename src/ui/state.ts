/**
 * Stato dell'applicazione, in un posto solo.
 *
 * I filtri agiscono al momento del disegno, non della costruzione del modello:
 * accendere una corsia non deve ricostruire nulla.
 */
import { defaultFilters } from "../core/tracks.js";
import type { Diagnostic, Model, TrackKey } from "../core/types.js";

export type ViewName = "chart" | "ages" | "places" | "dense" | "matrix";

export interface AppState {
  model: Model | null;
  view: ViewName;
  /** Pixel per anno nelle viste a grafico. */
  ppy: number;
  filters: Set<TrackKey>;
  diagnostics: Diagnostic[];
  /** Anno selezionato sulla carta, conservato fra un ridisegno e l'altro. */
  mapYear: number | null;
  /** Includere il passato negli anni densi. */
  densePast: boolean;
}

export const state: AppState = {
  model: null,
  view: "chart",
  ppy: 26,
  filters: defaultFilters(),
  diagnostics: [],
  mapYear: null,
  densePast: false
};

/** Il modello, con l'invariante che qualcosa sia stato caricato. */
export function model(): Model {
  if (!state.model) throw new Error("Nessun modello caricato.");
  return state.model;
}

/** Una corsia è visibile? Usata da tutte le viste. */
export function visible(track: TrackKey | undefined): boolean {
  return state.filters.has(track ?? "life");
}
