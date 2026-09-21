import { dominantBloodline } from "./analytics";

/**
 * Records-page insight engine. All stat inputs are TRANSLATED display
 * units (jump is nonlinear — translate first, exactly like RecordsView
 * does). No dates anywhere: history reads through generations.
 */

export interface BubbleRow {
  id: string;
  /** 1-based rank within the living candidates for this stat. */
  rank: number;
  /** Signed distance to the cut in translated units (+ = safely inside). */
  delta: number;
  inside: boolean;
}

export interface BubbleWatch {
  speed: BubbleRow[];
  jump: BubbleRow[];
  health: BubbleRow[];
}

function bubbleForField(
  rankedIds: string[],
  valueOf: (id: string) => number | null,
  cutValue: number | null,
  cutCount: number,
  radius: number,
): BubbleRow[] {
  if (cutValue === null || rankedIds.length === 0) return [];
  const lo = Math.max(0, cutCount - 1 - radius);
  const hi = Math.min(rankedIds.length - 1, cutCount - 1 + radius);
  const rows: BubbleRow[] = [];
  for (let i = lo; i <= hi; i++) {
    const id = rankedIds[i];
    const v = valueOf(id);
    if (v === null) continue;
    rows.push({
      id,
      rank: i + 1,
      delta: v - cutValue,
      inside: i < cutCount,
    });
  }
  return rows;
}

/**
 * Horses clustered around each active-herd cut (translated cut values).
 * Speed window ±5 ranks, jump/health ±2 — one good or bad foal moves
 * these horses across the line.
 */
export function bubbleWatch(
  ranked: { speed: string[]; jump: string[]; health: string[] },
  valueOf: (id: string) => { speed: number | null; jump: number | null; health: number | null },
  cuts: { speed: number | null; jump: number | null; health: number | null },
  activeCounts: { speed: number; jump: number; health: number },
): BubbleWatch {
  return {
    speed: bubbleForField(ranked.speed, (id) => valueOf(id).speed, cuts.speed, activeCounts.speed, 5),
    jump: bubbleForField(ranked.jump, (id) => valueOf(id).jump, cuts.jump, activeCounts.jump, 2),
    health: bubbleForField(ranked.health, (id) => valueOf(id).health, cuts.health, activeCounts.health, 2),
  };
}

export interface ParentReliability {
  parentId: string;
  foals: number;
  foalAvg: { speed: number; jump: number; health: number };
  /** Parent's own stats (null when the parent is unknown to the herd). */
  own: { speed: number | null; jump: number | null; health: number | null };
  /** Foal-avg minus own-stat (null when own is unknown). */
  delta: { speed: number | null; jump: number | null; health: number | null };
  bestFoalId: string;
  worstFoalId: string;
}

export interface TranslatedFoal {
  id: string;
  parentId1?: string | null;
  parentId2?: string | null;
  speed: number;
  jump: number;
  health: number;
}

/**
 * Per-parent production record: how many foals, how their average
 * compares to the parent's own stats, and the best/worst foal by
 * speed. Distinguishes a fast horse from a fast producer.
 */
export function parentReliability(
  foals: TranslatedFoal[],
  ownOf: (id: string) => { speed: number | null; jump: number | null; health: number | null },
): ParentReliability[] {
  const groups = new Map<string, TranslatedFoal[]>();
  for (const f of foals) {
    for (const p of [f.parentId1, f.parentId2]) {
      if (!p) continue;
      const list = groups.get(p);
      if (list) list.push(f);
      else groups.set(p, [f]);
    }
  }
  const out: ParentReliability[] = [];
  for (const [parentId, list] of groups) {
    const n = list.length;
    const avg = (xs: number[]) => xs.reduce((t, v) => t + v, 0) / n;
    const foalAvg = {
      speed: avg(list.map((f) => f.speed)),
      jump: avg(list.map((f) => f.jump)),
      health: avg(list.map((f) => f.health)),
    };
    const own = ownOf(parentId);
    const sub = (a: number, b: number | null) => (b === null ? null : a - b);
    const best = list.reduce((a, b) => (b.speed > a.speed ? b : a), list[0]);
    const worst = list.reduce((a, b) => (b.speed < a.speed ? b : a), list[0]);
    out.push({
      parentId,
      foals: n,
      foalAvg,
      own,
      delta: {
        speed: sub(foalAvg.speed, own.speed),
        jump: sub(foalAvg.jump, own.jump),
        health: sub(foalAvg.health, own.health),
      },
      bestFoalId: best.id,
      worstFoalId: worst.id,
    });
  }
  return out.sort((a, b) => b.foals - a.foals || a.parentId.localeCompare(b.parentId));
}

