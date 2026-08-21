import { describe, expect, it } from "vitest";
import { parseDate } from "../src/core/date.js";
import { generateSchool, isStageKey } from "../src/core/school.js";
import type { StageKey } from "../src/core/types.js";

const byStage = (out: ReturnType<typeof generateSchool>) =>
  Object.fromEntries(out.periods.map(p => [p.stage, p]));

describe("generateSchool", () => {
  it("non genera nulla senza blocco `school`", () => {
    const out = generateSchool(undefined, parseDate("2012-09-03"));
    expect(out.periods).toHaveLength(0);
    expect(out.events).toHaveLength(0);
  });

  it("fa entrare in prima a settembre dell'anno dei sei anni", () => {
    const s = byStage(generateSchool({ through: "bachelor" }, parseDate("2012-09-03")));
    expect(s["primary"]?.start.y).toBe(2018);
    expect(s["primary"]?.start.m).toBe(9);
  });

  it("deriva liceo e maturità dalla sola data di nascita", () => {
    const out = generateSchool({ through: "bachelor" }, parseDate("2012-09-03"));
    const s = byStage(out);
    expect(s["highschool"]?.start.y).toBe(2026);
    expect(s["highschool"]?.end?.y).toBe(2031);
    expect(s["highschool"]?.end?.m).toBe(6);
    expect(out.events.find(e => e.label === "Maturità")?.date.y).toBe(2031);
  });

  it("si ferma al ciclo indicato da `through`", () => {
    const solo = generateSchool({ through: "highschool" }, parseDate("2016-05-21"));
    expect(solo.periods).toHaveLength(3);
    expect(byStage(solo)["master"]).toBeUndefined();

    const fino = byStage(generateSchool({ through: "bachelor" }, parseDate("2012-09-03")));
    expect(fino["bachelor"]?.end?.y).toBe(2034);
    expect(fino["master"]).toBeUndefined();
  });

  it("usa il liceo come default quando `through` manca o è ignoto", () => {
    expect(generateSchool({}, parseDate("2012-01-01")).periods).toHaveLength(3);
    expect(generateSchool({ through: "dottorato" }, parseDate("2012-01-01")).periods).toHaveLength(3);
  });

  it("anticipa tutto di un anno con `early`", () => {
    const s = byStage(generateSchool({ early: true, through: "primary" }, parseDate("2012-01-15")));
    expect(s["primary"]?.start.y).toBe(2017);
  });

  it("propaga un ritardo in avanti, mai all'indietro", () => {
    const s = byStage(generateSchool(
      { through: "highschool", delays: { middle: 1 } }, parseDate("2012-09-03")));
    expect(s["primary"]?.end?.y).toBe(2023);      // prima del ritardo: invariato
    expect(s["highschool"]?.end?.y).toBe(2032);   // dopo: spostato di un anno
  });

  it("somma più ritardi", () => {
    const s = byStage(generateSchool(
      { through: "master", delays: { middle: 1, highschool: 2 } }, parseDate("2012-09-03")));
    expect(s["master"]?.end?.y).toBe(2039);       // 2036 + 1 + 2
  });

  it("salta i cicli coperti da un periodo inserito a mano", () => {
    const out = generateSchool({ through: "bachelor" }, parseDate("2012-09-03"), ["highschool"]);
    const s = byStage(out);
    expect(s["highschool"]).toBeUndefined();
    expect(s["bachelor"]).toBeDefined();
    expect(out.events.find(e => e.label === "Maturità")).toBeUndefined();
  });

  it("marca come generato ciò che non ha scritto l'utente", () => {
    const out = generateSchool({ through: "primary" }, parseDate("2012-09-03"));
    expect(out.periods.every(p => p.generated)).toBe(true);
    expect(out.periods.every(p => p.track === "school")).toBe(true);
  });
});

describe("isStageKey", () => {
  it("riconosce solo i cicli noti", () => {
    const keys: StageKey[] = ["primary", "middle", "highschool", "bachelor", "master"];
    for (const k of keys) expect(isStageKey(k)).toBe(true);
    expect(isStageKey("dottorato")).toBe(false);
    expect(isStageKey(undefined)).toBe(false);
    expect(isStageKey(3)).toBe(false);
  });
});
