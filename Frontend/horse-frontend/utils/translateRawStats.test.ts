import { describe, expect, it } from "vitest";
import {
  translateStat,
  translateStatsForDisplay,
  untranslateStat,
} from "./translateRawStats";
import { getVariantName } from "./variant";

// Tolerance absorbs the .toFixed(4) rounding in the forward direction.
const TOLERANCE = 1e-3;

describe("stat translation round-trips", () => {
  it.each([
    { field: "speed", raw: 0.2 },
    { field: "speed", raw: 0.3375 },
    { field: "jump", raw: 0.7 },
    { field: "jump", raw: 1.0 },
    { field: "health", raw: 20 },
    { field: "health", raw: 30 },
  ])("$field: untranslate(translate(x)) ~= x", ({ field, raw }) => {
    expect(untranslateStat(field, translateStat(field, raw))).toBeCloseTo(
      raw,
      -Math.log10(TOLERANCE),
    );
  });

  it("unknown fields pass through untouched", () => {
    expect(translateStat("variant", 5)).toBe(5);
    expect(untranslateStat("variant", 5)).toBe(5);
  });
});

describe("translateStatsForDisplay delegates to the single sources", () => {
  it("matches translateStat per field", () => {
    const raw = { speed: 0.25, jump: 0.8, health: 24, variant: 2 };
    const processed = translateStatsForDisplay(raw);
    expect(processed.speed).toBe(translateStat("speed", raw.speed));
    expect(processed.jump).toBe(translateStat("jump", raw.jump));
    expect(processed.health).toBe(translateStat("health", raw.health));
    expect(processed.variant).toBe(getVariantName(raw.variant));
  });
});

describe("variant decoding (single home: utils/variant.ts)", () => {
  it("returns bare color when pattern is None (no 'w/ None' suffix)", () => {
    expect(getVariantName(0)).toBe("White");
    expect(getVariantName(2)).toBe("Chestnut");
  });

  it("combines color and pattern otherwise", () => {
    // color 1 (Creamy) + pattern 1 (White Stockings): 1 + 1 * 256
    expect(getVariantName(257)).toBe("Creamy w/ White Stockings");
  });
});
