export interface ProlificParent {
  id: string;
  offspring: number;
}

export interface PairOutcome {
  parentId1: string;
  parentId2: string;
  children: number;
  avgSpeed: number;
  avgJump: number;
  avgHealth: number;
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

export interface HeritabilityPoint {
  /** Mid-parent stat. */
  x: number;
  /** Foal stat. */
  y: number;
}

export interface Regression {
  slope: number;
  intercept: number;
  /** Coefficient of determination (0 when degenerate). */
  r2: number;
  n: number;
  /**
   * Standard error of the slope (family-clustered data violates iid, so
   * treat as descriptive, not inferential). Null when n < 3.
   */
  seSlope: number | null;
  /** Normal-approx 95% CI for the slope. Null when n < 3. */
  slopeCI: [number, number] | null;
}

export interface InbreedingRank {
  id: string;
  /** Shared ancestors between the parents (each parent itself included). */
  shared: number;
  total: number;
  /**
   * Wright's inbreeding coefficient F (path-counting approximation,
   * ancestor inbreeding ignored): probability two alleles are identical
   * by descent. Parent×offspring mating = 0.25, full-sib mating = 0.25.
   */
  f: number;
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

export interface FoalRange {
  /** Parent midpoint — the roll's expected value (clamped to [min, max]). */
  midpoint: number;
  /** Full spread before clamping. */
  spread: number;
  /** Possible bounds clamped into [min, max] (cap itself is the bound). */
  lo: number;
  hi: number;
}

export interface AncestryOverlap {
  shared: number;
  total: number;
  /** Shared / union, 0 when neither horse has ancestors. */
  pct: number;
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

/**
 * Ordinary least-squares fit of y on x.
 *
 * Descriptive only here: herd data violates the classic assumptions
 * (selected parents, sibs sharing x, no CIs on the input), so `slope`
 * is a "breeds-true" summary, NOT a narrow-sense heritability estimate.
 * seSlope/slopeCI are normal approximations for display, null when n<3.
 */
export function linearRegression(points: HeritabilityPoint[]): Regression {
  const n = points.length;
  if (n === 0) return { slope: 0, intercept: 0, r2: 0, n: 0, seSlope: null, slopeCI: null };
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
  if (!(ssxx > 0)) return { slope: 0, intercept: meanY, r2: 0, n, seSlope: null, slopeCI: null };
  const slope = ssxy / ssxx;
  const intercept = meanY - slope * meanX;
  const r2 = ssxx > 0 && ssty > 0 ? (ssxy * ssxy) / (ssxx * ssty) : 0;
  if (n < 3) return { slope, intercept, r2, n, seSlope: null, slopeCI: null };
  const sse = Math.max(0, ssty - slope * ssxy);
  const seSlope = Math.sqrt(sse / (n - 2) / ssxx);
  return { slope, intercept, r2, n, seSlope, slopeCI: [slope - 1.96 * seSlope, slope + 1.96 * seSlope] };
}

/**
 * Wright's inbreeding coefficient for one horse via its parents' common
 * ancestors: F = Σ (1/2)^(d1+d2+1) over common ancestors, where d1/d2
 * are BFS generational distances from each parent. Self-inclusion is
 * deliberate: when one parent descends from the other, that parent is a
 * common ancestor (parent×offspring → F = 0.25, as theory predicts).
 * Ancestor inbreeding itself is ignored (documented approximation);
 * maxDepth truncates deep loops. Horses with unknown parents score 0.
 */
export function inbreedingCoefficient<
  T extends { id: string; parentId1?: string | null; parentId2?: string | null },
>(horses: T[], id: string, maxDepth = 5): number {
  const byId = new Map(horses.map((h) => [h.id, h]));
  const self = byId.get(id);
  if (!self?.parentId1 || !self?.parentId2) return 0;
  const depths = (start: string): Map<string, number> => {
    const dist = new Map<string, number>([[start, 0]]);
    let frontier = [start];
    for (let depth = 0; depth < maxDepth && frontier.length > 0; depth++) {
      const next: string[] = [];
      for (const current of frontier) {
        const horse = byId.get(current);
        if (!horse) continue;
        for (const p of [horse.parentId1, horse.parentId2]) {
          if (p && !dist.has(p)) {
            dist.set(p, depth + 1);
            next.push(p);
          }
        }
      }
      frontier = next;
    }
    return dist;
  };
  const d1 = depths(self.parentId1);
  const d2 = depths(self.parentId2);
  let f = 0;
  for (const [ancestor, n1] of d1) {
    const n2 = d2.get(ancestor);
    if (n2 !== undefined) f += (1 / 2) ** (n1 + n2 + 1);
  }
  return f;
}

/**
 * Foals ranked by parental shared ancestry, most inbred first.
 * Only horses with both parents recorded are included. `shared` is a
 * count (self-included, catches direct descent); `f` is the
 * path-counted coefficient — prefer `f` for severity, `shared` for
 * triage.
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
    ranks.push({ id: h.id, shared, total: new Set([...setA, ...setB]).size, f: inbreedingCoefficient(horses, h.id) });
  }
  return ranks.sort((a, b) => b.shared - a.shared || b.f - a.f || a.total - b.total);
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

/**
 * Possible foal outcomes for one stat from the vanilla breeding formula:
 * midpoint = (x+y)/2, spread = |x-y| + 0.3*(max-min), roll in
 * midpoint ± spread/2. Feed RAW attributes — the game rolls raw. Bounds are
 * indicative: real rolls cluster at the midpoint (3 averaged randoms).
 *
 * Displayed bounds are CLAMPED (not the game's single mirror-reflection):
 * when the raw interval straddles a cap, the cap itself is the bound (a
 * roll landing exactly on it stays). Reflecting the endpoints instead
 * understates fast parents — e.g. identical 14.19 m/s parents would
 * display a max BELOW themselves while slower pairs display higher
 * maxima. The cap is probability-0 as an exact hit, but it is the only
 * honest upper bound to show.
 */
export function expectedFoalRange(
  x: number,
  y: number,
  min: number,
  max: number,
): FoalRange {
  const rawMidpoint = (x + y) / 2;
  const spread = Math.abs(x - y) + (max - min) * 0.3;
  const rawLo = rawMidpoint - spread / 2;
  const rawHi = rawMidpoint + spread / 2;
  // Clamp everything into [min, max] so hand-edited out-of-range parents
  // can't leak a prediction outside the legal interval; ordering guard
  // covers degenerate min > max configs.
  const midpoint = Math.min(Math.max(rawMidpoint, min), max);
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
 *
 * Deliberately EXCLUDES the candidates themselves (unlike
 * inbreedingRanking, which includes parents to catch direct descent):
 * this is a Jaccard index over shared *background*, so a parent-child
 * pair scores on common ancestors, not on the parent itself. The two
 * conventions differ on purpose — do not "unify" them.
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
