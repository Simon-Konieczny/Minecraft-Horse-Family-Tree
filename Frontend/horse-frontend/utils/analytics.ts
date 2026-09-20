export interface StatusBreakdown {
  Alive: number;
  Deceased: number;
  Retired: number;
}

export interface StatSummary {
  avg: number;
  min: number;
  max: number;
  count: number;
}

export interface GenerationCount {
  generation: number;
  count: number;
}

export interface HistogramBin {
  start: number;
  end: number;
  label: string;
  count: number;
}

export interface BloodlineShare {
  bloodline: string;
  /** Summed DNA weight across the herd. */
  total: number;
}

export interface GenerationShare {
  generation: number;
  /** Average DNA weight per bloodline within the generation. */
  shares: Record<string, number>;
}

/** Horses per status; unknown statuses count as Alive (display convention). */
export function statusBreakdown(
  horses: { status?: string }[],
): StatusBreakdown {
  const result: StatusBreakdown = { Alive: 0, Deceased: 0, Retired: 0 };
  for (const h of horses) {
    if (h.status === "Deceased") result.Deceased++;
    else if (h.status === "Retired") result.Retired++;
    else result.Alive++;
  }
  return result;
}

/** Horses per generation, ascending. */
export function generationCounts(
  horses: { generation?: number }[],
): GenerationCount[] {
  const counts = new Map<number, number>();
  for (const h of horses) {
    const gen = h.generation || 0;
    counts.set(gen, (counts.get(gen) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([generation, count]) => ({ generation, count }))
    .sort((a, b) => a.generation - b.generation);
}

export interface GenerationScope {
  /** Inclusive lower bound; horses with generation >= from are kept. */
  from: number;
  /** Inclusive upper bound; horses with generation <= to are kept. */
  to: number;
  /** Status filter; "All" keeps every status. */
  status?: string;
}

/**
 * Narrows a herd to a generation range (inclusive on both ends) plus an
 * optional status. Missing generations count as 0 (same convention as
 * generationCounts). Bounds are normalized so `from > to` still matches
 * the range between them — the scope bar clamps, this is the safety net.
 *
 * Cumulative history up to Gen N is just `{ from: <earliest>, to: N }`.
 */
export function filterHorsesByScope<T extends { generation?: number; status?: string }>(
  horses: T[],
  scope: GenerationScope,
): T[] {
  const lo = Math.min(scope.from, scope.to);
  const hi = Math.max(scope.from, scope.to);
  const status = scope.status ?? "All";
  return horses.filter((h) => {
    const gen = h.generation || 0;
    if (gen < lo || gen > hi) return false;
    if (status !== "All" && h.status !== status) return false;
    return true;
  });
}

/** Avg/min/max of a numeric field (empty input -> zeros). */
export function statSummary(
  horses: Record<string, unknown>[],
  field: string,
): StatSummary {
  const values = horses
    .map((h) => h[field])
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (values.length === 0) return { avg: 0, min: 0, max: 0, count: 0 };
  const sum = values.reduce((t, v) => t + v, 0);
  return {
    avg: sum / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
    count: values.length,
  };
}

/** Fixed-width histogram bins over [min, max]; values outside clamp inward. */
export function histogramBins(  values: number[],
  binCount: number,
  min: number,
  max: number,
): HistogramBin[] {
  const safeBins = Math.max(1, Math.floor(binCount));
  const span = max - min;
  const width = span > 0 ? span / safeBins : 1;
  const bins: HistogramBin[] = Array.from({ length: safeBins }, (_, i) => {
    const start = min + i * width;
    return { start, end: start + width, label: start.toFixed(2), count: 0 };
  });
  for (const v of values) {
    if (!Number.isFinite(v)) continue;
    const idx = Math.min(
      safeBins - 1,
      Math.max(0, Math.floor((v - min) / width)),
    );
    bins[idx].count++;
  }
  return bins;
}

/** Summed DNA weight per bloodline across the herd, descending. */
export function bloodlineShares(
  horses: { dna?: Record<string, unknown> }[],
): BloodlineShare[] {
  const totals = new Map<string, number>();
  for (const h of horses) {
    for (const [bloodline, weight] of Object.entries(h.dna || {})) {
      if (typeof weight !== "number" || !Number.isFinite(weight) || weight <= 0) continue;
      totals.set(bloodline, (totals.get(bloodline) || 0) + weight);
    }
  }
  return [...totals.entries()]
    .map(([bloodline, total]) => ({ bloodline, total }))
    .sort((a, b) => b.total - a.total);
}

export interface PurityRank<T> {
  horse: T;
  bloodline: string;
  share: number;
}

/** Horses ranked by dominant-bloodline share, descending. */
export function purityRanking<T extends { dna?: Record<string, unknown> }>(
  horses: T[],
): PurityRank<T>[] {
  return horses
    .map((horse) => {
      let bloodline = "";
      let share = 0;
      for (const [name, weight] of Object.entries(horse.dna || {})) {
        if (typeof weight !== "number" || !Number.isFinite(weight)) continue;
        if (weight > share) {
          share = weight;
          bloodline = name;
        }
      }
      return { horse, bloodline, share };
    })
    .filter((r) => r.share > 0)
    .sort((a, b) => b.share - a.share);
}

/**
 * Average DNA weight per bloodline within each generation (ascending).
 * Averages (not sums) keep generations comparable across herd sizes.
 */
export function sharesByGeneration(
  horses: { generation?: number; dna?: Record<string, unknown> }[],
): GenerationShare[] {
  const groups = new Map<number, { sums: Map<string, number>; count: number }>();
  for (const h of horses) {
    const gen = h.generation || 0;
    let group = groups.get(gen);
    if (!group) {
      group = { sums: new Map(), count: 0 };
      groups.set(gen, group);
    }
    group.count++;
    for (const [bloodline, weight] of Object.entries(h.dna || {})) {
      if (typeof weight !== "number" || !Number.isFinite(weight) || weight <= 0) continue;
      group.sums.set(bloodline, (group.sums.get(bloodline) || 0) + weight);
    }
  }
  return [...groups.entries()]
    .map(([generation, group]) => {
      const shares: Record<string, number> = {};
      for (const [bloodline, total] of group.sums) {
        shares[bloodline] = total / group.count;
      }
      return { generation, shares };
    })
    .sort((a, b) => a.generation - b.generation);
}

export interface GenerationAverage {
  generation: number;
  avg: number;
  count: number;
}

/** Average of a numeric field per generation, ascending. */
export function avgByGeneration<T extends { generation?: number }>(
  horses: T[],
  field: keyof T & string,
): GenerationAverage[] {
  const groups = new Map<number, { sum: number; count: number }>();
  for (const h of horses) {
    const v: unknown = h[field];
    if (typeof v !== "number" || !Number.isFinite(v)) continue;
    const gen = typeof h.generation === "number" ? h.generation : 0;
    const group = groups.get(gen) || { sum: 0, count: 0 };
    group.sum += v;
    group.count++;
    groups.set(gen, group);
  }
  return [...groups.entries()]
    .map(([generation, group]) => ({
      generation,
      avg: group.sum / group.count,
      count: group.count,
    }))
    .sort((a, b) => a.generation - b.generation);
}

/** Dominant bloodline name ("" when none). */
export function dominantBloodline(dna: Record<string, unknown> | undefined): string {
  let best = "";
  let bestWeight = 0;
  for (const [name, weight] of Object.entries(dna || {})) {
    if (typeof weight !== "number" || !Number.isFinite(weight)) continue;
    if (weight > bestWeight) {
      bestWeight = weight;
      best = name;
    }
  }
  return best;
}

export interface VariantCount {
  variant: number;
  count: number;
}

/** Horse counts per variant value, ascending by variant. */
export function variantDistribution(
  horses: { variant?: unknown }[],
): VariantCount[] {
  const counts = new Map<number, number>();
  for (const h of horses) {
    if (typeof h.variant !== "number" || !Number.isFinite(h.variant)) continue;
    counts.set(h.variant, (counts.get(h.variant) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([variant, count]) => ({ variant, count }))
    .sort((a, b) => a.variant - b.variant);
}

export interface CrosstabCell {
  variant: number;
  bloodline: string;
  count: number;
}

/**
 * Counts per (variant, dominant bloodline) pair — the variant ×
 * bloodline cross-tab. Only pairs that occur are returned.
 */
export function variantBloodlineCrosstab(
  horses: { variant?: unknown; dna?: Record<string, unknown> }[],
): CrosstabCell[] {
  const counts = new Map<string, number>();
  for (const h of horses) {
    if (typeof h.variant !== "number" || !Number.isFinite(h.variant)) continue;
    const bloodline = dominantBloodline(h.dna) || "Unknown";
    const key = `${h.variant}|||${bloodline}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => {
      const [variant, bloodline] = key.split("|||");
      return { variant: Number(variant), bloodline, count };
    })
    .sort((a, b) => a.variant - b.variant || a.bloodline.localeCompare(b.bloodline));
}

export interface ProlificParent {
  id: string;
  offspring: number;
}

/** Parents ranked by number of offspring, descending. */
export function prolificParents<T extends { parentId1?: string | null; parentId2?: string | null }>(
  horses: T[],
): ProlificParent[] {
  const counts = new Map<string, number>();
  for (const h of horses) {
    for (const p of [h.parentId1, h.parentId2]) {
      if (p) counts.set(p, (counts.get(p) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([id, offspring]) => ({ id, offspring }))
    .sort((a, b) => b.offspring - a.offspring);
}

export interface PairOutcome {
  parentId1: string;
  parentId2: string;
  children: number;
  avgSpeed: number;
  avgJump: number;
  avgHealth: number;
}

/**
 * Groups foals by parent pair (order-insensitive), with the foals'
 * average raw stats. Sorted by foal count, then avg speed.
 */
export function pairOutcomes<
  T extends {
    parentId1?: string | null;
    parentId2?: string | null;
    speed?: unknown;
    jump?: unknown;
    health?: unknown;
  },
>(horses: T[]): PairOutcome[] {
  const groups = new Map<string, { p1: string; p2: string; foals: number; speeds: number[]; jumps: number[]; healths: number[] }>();
  for (const h of horses) {
    if (!h.parentId1 || !h.parentId2) continue;
    const [p1, p2] = [h.parentId1, h.parentId2].sort();
    const key = `${p1}|||${p2}`;
    let group = groups.get(key);
    if (!group) {
      group = { p1, p2, foals: 0, speeds: [], jumps: [], healths: [] };
      groups.set(key, group);
    }
    group.foals++;
    if (typeof h.speed === "number" && Number.isFinite(h.speed)) group.speeds.push(h.speed);
    if (typeof h.jump === "number" && Number.isFinite(h.jump)) group.jumps.push(h.jump);
    if (typeof h.health === "number" && Number.isFinite(h.health)) group.healths.push(h.health);
  }
  const avg = (xs: number[]) => (xs.length > 0 ? xs.reduce((t, v) => t + v, 0) / xs.length : 0);
  return [...groups.values()]
    .map((g) => ({
      parentId1: g.p1,
      parentId2: g.p2,
      children: g.foals,
      avgSpeed: avg(g.speeds),
      avgJump: avg(g.jumps),
      avgHealth: avg(g.healths),
    }))
    .sort((a, b) => b.children - a.children || b.avgSpeed - a.avgSpeed);
}

export interface PairComparison {
  parentId1: string;
  parentId2: string;
  children: number;
  /** How many of the two parents were found in the herd (0-2). */
  parentsFound: number;
  foalAvgSpeed: number;
  foalAvgJump: number;
  foalAvgHealth: number;
  parentAvgSpeed: number;
  parentAvgJump: number;
  parentAvgHealth: number;
}

/**
 * Foal averages per parent pair alongside the parents' own average —
 * answers "are pairings improving stats?". Feed it translated stats
 * (not raw) so the nonlinear jump curve is averaged correctly.
 * Sorted by foal count, then foal avg speed.
 */
export function pairOutcomesVsParents<
  T extends {
    id: string;
    parentId1?: string | null;
    parentId2?: string | null;
    speed?: unknown;
    jump?: unknown;
    health?: unknown;
  },
>(horses: T[]): PairComparison[] {
  const byId = new Map(horses.map((h) => [h.id, h]));
  const groups = new Map<string, { p1: string; p2: string; foals: number; speeds: number[]; jumps: number[]; healths: number[] }>();
  for (const h of horses) {
    if (!h.parentId1 || !h.parentId2) continue;
    const [p1, p2] = [h.parentId1, h.parentId2].sort();
    const key = `${p1}|||${p2}`;
    let group = groups.get(key);
    if (!group) {
      group = { p1, p2, foals: 0, speeds: [], jumps: [], healths: [] };
      groups.set(key, group);
    }
    group.foals++;
    if (typeof h.speed === "number" && Number.isFinite(h.speed)) group.speeds.push(h.speed);
    if (typeof h.jump === "number" && Number.isFinite(h.jump)) group.jumps.push(h.jump);
    if (typeof h.health === "number" && Number.isFinite(h.health)) group.healths.push(h.health);
  }
  const avg = (xs: number[]) => (xs.length > 0 ? xs.reduce((t, v) => t + v, 0) / xs.length : 0);
  const parentStat = (id: string, field: "speed" | "jump" | "health"): number | null => {
    const p = byId.get(id);
    const v = p?.[field];
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  };
  return [...groups.values()]
    .map((g) => {
      const parentSpeeds = [parentStat(g.p1, "speed"), parentStat(g.p2, "speed")].filter(
        (v): v is number => v !== null,
      );
      const parentJumps = [parentStat(g.p1, "jump"), parentStat(g.p2, "jump")].filter(
        (v): v is number => v !== null,
      );
      const parentHealths = [parentStat(g.p1, "health"), parentStat(g.p2, "health")].filter(
        (v): v is number => v !== null,
      );
      const parentsFound = [byId.has(g.p1), byId.has(g.p2)].filter(Boolean).length;
      return {
        parentId1: g.p1,
        parentId2: g.p2,
        children: g.foals,
        parentsFound,
        foalAvgSpeed: avg(g.speeds),
        foalAvgJump: avg(g.jumps),
        foalAvgHealth: avg(g.healths),
        parentAvgSpeed: avg(parentSpeeds),
        parentAvgJump: avg(parentJumps),
        parentAvgHealth: avg(parentHealths),
      };
    })
    .sort((a, b) => b.children - a.children || b.foalAvgSpeed - a.foalAvgSpeed);
}

export interface HeritabilityPoint {
  /** Mid-parent stat. */
  x: number;
  /** Foal stat. */
  y: number;
}

/**
 * Foal-vs-mid-parent points for one stat (feed translated stats so the
 * nonlinear jump curve is compared correctly). Only foals with both
 * parents found in the herd are included.
 */
export function heritabilityPoints<
  T extends {
    id: string;
    parentId1?: string | null;
    parentId2?: string | null;
  },
>(horses: T[], field: keyof T & string): HeritabilityPoint[] {
  const byId = new Map(horses.map((h) => [h.id, h]));
  const points: HeritabilityPoint[] = [];
  for (const h of horses) {
    if (!h.parentId1 || !h.parentId2) continue;
    const p1 = byId.get(h.parentId1)?.[field];
    const p2 = byId.get(h.parentId2)?.[field];
    const y: unknown = h[field];
    if (
      typeof p1 !== "number" || !Number.isFinite(p1) ||
      typeof p2 !== "number" || !Number.isFinite(p2) ||
      typeof y !== "number" || !Number.isFinite(y)
    ) {
      continue;
    }
    points.push({ x: (p1 + p2) / 2, y });
  }
  return points;
}

export interface Regression {
  slope: number;
  intercept: number;
  /** Coefficient of determination (0 when degenerate). */
  r2: number;
  n: number;
}

/** Ordinary least-squares fit of y on x (empty/degenerate -> zeros). */
export function linearRegression(points: HeritabilityPoint[]): Regression {
  const n = points.length;
  if (n === 0) return { slope: 0, intercept: 0, r2: 0, n: 0 };
  const meanX = points.reduce((t, p) => t + p.x, 0) / n;
  const meanY = points.reduce((t, p) => t + p.y, 0) / n;
  let ssxx = 0;
  let ssxy = 0;
  let ssty = 0;
  for (const p of points) {
    ssxx += (p.x - meanX) ** 2;
    ssxy += (p.x - meanX) * (p.y - meanY);
    ssty += (p.y - meanY) ** 2;
  }
  if (!(ssxx > 0)) return { slope: 0, intercept: meanY, r2: 0, n };
  const slope = ssxy / ssxx;
  const intercept = meanY - slope * meanX;
  const r2 = ssxx > 0 && ssty > 0 ? (ssxy * ssxy) / (ssxx * ssty) : 0;
  return { slope, intercept, r2, n };
}

export interface InbreedingRank {
  id: string;
  /** Shared ancestors between the parents (each parent itself included). */
  shared: number;
  total: number;
}

/**
 * Foals ranked by parental shared ancestry, most inbred first.
 * Only horses with both parents recorded are included.
 */
export function inbreedingRanking<
  T extends { id: string; parentId1?: string | null; parentId2?: string | null },
>(horses: T[], maxDepth = 3): InbreedingRank[] {
  const byId = new Map(horses.map((h) => [h.id, h]));
  const ranks: InbreedingRank[] = [];
  for (const h of horses) {
    if (!h.parentId1 || !h.parentId2) continue;
    if (!byId.has(h.parentId1) || !byId.has(h.parentId2)) continue;
    const setA = ancestorIdsPlusSelf(byId, h.parentId1, maxDepth);
    const setB = ancestorIdsPlusSelf(byId, h.parentId2, maxDepth);
    let shared = 0;
    for (const id of setA) {
      if (setB.has(id)) shared++;
    }
    ranks.push({ id: h.id, shared, total: new Set([...setA, ...setB]).size });
  }
  return ranks.sort((a, b) => b.shared - a.shared || a.total - b.total);
}

export interface DiversityIndex {
  /** Shannon entropy (nats) of the bloodline distribution. */
  shannon: number;
  /** Effective number of bloodlines (exp of Shannon). */
  effective: number;
  /** Largest single-bloodline share 0-1 (bottleneck signal). */
  topShare: number;
}

/**
 * Bloodline diversity from summed DNA shares (see bloodlineShares):
 * effective = 1 means a single-bloodline herd.
 */
export function bloodlineDiversity(
  shares: { total: number }[],
): DiversityIndex {
  const sum = shares.reduce((t, s) => t + s.total, 0);
  if (!(sum > 0)) return { shannon: 0, effective: 0, topShare: 0 };
  let shannon = 0;
  let topShare = 0;
  for (const s of shares) {
    const p = s.total / sum;
    if (p > 0) shannon -= p * Math.log(p);
    if (p > topShare) topShare = p;
  }
  return { shannon, effective: Math.exp(shannon), topShare };
}

export interface PlannedPair {
  sireId: string;
  damId: string;
  /** Predicted foal speed = parent midpoint (same units as input). */
  midSpeed: number;
  /** Shared ancestors within the buffer (each horse itself included). */
  sharedAncestors: number;
  /** True when the close-relative policy would reject this pair. */
  blocked: boolean;
}

export interface PlanPairingsOptions {
  /** Default true: close-relative pairs are planned, flagged via `blocked`. */
  allowCloseRelativeBreeding?: boolean;
  /** Ancestor buffer depth for the overlap check. Default 3. */
  inbreedingGenerations?: number;
  /** Max pairs returned. Default 50. */
  limit?: number;
}

export interface SequentialPlan {
  /** Exclusive pairs in plan order (fastest midpoint first). */
  pairs: PlannedPair[];
  /** Eligible horse left without a partner (slowest of an odd pool). */
  benched: string | null;
}

function ancestorIdsPlusSelf(
  byId: Map<string, { parentId1?: string | null; parentId2?: string | null }>,
  id: string,
  maxDepth: number,
): Set<string> {
  const found = new Set<string>([id]);
  let frontier = [id];
  for (let depth = 0; depth < maxDepth && frontier.length > 0; depth++) {
    const next: string[] = [];
    for (const current of frontier) {
      const horse = byId.get(current);
      if (!horse) continue;
      for (const p of [horse.parentId1, horse.parentId2]) {
        if (p && !found.has(p)) {
          found.add(p);
          next.push(p);
        }
      }
    }
    frontier = next;
  }
  return found;
}

/**
 * Builds an exclusive breeding plan: candidates are living (Alive-only —
 * Retired sit out) horses with a finite speed, sorted fastest first and
 * paired strictly in order (1st×2nd, 3rd×4th, …). Every horse breeds at
 * most once; the slowest horse of an odd pool is benched. Close-relative
 * pairs are still paired (strict order wins) but flagged via `blocked`
 * so the planner can warn. Deterministic: speed ties break by id.
 */
export function planSequentialPairings<
  T extends {
    id: string;
    speed?: unknown;
    status?: unknown;
    parentId1?: string | null;
    parentId2?: string | null;
  },
>(horses: T[], options: PlanPairingsOptions = {}): SequentialPlan {
  const {
    allowCloseRelativeBreeding = true,
    inbreedingGenerations = 3,
    limit = 50,
  } = options;
  const byId = new Map(horses.map((h) => [h.id, h]));
  const ranked = horses
    .filter(
      (h) =>
        typeof h.speed === "number" &&
        Number.isFinite(h.speed) &&
        h.status !== "Deceased" &&
        h.status !== "Retired",
    )
    .sort(
      (a, b) =>
        (b.speed as number) - (a.speed as number) || a.id.localeCompare(b.id),
    );

  const describe = (
    a: (typeof ranked)[number],
    b: (typeof ranked)[number],
  ): PlannedPair => {
    const [sireId, damId] = [a.id, b.id].sort();
    const midSpeed = (a.speed as number) / 2 + (b.speed as number) / 2;
    // Direct kinship (always flagged in the UI; only blocks per policy).
    const isParentChild =
      a.parentId1 === b.id ||
      a.parentId2 === b.id ||
      b.parentId1 === a.id ||
      b.parentId2 === a.id;
    const pa = [a.parentId1, a.parentId2].filter(Boolean).sort();
    const pb = [b.parentId1, b.parentId2].filter(Boolean).sort();
    const isSiblings =
      pa.length === 2 && pa[0] === pb[0] && pa[1] === pb[1];
    const setA = ancestorIdsPlusSelf(byId, a.id, inbreedingGenerations);
    const setB = ancestorIdsPlusSelf(byId, b.id, inbreedingGenerations);
    let sharedAncestors = 0;
    for (const id of setA) {
      if (setB.has(id)) sharedAncestors++;
    }
    const blocked =
      !allowCloseRelativeBreeding &&
      (isParentChild || isSiblings || sharedAncestors >= 1);
    return { sireId, damId, midSpeed, sharedAncestors, blocked };
  };

  const maxPairs = Math.max(1, Math.floor(limit));
  const pairs: PlannedPair[] = [];
  for (let i = 0; i + 1 < ranked.length && pairs.length < maxPairs; i += 2) {
    pairs.push(describe(ranked[i], ranked[i + 1]));
  }
  const benched = ranked.length % 2 === 1 ? ranked[ranked.length - 1].id : null;
  return { pairs, benched };
}

/** Raw legal attribute ranges for the breeding roll (vanilla). */
export const BREEDING_RANGES = {
  speed: { min: 0.1125, max: 0.3375 },
  jump: { min: 0.4, max: 1.0 },
  health: { min: 15, max: 30 },
} as const;

export interface FoalRange {
  /** Parent midpoint — the roll's expected value. */
  midpoint: number;
  /** Full spread before reflection. */
  spread: number;
  /** Possible bounds after the game's mirror-reflection into [min, max]. */
  lo: number;
  hi: number;
}

/**
 * Possible foal outcomes for one stat from the vanilla breeding formula:
 * midpoint = (x+y)/2, spread = |x-y| + 0.3*(max-min), roll in
 * midpoint ± spread/2, reflected back into [min, max] (2*MAX-base /
 * 2*MIN-base). Feed RAW attributes — the game rolls raw. Bounds are
 * indicative: real rolls cluster at the midpoint (3 averaged randoms).
 *
 * Bounds are the TRUE achievable interval: when the raw interval
 * straddles a cap, the cap itself is the bound (a roll landing exactly
 * on it stays). Reflecting the endpoints instead understates fast
 * parents — e.g. identical 14.19 m/s parents would display a max BELOW
 * themselves while slower pairs display higher maxima.
 */
export function expectedFoalRange(
  x: number,
  y: number,
  min: number,
  max: number,
): FoalRange {
  const midpoint = (x + y) / 2;
  const spread = Math.abs(x - y) + (max - min) * 0.3;
  const rawLo = midpoint - spread / 2;
  const rawHi = midpoint + spread / 2;
  // Clamp both ends into [min, max] so hand-edited out-of-range parents
  // can't leak a bound outside the legal interval; ordering guard covers
  // degenerate min > max configs.
  const lo = Math.min(Math.max(rawLo, min), max);
  const hi = Math.min(Math.max(rawHi, min), max);
  return { midpoint, spread, lo: Math.min(lo, hi), hi: Math.max(lo, hi) };
}

/**
 * Longest unbroken ancestor chain (depth = horses in chain).
 * Cycle-safe via visited set; ties prefer the first found.
 */
export function longestLineage<
  T extends { id: string; parentId1?: string | null; parentId2?: string | null },
>(horses: T[]): { depth: number; chainIds: string[] } {
  const byId = new Map(horses.map((h) => [h.id, h]));
  const memo = new Map<string, string[]>();
  const chainFrom = (id: string, visiting: Set<string>): string[] => {
    const cached = memo.get(id);
    if (cached) return cached;
    if (visiting.has(id)) return [id];
    const horse = byId.get(id);
    if (!horse) return [id];
    visiting.add(id);
    let best: string[] = [];
    for (const p of [horse.parentId1, horse.parentId2]) {
      if (!p) continue;
      const chain = chainFrom(p, visiting);
      if (chain.length > best.length) best = chain;
    }
    visiting.delete(id);
    const result = [id, ...best];
    memo.set(id, result);
    return result;
  };
  let longest: string[] = [];
  for (const h of horses) {
    const chain = chainFrom(h.id, new Set());
    if (chain.length > longest.length) longest = chain;
  }
  return { depth: longest.length, chainIds: longest };
}

export interface AncestryOverlap {
  shared: number;
  total: number;
  /** Shared / union, 0 when neither horse has ancestors. */
  pct: number;
}

function ancestorSet(
  byId: Map<string, { parentId1?: string | null; parentId2?: string | null }>,
  id: string,
  maxDepth: number,
): Set<string> {
  const found = new Set<string>();
  let frontier = [id];
  for (let depth = 0; depth < maxDepth && frontier.length > 0; depth++) {
    const next: string[] = [];
    for (const current of frontier) {
      const horse = byId.get(current);
      if (!horse) continue;
      for (const p of [horse.parentId1, horse.parentId2]) {
        if (p && p !== id && !found.has(p)) {
          found.add(p);
          next.push(p);
        }
      }
    }
    frontier = next;
  }
  return found;
}

/**
 * Shared ancestry between two breeding candidates over N generations
 * (flag, never block — see breeding policy). Cycle-safe.
 */
export function ancestryOverlap<
  T extends { id: string; parentId1?: string | null; parentId2?: string | null },
>(horses: T[], id1: string, id2: string, maxDepth = 3): AncestryOverlap {
  const byId = new Map(horses.map((h) => [h.id, h]));
  const a = ancestorSet(byId, id1, maxDepth);
  const b = ancestorSet(byId, id2, maxDepth);
  let shared = 0;
  for (const id of a) {
    if (b.has(id)) shared++;
  }
  const total = new Set([...a, ...b]).size;
  return { shared, total, pct: total > 0 ? shared / total : 0 };
}

export interface NiceBin {
  start: number;
  end: number;
  count: number;
  label: string;
}

const NICE_STEPS = [1, 2, 2.5, 5, 10];

/**
 * Auto-binned histogram over finite values with "nice" rounded widths
 * (1/2/2.5/5 × 10^n in data units, snapped to the requested decimal
 * places). Domain extends outward to nice bounds so bars never start
 * mid-tick. Targets ~14 bins ("more detail" policy) capped at 16;
 * degenerate (single-value / empty) input yields one bin. Labels are
 * true ranges ("12.40–12.59"), not bare starts.
 */
export function niceHistogram(
  values: number[],
  decimals = 2,
  targetBins = 14,
  maxBins = 16,
): NiceBin[] {
  const finite = values.filter((v) => Number.isFinite(v));
  const fmt = (v: number) => v.toFixed(decimals);
  if (finite.length === 0) return [];
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  if (!(max > min)) {
    const half = Math.pow(10, -decimals) / 2 || 0.5;
    return [
      {
        start: min - half,
        end: max + half,
        count: finite.length,
        label: `${fmt(min - half)}–${fmt(max + half)}`,
      },
    ];
  }
  const span = max - min;
  const raw = span / Math.max(1, targetBins);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const stepNorm = NICE_STEPS.find((s) => s >= norm) ?? 10;
  // Snap the step itself to whole decimal units so widths stay "nice"
  // at the requested precision (e.g. 0.05 not 0.0499).
  const quantum = Math.pow(10, -decimals);
  let width = Math.max(quantum, Math.round((stepNorm * mag) / quantum) * quantum);
  // Guard against float dust producing hundreds of micro-bins.
  while (span / width > maxBins) width = Math.round((width * 2) / quantum) * quantum;
  const lo = Math.floor(min / width) * width;
  const count = Math.max(1, Math.ceil((max - lo) / width));
  const bins: NiceBin[] = Array.from({ length: count }, (_, i) => {
    const start = lo + i * width;
    const end = start + width;
    return { start, end, count: 0, label: `${fmt(start)}–${fmt(end)}` };
  });
  for (const v of finite) {
    const idx = Math.min(count - 1, Math.max(0, Math.floor((v - lo) / width)));
    bins[idx].count++;
  }
  return bins;
}

export interface VariantBloodlineShare {
  variant: number;
  bloodline: string;
  /** Fractional share (DNA-weight split); sums to the horse count. */
  share: number;
  /** Whole horses touching this cell (for tooltips). */
  horses: number;
}

/**
 * Fractional variant × bloodline cross-tab: each horse's DNA weights
 * split its single count across its bloodlines (a 50/50 hybrid adds
 * 0.5 + 0.5), so column totals stay exact and hybrids are never
 * misattributed to one dominant column. Junk DNA weights skipped.
 */
export function variantBloodlineShares(
  horses: { variant?: unknown; dna?: Record<string, unknown> }[],
): VariantBloodlineShare[] {
  const shares = new Map<string, { share: number; horses: Set<number> }>();
  horses.forEach((h, idx) => {
    if (typeof h.variant !== "number" || !Number.isFinite(h.variant)) return;
    const entries = Object.entries(h.dna || {}).filter(
      (entry): entry is [string, number] =>
        typeof entry[1] === "number" && Number.isFinite(entry[1]) && entry[1] > 0,
    );
    const total = entries.reduce((t, [, w]) => t + w, 0);
    const parts: [string, number][] =
      total > 0 ? entries.map(([b, w]) => [b, w / total]) : [["Unknown", 1]];
    for (const [bloodline, frac] of parts) {
      const key = `${h.variant}|||${bloodline}`;
      let cell = shares.get(key);
      if (!cell) {
        cell = { share: 0, horses: new Set() };
        shares.set(key, cell);
      }
      cell.share += frac;
      cell.horses.add(idx);
    }
  });
  return [...shares.entries()]
    .map(([key, cell]) => {
      const [variant, bloodline] = key.split("|||");
      return {
        variant: Number(variant),
        bloodline,
        share: Math.round(cell.share * 10) / 10,
        horses: cell.horses.size,
      };
    })
    .sort((a, b) => a.variant - b.variant || a.bloodline.localeCompare(b.bloodline));
}
