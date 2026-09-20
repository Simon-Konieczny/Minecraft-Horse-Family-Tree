import { describe, expect, it } from "vitest";
import {
  buildFamilyRecords,
  disambiguatedFirstNames,
  effectiveFamilies,
  effectiveFamily,
  familiesWithCounts,
  getFoundingDate,
} from "./studbook";
import type { Horse } from "@/types/horse";

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

describe("effectiveFamily", () => {
  it("prefers the stored family name", () => {
    expect(
      effectiveFamily({ familyName: "Emberhoof", dna: { Frostmane: 1.0 } }),
    ).toBe("Emberhoof");
  });

  it("derives from DNA when unstored", () => {
    expect(
      effectiveFamily({ familyName: "", dna: { Emberhoof: 0.6, Frostmane: 0.4 } }),
    ).toBe("Emberhoof-Frostmane");
  });

  it("falls back to Unknown", () => {
    expect(effectiveFamily({ familyName: "", dna: {} })).toBe("Unknown");
  });
});

describe("effectiveFamilies", () => {
  it("splits hyphenated names into constituent families", () => {
    expect(
      effectiveFamilies({
        familyName: "Aurelian-Baguette",
        dna: { Aurelian: 0.5, Baguette: 0.5 },
      }),
    ).toEqual(["Aurelian", "Baguette"]);
  });

  it("returns a single family for pure names", () => {
    expect(
      effectiveFamilies({ familyName: "Emberhoof", dna: { Emberhoof: 1.0 } }),
    ).toEqual(["Emberhoof"]);
  });
});

describe("getFoundingDate", () => {
  it("prefers createdAt", () => {
    expect(
      getFoundingDate({ id: "not-an-objectid", createdAt: "2024-05-01T12:00:00.000Z" }),
    ).toBe("2024-05-01T12:00:00.000Z");
  });

  it("falls back to the ObjectId timestamp", () => {
    // 0x66... => 2024-08-19
    const date = getFoundingDate({ id: "66c2f0000000000000000000" });
    expect(date?.slice(0, 10)).toBe("2024-08-19");
  });

  it("returns null when neither is available", () => {
    expect(getFoundingDate({ id: "nope" })).toBeNull();
  });
});

describe("familiesWithCounts", () => {
  it("groups by effective family, sorted, with counts", () => {
    expect(
      familiesWithCounts([
        { familyName: "Longbottom", dna: {} },
        { familyName: "  Longbottom  ", dna: {} },
        { familyName: "", dna: { Emberhoof: 1.0 } },
      ]),
    ).toEqual([
      { family: "Emberhoof", count: 1 },
      { family: "Longbottom", count: 2 },
    ]);
  });

  it("is empty-safe", () => {
    expect(familiesWithCounts([])).toEqual([]);
  });

  it("dual-counts hyphenated horses in both families, no hybrid key", () => {
    expect(
      familiesWithCounts([
        { familyName: "Aurelian", dna: { Aurelian: 1.0 } },
        {
          familyName: "Aurelian-Baguette",
          dna: { Aurelian: 0.5, Baguette: 0.5 },
        },
      ]),
    ).toEqual([
      { family: "Aurelian", count: 2 },
      { family: "Baguette", count: 1 },
    ]);
  });
});

describe("disambiguatedFirstNames", () => {
  it("passes unique names through untouched", () => {
    const out = disambiguatedFirstNames([
      { id: "a", firstName: "Ash" },
      { id: "b", firstName: "Mist" },
    ]);
    expect(out.get("a")).toBe("Ash");
    expect(out.get("b")).toBe("Mist");
  });

  it("suffixes duplicates by seniority, eldest keeps the bare name", () => {
    const out = disambiguatedFirstNames([
      { id: "young", firstName: "Onyx", createdAt: "2024-06-01T00:00:00.000Z" },
      { id: "old", firstName: "Onyx", createdAt: "2024-01-01T00:00:00.000Z" },
      { id: "mid", firstName: "Onyx", createdAt: "2024-03-01T00:00:00.000Z" },
    ]);
    expect(out.get("old")).toBe("Onyx");
    expect(out.get("mid")).toBe("Onyx II");
    expect(out.get("young")).toBe("Onyx III");
  });

  it("is empty-safe and deterministic without dates", () => {
    expect(disambiguatedFirstNames([]).size).toBe(0);
    const herd = [
      { id: "b", firstName: "Onyx" },
      { id: "a", firstName: "Onyx" },
    ];
    expect(disambiguatedFirstNames(herd)).toEqual(disambiguatedFirstNames([...herd].reverse()));
  });
});