export interface BloodlineCrossCell {
  b1: string;
  b2: string;
  /** Recorded foals from this bloodline pairing (0 = untried). */
  triedFoals: number;
  /** Active-herd pairs currently spanning this cross. */
  activePairs: number;
  /** Best active-pair speed midpoint (translated), null when none. */
  bestMid: number | null;
}

/**
 * Dominant-bloodline × dominant-bloodline cross matrix over the ACTIVE
 * herd. Tried cells come from recorded parent pairs (mapped through
 * dominant bloodline); untried cells with active pairs are breeding
 * opportunities. Self-crosses (A×A) included — line-breeding counts.
 */
export function untriedBloodlineCrosses(
  active: { id: string; dna?: Record<string, unknown>; speed: number }[],
  recordedPairs: { parentId1: string; parentId2: string; children: number }[],
  bloodlineOf: (id: string) => string,
): BloodlineCrossCell[] {
  const key = (a: string, b: string) => [a, b].sort().join("|||");
  const tried = new Map<string, number>();
  for (const p of recordedPairs) {
    const b1 = bloodlineOf(p.parentId1) || "Unknown";
    const b2 = bloodlineOf(p.parentId2) || "Unknown";
    const k = key(b1, b2);
    tried.set(k, (tried.get(k) ?? 0) + p.children);
  }
  const bloodlines = [...new Set(active.map((h) => dominantBloodline(h.dna) || "Unknown"))].sort();
  const speedOf = new Map(active.map((h) => [h.id, h.speed]));
  // Exclusive fastest-first pairing mirrors the breeding plan, so
  // "active pairs" matches what the planner would actually breed.
  const ordered = [...active].sort((a, b) => b.speed - a.speed || a.id.localeCompare(b.id));
  const pairCount = new Map<string, number>();
  const pairBest = new Map<string, number>();
  for (let i = 0; i + 1 < ordered.length; i += 2) {
    const a = ordered[i];
    const b = ordered[i + 1];
    const k = key(dominantBloodline(a.dna) || "Unknown", dominantBloodline(b.dna) || "Unknown");
    pairCount.set(k, (pairCount.get(k) ?? 0) + 1);
    const mid = (speedOf.get(a.id) ?? 0) / 2 + (speedOf.get(b.id) ?? 0) / 2;
    pairBest.set(k, Math.max(pairBest.get(k) ?? -Infinity, mid));
  }
  const cells: BloodlineCrossCell[] = [];
  for (let i = 0; i < bloodlines.length; i++) {
    for (let j = i; j < bloodlines.length; j++) {
      const k = key(bloodlines[i], bloodlines[j]);
      const best = pairBest.get(k);
      cells.push({
        b1: bloodlines[i],
        b2: bloodlines[j],
        triedFoals: tried.get(k) ?? 0,
        activePairs: pairCount.get(k) ?? 0,
        bestMid: best === undefined || best === -Infinity ? null : best,
      });
    }
  }
  return cells.sort(
    (a, b) =>
      Number(a.triedFoals === 0 && a.activePairs > 0) - Number(b.triedFoals === 0 && b.activePairs > 0) ||
      b.activePairs - a.activePairs ||
      a.b1.localeCompare(b.b1) ||
      a.b2.localeCompare(b.b2),
  );
}

import {
  VARIANT_COLOR_COUNT as VARIANT_COLORS,
  VARIANT_PATTERN_COUNT as VARIANT_PATTERNS,
  VARIANT_TOTAL,
  variantColorOf,
  variantIdOf,
  variantPatternOf,
} from "./variant";

// Single-source variant math lives in ./variant; re-exported here so
// existing importers keep working.
export {
  VARIANT_COLORS,
  VARIANT_PATTERNS,
  VARIANT_TOTAL,
  variantColorOf,
  variantIdOf,
  variantPatternOf,
};

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

