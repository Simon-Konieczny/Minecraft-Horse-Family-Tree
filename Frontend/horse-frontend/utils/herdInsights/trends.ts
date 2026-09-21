import type { TranslatedFoal } from "./reliability";

export interface PurityPoint {
  generation: number;
  avgShare: number;
  count: number;
}

export interface StatCorrelations {
  speedJump: number;
  speedHealth: number;
  jumpHealth: number;
  n: number;
}

export interface VariancePoint {
  generation: number;
  std: number;
  count: number;
}

export interface InbredSplit {
  inbred: { n: number; speed: number; jump: number; health: number };
  clean: { n: number; speed: number; jump: number; health: number };
}

export interface GenerationRecord {
  generation: number;
  speed: { id: string; value: number } | null;
  jump: { id: string; value: number } | null;
  health: { id: string; value: number } | null;
}

export interface AliveDeadSplit {
  living: { n: number; speed: number; jump: number; health: number };
  deceased: { n: number; speed: number; jump: number; health: number };
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
