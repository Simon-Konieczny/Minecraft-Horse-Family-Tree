/**
 * Barrel: records-page insight helpers live in per-card modules under
 * ./herdInsights/. Import from "@/utils/herdInsights" as before — this
 * re-export keeps all existing importers working.
 *
 * Records-page insight engine. All stat inputs are TRANSLATED display
 * units (jump is nonlinear — translate first, exactly like RecordsView
 * does). No dates anywhere: history reads through generations.
 */
export { bubbleWatch } from "./herdInsights/bubble";
export type { BubbleRow, BubbleWatch } from "./herdInsights/bubble";
export { parentReliability } from "./herdInsights/reliability";
export type {
  ParentReliability,
  TranslatedFoal,
} from "./herdInsights/reliability";
export { untriedBloodlineCrosses } from "./herdInsights/crosses";
export type { BloodlineCrossCell } from "./herdInsights/crosses";
export { variantUnlockHints } from "./herdInsights/variants";
export type { VariantUnlockHint } from "./herdInsights/variants";
export {
  VARIANT_COLORS,
  VARIANT_PATTERNS,
  VARIANT_TOTAL,
  variantColorOf,
  variantIdOf,
  variantPatternOf,
} from "./herdInsights/variants";
export { founderLegacy } from "./herdInsights/founders";
export type { FounderLegacy } from "./herdInsights/founders";
export {
  deceasedVsLiving,
  inbreedingSplit,
  pearson,
  purityTrend,
  recordByGeneration,
  statCorrelations,
  varianceByGeneration,
} from "./herdInsights/trends";
export type {
  AliveDeadSplit,
  GenerationRecord,
  InbredSplit,
  PurityPoint,
  StatCorrelations,
  VariancePoint,
} from "./herdInsights/trends";