export interface FounderLegacy {
  founderId: string;
  livingDescendants: number;
  activeDescendants: number;
}

/**
 * Per generation-0 founder: living descendants + how many made the
 * active herd. Walks parent links; cycle-safe via visited set.
 */
export function founderLegacy(
  horses: { id: string; parentId1?: string | null; parentId2?: string | null; generation?: number; status?: string }[],
  activeIds: Set<string>,
): FounderLegacy[] {
  const children = new Map<string, string[]>();
  for (const h of horses) {
    for (const p of [h.parentId1, h.parentId2]) {
      if (!p) continue;
      const list = children.get(p);
      if (list) list.push(h.id);
      else children.set(p, [h.id]);
    }
  }
  const living = new Set(
    horses.filter((h) => h.status !== "Deceased").map((h) => h.id),
  );
  const founders = horses.filter((h) => (h.generation || 0) === 0);
  return founders
    .map((f) => {
      const seen = new Set<string>([f.id]);
      const queue = [f.id];
      let live = 0;
      let active = 0;
      while (queue.length > 0) {
        const cur = queue.pop() as string;
        for (const child of children.get(cur) ?? []) {
          if (seen.has(child)) continue;
          seen.add(child);
          queue.push(child);
          if (living.has(child)) live++;
          if (activeIds.has(child)) active++;
        }
      }
      return { founderId: f.id, livingDescendants: live, activeDescendants: active };
    })
    .sort((a, b) => b.activeDescendants - a.activeDescendants || b.livingDescendants - a.livingDescendants);
}

export interface PurityPoint {
  generation: number;
  avgShare: number;
  count: number;
}

/** Average dominant-bloodline share per generation — purifying or fragmenting? */
export function purityTrend(
  horses: { generation?: number; dna?: Record<string, unknown> }[],
): PurityPoint[] {
  const groups = new Map<number, { sum: number; count: number }>();
  for (const h of horses) {
    let best = 0;
    for (const w of Object.values(h.dna || {})) {
      if (typeof w === "number" && Number.isFinite(w) && w > best) best = w;
    }
    if (!(best > 0)) continue;
    const gen = h.generation || 0;
    const g = groups.get(gen) || { sum: 0, count: 0 };
    g.sum += best;
    g.count++;
    groups.set(gen, g);
  }
  return [...groups.entries()]
    .map(([generation, g]) => ({ generation, avgShare: g.sum / g.count, count: g.count }))
    .sort((a, b) => a.generation - b.generation);
}

