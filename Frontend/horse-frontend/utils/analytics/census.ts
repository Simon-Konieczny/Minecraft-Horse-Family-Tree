export interface StatusBreakdown {
  Alive: number;
  Deceased: number;
  Retired: number;
}

export interface GenerationCount {
  generation: number;
  count: number;
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
