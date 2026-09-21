/**
 * Barrel: analytics helpers live in domain modules under ./analytics/.
 * Import from "@/utils/analytics" as before — this re-export keeps all
 * existing importers working.
 */
export {
  filterHorsesByScope,
  generationCounts,
  statusBreakdown,
} from "./analytics/census";
export type {
  GenerationCount,
  GenerationScope,
  StatusBreakdown,
} from "./analytics/census";
export {
  avgByGeneration,
  histogramBins,
  niceHistogram,
  statSummary,
} from "./analytics/descriptive";
export type {
  GenerationAverage,
  HistogramBin,
  NiceBin,
  StatSummary,
} from "./analytics/descriptive";
export {
  bloodlineDiversity,
  bloodlineShares,
  dominantBloodline,
  purityRanking,
  sharesByGeneration,
  variantBloodlineCrosstab,
  variantBloodlineShares,
  variantDistribution,
} from "./analytics/genetics";
export type {
  BloodlineShare,
  CrosstabCell,
  DiversityIndex,
  GenerationShare,
  PurityRank,
  VariantBloodlineShare,
  VariantCount,
} from "./analytics/genetics";
export {
  ancestryOverlap,
  BREEDING_RANGES,
  expectedFoalRange,
  heritabilityPoints,
  inbreedingCoefficient,
  inbreedingRanking,
  linearRegression,
  longestLineage,
  pairOutcomes,
  pairOutcomesVsParents,
  planSequentialPairings,
  prolificParents,
} from "./analytics/breeding";
export type {
  AncestryOverlap,
  FoalRange,
  HeritabilityPoint,
  InbreedingRank,
  PairComparison,
  PairOutcome,
  PlannedPair,
  PlanPairingsOptions,
  ProlificParent,
  Regression,
  SequentialPlan,
} from "./analytics/breeding";