/** Pearson r over paired finite values (0 when degenerate). */
export function pearson(xs: number[], ys: number[]): number {
  const pairs = xs
    .map((x, i) => [x, ys[i]] as const)
    .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  const n = pairs.length;
  if (n < 2) return 0;
  const mx = pairs.reduce((t, [x]) => t + x, 0) / n;
  const my = pairs.reduce((t, [, y]) => t + y, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (const [x, y] of pairs) {
    sxy += (x - mx) * (y - my);
    sxx += (x - mx) ** 2;
    syy += (y - my) ** 2;
  }
  if (!(sxx > 0) || !(syy > 0)) return 0;
  return sxy / Math.sqrt(sxx * syy);
}

export interface StatCorrelations {
  speedJump: number;
  speedHealth: number;
  jumpHealth: number;
  n: number;
}

/** Pairwise stat correlations over translated stats — selection trade-offs. */
export function statCorrelations(
  rows: { speed: number; jump: number; health: number }[],
): StatCorrelations {
  const finite = rows.filter(
    (r) => Number.isFinite(r.speed) && Number.isFinite(r.jump) && Number.isFinite(r.health),
  );
  return {
    speedJump: pearson(finite.map((r) => r.speed), finite.map((r) => r.jump)),
    speedHealth: pearson(finite.map((r) => r.speed), finite.map((r) => r.health)),
    jumpHealth: pearson(finite.map((r) => r.jump), finite.map((r) => r.health)),
    n: finite.length,
  };
}

export interface VariancePoint {
  generation: number;
  std: number;
  count: number;
}

/** Per-generation standard deviation — stabilizing or freshly outcrossed? */
export function varianceByGeneration(
  rows: { generation: number; value: number }[],
): VariancePoint[] {
  const groups = new Map<number, number[]>();
  for (const r of rows) {
    if (!Number.isFinite(r.value)) continue;
    const list = groups.get(r.generation);
    if (list) list.push(r.value);
    else groups.set(r.generation, [r.value]);
  }
  return [...groups.entries()]
    .map(([generation, xs]) => {
      const mean = xs.reduce((t, v) => t + v, 0) / xs.length;
      const variance = xs.reduce((t, v) => t + (v - mean) ** 2, 0) / xs.length;
      return { generation, std: Math.sqrt(variance), count: xs.length };
    })
    .sort((a, b) => a.generation - b.generation);
}

export interface InbredSplit {
  inbred: { n: number; speed: number; jump: number; health: number };
  clean: { n: number; speed: number; jump: number; health: number };
}

/** Average stats of inbred foals (shared ancestors > 0) vs clean foals. */
export function inbreedingSplit(
  foals: TranslatedFoal[],
  sharedOf: (id: string) => number,
): InbredSplit {
  const zero = () => ({ n: 0, speed: 0, jump: 0, health: 0 });
  const inbred = zero();
  const clean = zero();
  for (const f of foals) {
    const bucket = sharedOf(f.id) > 0 ? inbred : clean;
    bucket.n++;
    bucket.speed += f.speed;
    bucket.jump += f.jump;
    bucket.health += f.health;
  }
  const avg = (b: { n: number; speed: number; jump: number; health: number }) => ({
    n: b.n,
    speed: b.n > 0 ? b.speed / b.n : 0,
    jump: b.n > 0 ? b.jump / b.n : 0,
    health: b.n > 0 ? b.health / b.n : 0,
  });
  return { inbred: avg(inbred), clean: avg(clean) };
}

export interface GenerationRecord {
  generation: number;
  speed: { id: string; value: number } | null;
  jump: { id: string; value: number } | null;
  health: { id: string; value: number } | null;
}

/** Best holder per stat per generation — record history without dates. */
export function recordByGeneration(
  rows: { id: string; generation: number; speed: number; jump: number; health: number }[],
): GenerationRecord[] {
  const groups = new Map<number, GenerationRecord>();
  for (const r of rows) {
    let rec = groups.get(r.generation);
    if (!rec) {
      rec = { generation: r.generation, speed: null, jump: null, health: null };
      groups.set(r.generation, rec);
    }
    if (Number.isFinite(r.speed) && (!rec.speed || r.speed > rec.speed.value)) {
      rec.speed = { id: r.id, value: r.speed };
    }
    if (Number.isFinite(r.jump) && (!rec.jump || r.jump > rec.jump.value)) {
      rec.jump = { id: r.id, value: r.jump };
    }
    if (Number.isFinite(r.health) && (!rec.health || r.health > rec.health.value)) {
      rec.health = { id: r.id, value: r.health };
    }
  }
  return [...groups.values()].sort((a, b) => a.generation - b.generation);
}

export interface AliveDeadSplit {
  living: { n: number; speed: number; jump: number; health: number };
  deceased: { n: number; speed: number; jump: number; health: number };
}

/** Total breeding progress: living herd averages vs deceased history. */
export function deceasedVsLiving(
  rows: { status?: string; speed: number; jump: number; health: number }[],
): AliveDeadSplit {
  const zero = () => ({ n: 0, speed: 0, jump: 0, health: 0 });
  const living = zero();
  const deceased = zero();
  for (const r of rows) {
    const bucket = r.status === "Deceased" ? deceased : living;
    bucket.n++;
    if (Number.isFinite(r.speed)) bucket.speed += r.speed;
    if (Number.isFinite(r.jump)) bucket.jump += r.jump;
    if (Number.isFinite(r.health)) bucket.health += r.health;
  }
  const avg = (b: { n: number; speed: number; jump: number; health: number }) => ({
    n: b.n,
    speed: b.n > 0 ? b.speed / b.n : 0,
    jump: b.n > 0 ? b.jump / b.n : 0,
    health: b.n > 0 ? b.health / b.n : 0,
  });
  return { living: avg(living), deceased: avg(deceased) };
}