describe("buildFamilyRecords", () => {
  const herd = [
    horse({
      id: "66c2f0000000000000000001",
      firstName: "Ash",
      familyName: "Emberhoof",
      dna: { Emberhoof: 1.0 },
      generation: 0,
      speed: 0.25,
      status: "Deceased",
    }),
    horse({
      id: "66c2f0000000000000000002",
      firstName: "Cinder",
      familyName: "Emberhoof",
      dna: { Emberhoof: 0.8, Frostmane: 0.2 },
      generation: 4,
      speed: 0.3,
      status: "Retired",
    }),
    horse({
      id: "66c2f0000000000000000003",
      firstName: "Mist",
      familyName: "Frostmane",
      dna: { Frostmane: 1.0 },
      generation: 0,
      jump: 0.9,
    }),
  ];

  it("groups founders per family with dates and stats", () => {
    const records = buildFamilyRecords(herd);
    const ember = records.find((r) => r.family === "Emberhoof")!;
    expect(ember.count).toBe(2);
    expect(ember.founders.map((f) => f.name)).toEqual(["Ash Emberhoof"]);
    expect(ember.founders[0].foundedAt?.slice(0, 10)).toBe("2024-08-19");
  });

  it("picks the highest-share representative including deceased horses", () => {
    const records = buildFamilyRecords(herd);
    const ember = records.find((r) => r.family === "Emberhoof")!;
    expect(ember.lastPurebred?.name).toBe("Ash Emberhoof");
    expect(ember.lastPurebred?.share).toBe(1.0);
  });

  it("records fastest / highest / tankiest holders per family", () => {
    const records = buildFamilyRecords(herd);
    const ember = records.find((r) => r.family === "Emberhoof")!;
    expect(ember.records.speed?.horseName).toBe("Cinder Emberhoof");
    const frost = records.find((r) => r.family === "Frostmane")!;
    expect(frost.records.jump?.horseName).toBe("Mist Frostmane");
  });

  it("returns no families for an empty herd", () => {
    expect(buildFamilyRecords([])).toEqual([]);
  });

  it("averages translated stats over living members only", () => {
    const records = buildFamilyRecords([
      horse({ id: "a", familyName: "Emberhoof", speed: 0.2, status: "Alive" }),
      horse({ id: "b", familyName: "Emberhoof", speed: 0.3, status: "Alive" }),
      horse({ id: "c", familyName: "Emberhoof", speed: 0.1, status: "Deceased" }),
      horse({ id: "d", familyName: "Emberhoof", speed: 0.1, status: "Retired" }),
    ]);
    const ember = records.find((r) => r.family === "Emberhoof")!;
    // Translate-first: avg(0.2, 0.3) * 43.17, deceased/retired excluded.
    expect(ember.averages.aliveCount).toBe(2);
    expect(ember.averages.speed).toBeCloseTo(0.25 * 43.17, 3);
  });

  it("reports null averages when nobody is alive", () => {
    const records = buildFamilyRecords(herd);
    const ember = records.find((r) => r.family === "Emberhoof")!;
    expect(ember.averages).toEqual({
      speed: null,
      jump: null,
      health: null,
      aliveCount: 0,
    });
  });

  it("counts a 50/50 hybrid toward both parents with no hybrid card", () => {
    const records = buildFamilyRecords([
      horse({
        id: "h1",
        firstName: "Solaris",
        familyName: "Aurelian",
        dna: { Aurelian: 1.0 },
        generation: 0,
      }),
      horse({
        id: "h2",
        firstName: "Dusk",
        familyName: "Baguette",
        dna: { Baguette: 1.0 },
        generation: 0,
      }),
      horse({
        id: "h3",
        firstName: "Foal",
        familyName: "Aurelian-Baguette",
        dna: { Aurelian: 0.5, Baguette: 0.5 },
        generation: 1,
      }),
    ]);
    expect(records.map((r) => r.family)).toEqual(["Aurelian", "Baguette"]);
    expect(records.find((r) => r.family === "Aurelian")!.count).toBe(2);
    expect(records.find((r) => r.family === "Baguette")!.count).toBe(2);
  });
});


