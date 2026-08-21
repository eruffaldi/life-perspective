import { describe, expect, it } from "vitest";
import { DEFAULT_OFF, TRACKS, defaultFilters, evTrack, isTrackKey } from "../src/core/tracks.js";

describe("TRACKS", () => {
  it("non ha chiavi duplicate", () => {
    const keys = TRACKS.map(t => t.k);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("include vacanze e documenti", () => {
    const keys = TRACKS.map(t => t.k);
    expect(keys).toContain("holiday");
    expect(keys).toContain("doc");
  });
});

describe("evTrack", () => {
  it("preferisce `track` esplicito alla categoria", () => {
    expect(evTrack({ track: "home", category: "sport" })).toBe("home");
  });

  it("mappa le categorie note sulla corsia giusta", () => {
    expect(evTrack({ category: "school" })).toBe("school");
    expect(evTrack({ category: "family" })).toBe("life");
    expect(evTrack({ category: "history" })).toBe("world");
  });

  it("ricade su `life` per categorie e corsie ignote", () => {
    expect(evTrack({ category: "misteriosa" })).toBe("life");
    expect(evTrack({ track: "inesistente" })).toBe("life");
    expect(evTrack({})).toBe("life");
  });
});

describe("defaultFilters", () => {
  it("lascia spenti i documenti", () => {
    const f = defaultFilters();
    expect(f.has("doc")).toBe(false);
    for (const t of TRACKS) {
      if (!DEFAULT_OFF.includes(t.k)) expect(f.has(t.k)).toBe(true);
    }
  });

  it("rispetta `settings.filters` quando presente", () => {
    const f = defaultFilters({ filters: ["home", "work"] });
    expect([...f].sort()).toEqual(["home", "work"]);
  });

  it("ignora le corsie inventate e ricade sul default", () => {
    expect(defaultFilters({ filters: ["inesistente"] }).has("school")).toBe(true);
  });
});

describe("isTrackKey", () => {
  it("riconosce solo le corsie dichiarate", () => {
    expect(isTrackKey("doc")).toBe(true);
    expect(isTrackKey("scuola")).toBe(false);
    expect(isTrackKey(null)).toBe(false);
  });
});
