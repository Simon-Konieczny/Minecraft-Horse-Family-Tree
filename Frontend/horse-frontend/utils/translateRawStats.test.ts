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

describe("speed anchors (raw * 43.17)", () => {
  it("maps max raw 0.3375 to the canonical 14.57 m/s", () => {
    expect(translateStat("speed", 0.3375)).toBeCloseTo(14.5699, 3);
  });

  it("maps player walk baseline 0.1 to 4.317 m/s", () => {
    expect(translateStat("speed", 0.1)).toBeCloseTo(4.317, 3);
  });
});

describe("jump quadratic anchors (documented raw -> blocks)", () => {
  it.each([
    { raw: 0.4, blocks: 1.153 },
    { raw: 0.7, blocks: 3.124 },
    { raw: 1.0, blocks: 5.9197 },
  ])("raw $raw clears $blocks blocks", ({ raw, blocks }) => {
    expect(translateStat("jump", raw)).toBeCloseTo(blocks, 3);
  });

  it("matches in-game observations within 0.01", () => {
    // Booty Longbottom: raw 0.7634 observed clearing 3.64.
    expect(translateStat("jump", 0.763396966457367)).toBeCloseTo(3.64, 1);
    // Zephyr Longbottom: raw 0.7740 observed clearing 3.74.
    expect(translateStat("jump", 0.7739879906177521)).toBeCloseTo(3.74, 1);
  });

  it("inverts exactly across the attribute range", () => {
    for (const raw of [0.4, 0.5597532197833062, 0.7050766080617905, 0.9, 1.0]) {
      expect(untranslateStat("jump", translateStat("jump", raw))).toBeCloseTo(
        raw,
        3,
      );
    }
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
