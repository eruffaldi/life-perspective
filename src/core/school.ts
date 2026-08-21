/**
 * Cicli scolastici italiani, generati dalla sola data di nascita.
 *
 * Si entra in prima elementare a settembre dell'anno in cui si compiono sei
 * anni: da lì discende tutto, comprese le date di maturità e laurea che
 * altrimenti andrebbero inserite a mano una per una.
 */
import { parseDate } from "./date.js";
import { t } from "../i18n/index.js";
import type { DateVal, EventItem, Period, RawSchool, StageKey } from "./types.js";
import { STAGE_KEYS } from "./types.js";

interface Stage {
  key: StageKey;
  /** Chiave nel catalogo: l'etichetta si risolve al momento del disegno. */
  label: () => string;
  /** Età di ingresso e di uscita, e mese di fine. */
  from: number;
  to: number;
  endMonth: number;
  endEvent?: () => string;
}

export const STAGES: readonly Stage[] = [
  { key: "primary",    label: () => t().stages.primary,    from: 6,  to: 11, endMonth: 6 },
  { key: "middle",     label: () => t().stages.middle,     from: 11, to: 14, endMonth: 6,
    endEvent: () => t().stages.middleEnd },
  { key: "highschool", label: () => t().stages.highschool, from: 14, to: 19, endMonth: 6,
    endEvent: () => t().stages.highschoolEnd },
  { key: "bachelor",   label: () => t().stages.bachelor,   from: 19, to: 22, endMonth: 7,
    endEvent: () => t().stages.bachelorEnd },
  { key: "master",     label: () => t().stages.master,     from: 22, to: 24, endMonth: 7,
    endEvent: () => t().stages.masterEnd }
];

const STAGE_IX: Record<StageKey, number> =
  Object.fromEntries(STAGES.map((s, i) => [s.key, i])) as Record<StageKey, number>;

export function isStageKey(v: unknown): v is StageKey {
  return typeof v === "string" && (STAGE_KEYS as readonly string[]).includes(v);
}

export interface SchoolOutput {
  periods: Period[];
  events: EventItem[];
}

/**
 * @param replaced cicli coperti da un periodo inserito a mano, da non generare
 */
export function generateSchool(
  cfg: RawSchool | undefined,
  birth: DateVal,
  replaced: readonly StageKey[] = []
): SchoolOutput {
  const out: SchoolOutput = { periods: [], events: [] };
  if (!cfg) return out;

  const through = isStageKey(cfg.through) ? cfg.through : "highschool";
  const last = STAGE_IX[through];
  const shift = cfg.early ? -1 : 0;
  const delays = cfg.delays ?? {};
  const skip = new Set<StageKey>(replaced);

  let cumulative = 0;
  for (let i = 0; i <= last; i++) {
    const st = STAGES[i];
    if (!st) continue;
    const yStart = birth.y + st.from + shift + cumulative;
    // Il ritardo di un ciclo sposta la sua fine e tutto ciò che segue,
    // mai ciò che precede.
    cumulative += delays[st.key] ?? 0;
    const yEnd = birth.y + st.to + shift + cumulative;
    if (skip.has(st.key)) continue;

    const endStr = yEnd + "-" + String(st.endMonth).padStart(2, "0");
    out.periods.push({
      label: st.label(),
      start: parseDate(yStart + "-09"),
      end: parseDate(endStr),
      track: "school",
      placeName: null,
      circa: false,
      generated: true,
      stage: st.key
    });
    if (st.endEvent) {
      out.events.push({
        label: st.endEvent(),
        date: parseDate(endStr),
        category: "school",
        placeName: null,
        circa: false,
        generated: true
      });
    }
  }
  return out;
}
