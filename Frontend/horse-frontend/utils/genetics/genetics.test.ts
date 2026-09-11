import { describe, expect, it } from "vitest";
import {
  assertDnaSum,
  calculateColorFromDna,
  mergeDna,
  normalizeDna,
  resolveOriginBlood,
} from "./utils";
import { processNewHorseGenetics } from "./service";
import type { Horse } from "@/types/horse";

function horseWithDna(dna: Record<string, number>): Horse {
  return {
    id: "test-id",
    firstName: "Test",
    familyName: "",
    dna,
    status: "Alive",
    speed: 0,
    jump: 0,
    health: 0,
    variant: 0,
    generation: 0,
  };
}

describe("mergeDna", () => {
  it("averages two different purebreds to exactly 50/50", () => {
    expect(mergeDna({ Emberhoof: 1.0 }, { Frostmane: 1.0 })).toEqual({
      Emberhoof: 0.5,
      Frostmane: 0.5,
    });
  });

  it("collapses same-bloodline purebreds to 100%, not 50%", () => {
    expect(mergeDna({ Emberhoof: 1.0 }, { Emberhoof: 1.0 })).toEqual({
      Emberhoof: 1.0,
    });
  });

  it("always sums to ~1.0 given valid inputs", () => {
    const merged = mergeDna(
      { Emberhoof: 0.6, Frostmane: 0.4 },
      { Emberhoof: 0.25, "Thunder Blood": 0.75 },
    );
    const sum = Object.values(merged).reduce((t, v) => t + v, 0);
    expect(sum).toBeCloseTo(1.0, 9);
  });

  it("is order-independent (sire/dam interchangeable)", () => {
    const sire = { Emberhoof: 0.7, Frostmane: 0.3 };
    const dam = { Frostmane: 0.5, "Thunder Blood": 0.5 };
    expect(mergeDna(sire, dam)).toEqual(mergeDna(dam, sire));
  });

  it("halves a trace bloodline present in one parent (neither drops nor doubles it)", () => {
    expect(mergeDna({ Emberhoof: 0.9, Frostmane: 0.1 }, { Emberhoof: 1.0 })).toEqual({
      Emberhoof: 0.95,
      Frostmane: 0.05,
    });
  });

  it("does not drift across 5 chained generations", () => {
    let dna: Record<string, number> = { Emberhoof: 1.0 };
    const partner = { Frostmane: 0.6, "Thunder Blood": 0.4 };
    for (let gen = 0; gen < 5; gen++) {
      dna = mergeDna(dna, partner);
    }
    const sum = Object.values(dna).reduce((t, v) => t + v, 0);
    expect(sum).toBeCloseTo(1.0, 9);
  });
});

describe("normalizeDna / assertDnaSum guard", () => {
  it("scales near-miss maps to exactly 1.0, preserving ratios", () => {
    const normalized = normalizeDna({ Emberhoof: 0.6, Frostmane: 0.39 });
    const sum = Object.values(normalized).reduce((t, v) => t + v, 0);
    expect(sum).toBe(1.0);
    expect(normalized.Emberhoof / normalized.Frostmane).toBeCloseTo(0.6 / 0.39, 12);
  });

  it("passes valid maps including float dust", () => {
    expect(() => assertDnaSum({ Emberhoof: 1.0 })).not.toThrow();
    expect(() => assertDnaSum({ Emberhoof: 0.9999999 })).not.toThrow();
    expect(() => assertDnaSum({ Unknown: 1.0 })).not.toThrow();
  });

  it("rejects corrupt maps", () => {
    expect(() => assertDnaSum({ Emberhoof: 0.5 })).toThrow(/sum to 0\.5/);
    expect(() => assertDnaSum({ Emberhoof: 1.2 })).toThrow(/sum to 1\.2/);
    expect(() => assertDnaSum({ Emberhoof: -0.5, Frostmane: 1.5 })).toThrow();
    expect(() => assertDnaSum({ Emberhoof: NaN })).toThrow();
    expect(() => assertDnaSum({})).toThrow(/sum to 0\.0/);
  });

  it("processNewHorseGenetics rejects a corrupt parent instead of poisoning the foal", () => {
    const sire = horseWithDna({ Emberhoof: 1.0 });
    const dam = horseWithDna({ Frostmane: 0.5 });
    expect(() => processNewHorseGenetics(sire, dam)).toThrow(/dam/);
  });

  it("processNewHorseGenetics accepts valid parents", () => {
    const { dna } = processNewHorseGenetics(
      horseWithDna({ Emberhoof: 1.0 }),
      horseWithDna({ Frostmane: 1.0 }),
    );
    expect(dna).toEqual({ Emberhoof: 0.5, Frostmane: 0.5 });
  });
});

