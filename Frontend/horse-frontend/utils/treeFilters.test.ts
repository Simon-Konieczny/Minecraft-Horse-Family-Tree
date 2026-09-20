import { describe, expect, it } from "vitest";
import type { Horse } from "@/types/horse";
import {
  applyTreeFilters,
  defaultTreeFilters,
  sanitizeTreeFilters,
  TREE_FILTERS_VERSION,
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
      knownGenMin: 0,
      knownGenMax: 2,
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
      knownGenMin: 0,
      knownGenMax: 0,
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

  it("keeps hyphenated horses visible when any constituent family is enabled", () => {
    const withHybrid = [
      ...herd,
      horse({ id: "d", firstName: "Dawn", familyName: "Emberhoof-Frostmane", generation: 1 }),
    ];
    const filters = {
      ...defaultTreeFilters(withHybrid),
      families: ["Emberhoof"],
    };
    expect([...applyTreeFilters(withHybrid, filters)]).toEqual(["a", "b", "d"]);
  });

  it("searches families, generations, and stat operators", () => {
    expect([...applyTreeFilters(herd, { ...all, search: "frostmane" })]).toEqual(["c"]);
    expect([...applyTreeFilters(herd, { ...all, search: "gen:2" })]).toEqual(["b"]);
    // Speeds are raw (0.2 -> ~8.6 m/s, 0.3 implied none here); use a loose bound.
    expect([...applyTreeFilters(herd, { ...all, search: "speed>1" })].sort()).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect([...applyTreeFilters(herd, { ...all, search: "speed>100" })]).toEqual([]);
  });
});

describe("sanitizeTreeFilters", () => {
  it("falls back on garbage", () => {
    expect(sanitizeTreeFilters(null, herd)).toEqual(defaultTreeFilters(herd));
    expect(sanitizeTreeFilters("nope", herd)).toEqual(defaultTreeFilters(herd));
  });

  it("resets unversioned (pre-v2) cookies to defaults", () => {
    expect(
      sanitizeTreeFilters(
        {
          families: ["Emberhoof"],
          knownFamilies: ["Emberhoof", "Frostmane"],
          statuses: ["Alive"],
          genMin: 0,
          genMax: 0,
          search: "",
        },
        herd,
      ),
    ).toEqual(defaultTreeFilters(herd));
  });

  it("never restores a persisted search query", () => {
    const restored = sanitizeTreeFilters(
      {
        version: TREE_FILTERS_VERSION,
        families: ["Emberhoof", "Frostmane"],
        knownFamilies: ["Emberhoof", "Frostmane"],
        statuses: ["Alive", "Deceased", "Retired"],
        genMin: 0,
        genMax: 2,
        knownGenMin: 0,
        knownGenMax: 2,
        search: "ash speed>100",
      },
      herd,
    );
    expect(restored.search).toBe("");
  });

  it("drops unknown families and statuses, swaps and clamps generations", () => {
    expect(
      sanitizeTreeFilters(
        {
          version: TREE_FILTERS_VERSION,
          families: ["Emberhoof", "Ghost"],
          knownFamilies: ["Emberhoof", "Frostmane"],
          statuses: ["Alive", "Zombie"],
          genMin: 5,
          genMax: 1,
          knownGenMin: 0,
          knownGenMax: 2,
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
      knownGenMin: 0,
      knownGenMax: 2,
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
          version: TREE_FILTERS_VERSION,
          families: ["Emberhoof"],
          knownFamilies: ["Emberhoof", "Frostmane"],
          statuses: ["Alive", "Deceased", "Retired"],
          genMin: 0,
          genMax: 2,
          knownGenMin: 0,
          knownGenMax: 2,
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

  it("auto-expands bounds for newcomer generations (Sunbeam scenario)", () => {
    // Cookie saved when the herd topped out at Gen 0; a Gen 1 foal
    // arrives since. The foal must stay visible without a Reset.
    const withFoal = [
      horse({ id: "a", firstName: "Solaris", familyName: "Aurelian", generation: 0 }),
      horse({
        id: "s",
        firstName: "Sunbeam",
        familyName: "Aurelian-Baguette",
        dna: { Aurelian: 0.5, Baguette: 0.5 },
        generation: 1,
      }),
    ];
    const restored = sanitizeTreeFilters(
      {
        version: TREE_FILTERS_VERSION,
        families: ["Aurelian", "Baguette"],
        knownFamilies: ["Aurelian", "Baguette"],
        statuses: ["Alive", "Deceased", "Retired"],
        genMin: 0,
        genMax: 0,
        knownGenMin: 0,
        knownGenMax: 0,
        search: "",
      },
      withFoal,
    );
    expect(restored.genMax).toBe(1);
    expect([...applyTreeFilters(withFoal, restored)].sort()).toEqual(["a", "s"]);
  });

  it("preserves deliberate narrowing inside the saved span", () => {
    const restored = sanitizeTreeFilters(
      {
        version: TREE_FILTERS_VERSION,
        families: ["Emberhoof", "Frostmane"],
        knownFamilies: ["Emberhoof", "Frostmane"],
        statuses: ["Alive", "Deceased", "Retired"],
        genMin: 1,
        genMax: 1,
        knownGenMin: 0,
        knownGenMax: 2,
        search: "",
      },
      herd,
    );
    expect(restored.genMin).toBe(1);
    expect(restored.genMax).toBe(1);
  });

  it("keeps a narrowed cap when the herd grows beyond it", () => {
    const grown = [
      ...herd,
      horse({ id: "d", firstName: "Gale", familyName: "Stormmane", generation: 7 }),
    ];
    const restored = sanitizeTreeFilters(
      {
        version: TREE_FILTERS_VERSION,
        families: ["Emberhoof", "Frostmane", "Stormmane"],
        knownFamilies: ["Emberhoof", "Frostmane"],
        statuses: ["Alive", "Deceased", "Retired"],
        genMin: 0,
        genMax: 3,
        knownGenMin: 0,
        knownGenMax: 5,
        search: "",
      },
      grown,
    );
    // genMax 3 < saved span top 5: deliberate, stays put.
    expect(restored.genMax).toBe(3);
  });
});
