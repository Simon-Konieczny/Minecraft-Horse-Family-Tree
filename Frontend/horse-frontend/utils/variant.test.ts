import { describe, expect, it } from "vitest";
import { ALL_VARIANTS, VARIANT_COLOR_COUNT, VARIANT_PATTERN_COUNT } from "./variant";

describe("ALL_VARIANTS canonical order", () => {
  it("covers all 35 combos exactly once", () => {
    expect(VARIANT_COLOR_COUNT * VARIANT_PATTERN_COUNT).toBe(35);
    expect(ALL_VARIANTS).toHaveLength(35);
    expect(new Set(ALL_VARIANTS).size).toBe(35);
  });

  it("is color-major like the create/edit picker (White + patterns first)", () => {
    // White (color 0) with patterns 0..4, then Creamy (color 1) starts.
    expect(ALL_VARIANTS.slice(0, 6)).toEqual([0, 256, 512, 768, 1024, 1]);
  });

  it("expands observed counts to a full census with zeros preserved in order", () => {
    const observed = [
      { variant: 1, count: 2 },
      { variant: 0, count: 3 },
    ];
    const byVariant = new Map(observed.map((v) => [v.variant, v.count]));
    const full = ALL_VARIANTS.map((variant) => ({
      variant,
      count: byVariant.get(variant) ?? 0,
    }));
    expect(full).toHaveLength(35);
    expect(full.map((f) => f.variant)).toEqual(ALL_VARIANTS);
    expect(full.find((f) => f.variant === 0)?.count).toBe(3);
    expect(full.find((f) => f.variant === 1)?.count).toBe(2);
    expect(full.find((f) => f.variant === 2)?.count).toBe(0);
  });
});