describe("resolveOriginBlood", () => {
  const colors = { Longbottom: "#123456", Emberhoof: "#ff0000", Unknown: "#444444" };

  it("resolves surnames to canonical casing, ignoring case/whitespace", () => {
    expect(resolveOriginBlood("Longbottom", colors)).toBe("Longbottom");
    expect(resolveOriginBlood("  longbottom  ", colors)).toBe("Longbottom");
    expect(resolveOriginBlood("EMBERHOOF", colors)).toBe("Emberhoof");
  });

  it("returns undefined for blank, Unknown, or unmatched names", () => {
    expect(resolveOriginBlood("", colors)).toBeUndefined();
    expect(resolveOriginBlood("   ", colors)).toBeUndefined();
    expect(resolveOriginBlood(undefined, colors)).toBeUndefined();
    expect(resolveOriginBlood("Unknown", colors)).toBeUndefined();
    expect(resolveOriginBlood("Mistral", colors)).toBeUndefined();
  });

  it("seeds founder DNA and color through processNewHorseGenetics", () => {
    const { dna, hexColor, generation } = processNewHorseGenetics(
      undefined,
      undefined,
      resolveOriginBlood("longbottom", colors),
      colors,
    );
    expect(dna).toEqual({ Longbottom: 1.0 });
    expect(hexColor).toBe("#123456");
    expect(generation).toBe(0);
  });

  it("leaves two-parent inheritance untouched by originBlood", () => {
    const { dna } = processNewHorseGenetics(
      horseWithDna({ Emberhoof: 1.0 }),
      horseWithDna({ Frostmane: 1.0 }),
      "Longbottom",
      colors,
    );
    expect(dna).toEqual({ Emberhoof: 0.5, Frostmane: 0.5 });
  });
});

describe("calculateColorFromDna", () => {
  it("returns the Unknown fallback for empty DNA (no crash, not black)", () => {
    expect(calculateColorFromDna({})).toBe("#444444");
  });

  it("returns exactly the bloodline's hex for a 100% map", () => {
    expect(calculateColorFromDna({ Emberhoof: 1.0 })).toBe("#ff0000");
  });

  it("returns the arithmetic midpoint for a 50/50 pair", () => {
    // Emberhoof (255,0,0) + Frostmane (0,255,255) -> (128,128,128)
    expect(
      calculateColorFromDna({ Emberhoof: 0.5, Frostmane: 0.5 }),
    ).toBe("#808080");
  });

  it("falls back gracefully for bloodlines missing from the registry", () => {
    expect(calculateColorFromDna({ NoSuchBloodline: 1.0 })).toBe("#444444");
  });

  it("looks colors up in the injected registry map, not the built-in one", () => {
    const registry = { Stormmane: "#123456", Unknown: "#444444" };
    expect(calculateColorFromDna({ Stormmane: 1.0 }, registry)).toBe("#123456");
    // Entries absent from the injected map fall back to its Unknown.
    expect(calculateColorFromDna({ Emberhoof: 1.0 }, registry)).toBe("#444444");
  });
});
