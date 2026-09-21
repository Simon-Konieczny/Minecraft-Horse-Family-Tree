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
