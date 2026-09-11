import { describe, expect, it } from "vitest";
import type { Horse } from "@/types/horse";
import {
  applyTreeFilters,
  defaultTreeFilters,
  sanitizeTreeFilters,
  type TreeFilters,
} from "./treeFilters";

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

const herd = [
  horse({ id: "a", firstName: "Ash", familyName: "Emberhoof", status: "Alive", generation: 0 }),
  horse({ id: "b", firstName: "Cinder", familyName: "Emberhoof", status: "Deceased", generation: 2 }),
  horse({ id: "c", firstName: "Mist", familyName: "Frostmane", status: "Alive", generation: 1 }),
];

describe("defaultTreeFilters", () => {
  it("enables everything spanning the herd", () => {
    expect(defaultTreeFilters(herd)).toEqual({
      families: ["Emberhoof", "Frostmane"],
      knownFamilies: ["Emberhoof", "Frostmane"],
      statuses: ["Alive", "Deceased", "Retired"],
      genMin: 0,
      genMax: 2,
      search: "",
    });
  });

  it("is empty-herd safe", () => {
    expect(defaultTreeFilters([])).toEqual({
      families: [],
      knownFamilies: [],
      statuses: ["Alive", "Deceased", "Retired"],
      genMin: 0,
      genMax: 0,
      search: "",
    });
  });
});

describe("applyTreeFilters", () => {
  const all = defaultTreeFilters(herd);

  it("shows everything by default", () => {
    expect([...applyTreeFilters(herd, all)].sort()).toEqual(["a", "b", "c"]);
  });

  it("filters each dimension, AND-combined", () => {
    expect([...applyTreeFilters(herd, { ...all, families: ["Frostmane"] })]).toEqual(["c"]);
    expect([...applyTreeFilters(herd, { ...all, statuses: ["Deceased"] })]).toEqual(["b"]);
    expect([...applyTreeFilters(herd, { ...all, genMin: 1, genMax: 2 })].sort()).toEqual(["b", "c"]);
    expect([...applyTreeFilters(herd, { ...all, search: "  CIND " })]).toEqual(["b"]);
    const combined: TreeFilters = {
      ...all,
      families: ["Emberhoof"],
      statuses: ["Alive"],
      genMin: 0,
      genMax: 0,
      search: "ash",
    };
    expect([...applyTreeFilters(herd, combined)]).toEqual(["a"]);
  });

  it("explicit empty lists hide everything", () => {
    expect(applyTreeFilters(herd, { ...all, families: [] }).size).toBe(0);
    expect(applyTreeFilters(herd, { ...all, statuses: [] }).size).toBe(0);
  });
});

describe("sanitizeTreeFilters", () => {
  it("falls back on garbage", () => {
    expect(sanitizeTreeFilters(null, herd)).toEqual(defaultTreeFilters(herd));
    expect(sanitizeTreeFilters("nope", herd)).toEqual(defaultTreeFilters(herd));
  });

  it("drops unknown families and statuses, swaps and clamps generations", () => {
    expect(
      sanitizeTreeFilters(
        {
          families: ["Emberhoof", "Ghost"],
          knownFamilies: ["Emberhoof", "Frostmane"],
          statuses: ["Alive", "Zombie"],
          genMin: 5,
          genMax: 1,
          search: 42,
        },
        herd,
      ),
    ).toEqual({
      families: ["Emberhoof"],
      knownFamilies: ["Emberhoof", "Frostmane"],
      statuses: ["Alive"],
      genMin: 1,
      genMax: 2,
      search: "",
    });
  });

  it("keeps deliberate exclusions but enables newcomer families", () => {
    const withNewcomer = [
      ...herd,
      horse({ id: "d", firstName: "Gale", familyName: "Stormmane" }),
    ];
    expect(
      sanitizeTreeFilters(
        {
          families: ["Emberhoof"],
          knownFamilies: ["Emberhoof", "Frostmane"],
          statuses: ["Alive", "Deceased", "Retired"],
          genMin: 0,
          genMax: 2,
          search: "",
        },
        withNewcomer,
      ),
    ).toMatchObject({
      // Frostmane stays excluded (deliberate); Stormmane joins (new).
      families: ["Emberhoof", "Stormmane"],
      knownFamilies: ["Emberhoof", "Frostmane", "Stormmane"],
    });
  });
});
