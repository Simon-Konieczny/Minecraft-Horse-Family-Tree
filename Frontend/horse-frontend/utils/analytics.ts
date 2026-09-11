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
 */
export function expectedFoalRange(
  x: number,
  y: number,
  min: number,
  max: number,
): FoalRange {
  const midpoint = (x + y) / 2;
  const spread = Math.abs(x - y) + (max - min) * 0.3;
  const reflect = (v: number) => {
    if (v > max) return 2 * max - v;
    if (v < min) return 2 * min - v;
    return v;
  };
  const lo = reflect(midpoint - spread / 2);
  const hi = reflect(midpoint + spread / 2);
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
