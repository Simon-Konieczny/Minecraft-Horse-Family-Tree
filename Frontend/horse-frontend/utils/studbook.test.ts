import { describe, expect, it } from "vitest";
import {
  buildFamilyRecords,
  effectiveFamily,
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
});


