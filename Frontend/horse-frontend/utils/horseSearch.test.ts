import { describe, expect, it } from "vitest";
import type { Horse } from "@/types/horse";
import { parseSearchQuery, searchHorses } from "./horseSearch";
import { translateStat } from "./translateRawStats";

function horse(overrides: Partial<Horse> & { id: string }): Horse {
  return {
    firstName: "Test",
    familyName: "",
    dna: {},
    status: "Alive",
    speed: 0.2,
    jump: 0.7,
    health: 20,
    variant: 0,
    generation: 0,
    ...overrides,
  };
}

// speed 0.3 -> ~12.95 m/s; jump 0.7 -> ~3.12 blocks; health 20 -> 10 hp.
const herd = [
  horse({ id: "a", firstName: "Solaris", familyName: "Aurelian", dna: { Aurelian: 1.0 }, speed: 0.3, generation: 0 }),
  horse({ id: "b", firstName: "Dusk", familyName: "Baguette", dna: { Baguette: 1.0 }, speed: 0.15, status: "Deceased", generation: 0 }),
  horse({
    id: "c",
    firstName: "Dawn",
    familyName: "Aurelian-Baguette",
    dna: { Aurelian: 0.5, Baguette: 0.5 },
    speed: 0.25,
    generation: 1,
  }),
];

describe("parseSearchQuery", () => {
  it("parses stat and gen operators", () => {
    expect(parseSearchQuery("speed>12")).toEqual([
      { kind: "stat", field: "speed", op: ">", value: 12 },
    ]);
    expect(parseSearchQuery("gen:2")).toEqual([{ kind: "gen", op: ":", value: 2 }]);
    expect(parseSearchQuery("g3")).toEqual([{ kind: "gen", op: "=", value: 3 }]);
  });

  it("falls back to text for unknown fields", () => {
    expect(parseSearchQuery("color>3")).toEqual([{ kind: "text", value: "color>3" }]);
  });
});

describe("searchHorses", () => {
  it("matches full names case-insensitively", () => {
    expect(searchHorses(herd, "  SOLA ").map((h) => h.horse.id)).toEqual(["a"]);
  });

  it("matches family parts including hyphenated hybrids", () => {
    expect(searchHorses(herd, "baguette").map((h) => h.horse.id).sort()).toEqual(["b", "c"]);
    expect(searchHorses(herd, "aurelian").map((h) => h.horse.id).sort()).toEqual(["a", "c"]);
  });

  it("AND-combines multiple tokens", () => {
    expect(searchHorses(herd, "dawn baguette").map((h) => h.horse.id)).toEqual(["c"]);
    expect(searchHorses(herd, "dusk aurelian")).toEqual([]);
  });

  it("matches generations via gen:, g-shorthand, and bare numbers", () => {
    expect(searchHorses(herd, "gen:1").map((h) => h.horse.id)).toEqual(["c"]);
    expect(searchHorses(herd, "g0").map((h) => h.horse.id).sort()).toEqual(["a", "b"]);
    expect(searchHorses(herd, "gen>0").map((h) => h.horse.id)).toEqual(["c"]);
  });

  it("matches status substrings", () => {
    expect(searchHorses(herd, "deceased").map((h) => h.horse.id)).toEqual(["b"]);
  });

  it("compares stat operators in display units", () => {
    const fast = translateStat("speed", 0.3);
    expect(fast).toBeGreaterThan(12);
    expect(searchHorses(herd, "speed>10").map((h) => h.horse.id).sort()).toEqual(["a", "c"]);
    expect(searchHorses(herd, "speed>12").map((h) => h.horse.id)).toEqual(["a"]);
    expect(searchHorses(herd, `speed>=${fast}`).map((h) => h.horse.id)).toEqual(["a"]);
    expect(searchHorses(herd, "hp<10").map((h) => h.horse.id)).toEqual([]);
    expect(searchHorses(herd, "jump>=3").map((h) => h.horse.id).sort()).toEqual(["a", "b", "c"]);
  });

  it("returns [] for empty queries and caps results", () => {
    expect(searchHorses(herd, "   ")).toEqual([]);
    expect(searchHorses(herd, "gen>=0", 1)).toHaveLength(1);
  });
});
