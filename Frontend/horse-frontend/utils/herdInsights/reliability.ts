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
