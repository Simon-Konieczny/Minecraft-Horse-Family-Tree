import { dominantBloodline } from "../analytics";

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
