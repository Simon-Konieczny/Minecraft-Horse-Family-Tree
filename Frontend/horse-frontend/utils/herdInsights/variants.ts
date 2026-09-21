import {
  VARIANT_COLOR_COUNT as VARIANT_COLORS,
  VARIANT_PATTERN_COUNT as VARIANT_PATTERNS,
  variantColorOf,
  variantIdOf,
  variantPatternOf,
} from "../variant";

// Single-source variant math lives in ../variant; re-exported here so
// existing importers keep working.
export {
  VARIANT_COLORS,
  VARIANT_PATTERNS,
  variantColorOf,
  variantIdOf,
  variantPatternOf,
};
export { VARIANT_TOTAL } from "../variant";

export interface VariantUnlockHint {
  missingVariant: number;
  /** Example active parent-variant pairs able to produce it (max 3). */
  examplePairs: [number, number][];
}

/**
 * Coat-completion guide: missing variants of the 35, each with example
 * active parent-variant pairs that can produce it. Assumes Minecraft
 * inheritance (foal takes each parent's color/pattern independently —
 * color from one parent, pattern from either), so a missing combo
 * needs its color present in one parent and its pattern in either.
 */
export function variantUnlockHints(
  observed: number[],
  activeVariants: number[],
): VariantUnlockHint[] {
  const seen = new Set(observed);
  const byColor = new Map<number, number[]>();
  const byPattern = new Map<number, number[]>();
  for (const v of activeVariants) {
    const c = variantColorOf(v);
    const p = variantPatternOf(v);
    if (!byColor.has(c)) byColor.set(c, []);
    byColor.get(c)?.push(v);
    if (!byPattern.has(p)) byPattern.set(p, []);
    byPattern.get(p)?.push(v);
  }
  const hints: VariantUnlockHint[] = [];
  for (let c = 0; c < VARIANT_COLORS; c++) {
    for (let p = 0; p < VARIANT_PATTERNS; p++) {
      const missing = variantIdOf(c, p);
      if (seen.has(missing)) continue;
      const colorHolders = byColor.get(c) ?? [];
      const patternHolders = byPattern.get(p) ?? [];
      const pairs: [number, number][] = [];
      for (const a of colorHolders) {
        for (const b of patternHolders) {
          if (pairs.length >= 3) break;
          const k = [a, b].sort().join("|");
          if (!pairs.some((q) => [q[0], q[1]].sort().join("|") === k)) {
            pairs.push([a, b]);
          }
        }
        if (pairs.length >= 3) break;
      }
      hints.push({ missingVariant: missing, examplePairs: pairs });
    }
  }
  return hints.sort((a, b) => b.examplePairs.length - a.examplePairs.length || a.missingVariant - b.missingVariant);
}
