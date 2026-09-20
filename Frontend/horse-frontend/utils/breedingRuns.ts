/** Breeding-run checklist model: snapshot pairs, tick off, delete per generation.
 *
 * Snapshots store PAIRS ONLY (horse ids + benched id). Names and stats
 * always resolve live from the current herd so renames and new foals
 * show correctly. Persistence is browser localStorage (per-device).
 */

export interface BreedingRunPair {
  sireId: string;
  damId: string;
}

export interface BreedingRun {
  id: string;
  label: string;
  createdAt: string;
  pairs: BreedingRunPair[];
  benchedId: string | null;
  done: Record<string, boolean>;
}

export const BREEDING_RUNS_STORAGE_KEY = "breeding-checklist-runs-v1";

/** Cap history so localStorage stays small; oldest runs are evicted first. */
export const MAX_BREEDING_RUNS = 20;

/** Order-insensitive pair key, matching PairingPlanner/pairOutcomes. */
export function breedingPairKey(a: string, b: string): string {
  return [a, b].sort().join("|||");
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `run-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

export function defaultBreedingRunLabel(now: Date = new Date()): string {
  const day = now.toISOString().slice(0, 10);
  return `Breeding run · ${day}`;
}

/** Suggests "Gen N" from the highest generation currently in the herd. */
export function suggestBreedingRunLabel(
  generations: (number | undefined)[],
  now: Date = new Date(),
): string {
  const max = generations.reduce<number | null>((best, g) => {
    if (typeof g !== "number" || !Number.isFinite(g)) return best;
    return best === null || g > best ? g : best;
  }, null);
  const day = now.toISOString().slice(0, 10);
  return max === null ? `Breeding run · ${day}` : `Gen ${max + 1} · ${day}`;
}

export function createBreedingRun(
  pairs: BreedingRunPair[],
  benchedId: string | null,
  label?: string,
  now: Date = new Date(),
): BreedingRun {
  const seen = new Set<string>();
  const clean: BreedingRunPair[] = [];
  for (const p of pairs) {
    if (!p.sireId || !p.damId || p.sireId === p.damId) continue;
    const key = breedingPairKey(p.sireId, p.damId);
    if (seen.has(key)) continue;
    seen.add(key);
    const [sireId, damId] = [p.sireId, p.damId].sort();
    clean.push({ sireId, damId });
  }
  return {
    id: newId(),
    label: label?.trim() || defaultBreedingRunLabel(now),
    createdAt: now.toISOString(),
    pairs: clean,
    benchedId: benchedId ?? null,
    done: {},
  };
}

export function toggleBreedingPair(run: BreedingRun, key: string): BreedingRun {
  return {
    ...run,
    done: { ...run.done, [key]: !run.done[key] },
  };
}

export function setBreedingPairDone(
  run: BreedingRun,
  key: string,
  done: boolean,
): BreedingRun {
  if (done) return { ...run, done: { ...run.done, [key]: true } };
  const next = { ...run.done };
  delete next[key];
  return { ...run, done: next };
}

export function clearBreedingTicks(run: BreedingRun): BreedingRun {
  return { ...run, done: {} };
}

export function removeBreedingPair(run: BreedingRun, key: string): BreedingRun {
  const pairs = run.pairs.filter((p) => breedingPairKey(p.sireId, p.damId) !== key);
  const done = { ...run.done };
  delete done[key];
  return { ...run, pairs, done };
}

export function renameBreedingRun(run: BreedingRun, label: string): BreedingRun {
  const trimmed = label.trim();
  return { ...run, label: trimmed || run.label };
}

export function breedingRunProgress(run: BreedingRun): {
  done: number;
  total: number;
} {
  let done = 0;
  for (const p of run.pairs) {
    if (run.done[breedingPairKey(p.sireId, p.damId)]) done++;
  }
  return { done, total: run.pairs.length };
}

/** Drops unknown/duplicate/self pairs; returns null when nothing survives. */
export function sanitizeBreedingRun(
  raw: unknown,
  validIds?: Set<string>,
): BreedingRun | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || !r.id) return null;
  const seen = new Set<string>();
  const pairs: BreedingRunPair[] = [];
  if (Array.isArray(r.pairs)) {
    for (const entry of r.pairs) {
      if (typeof entry !== "object" || entry === null) continue;
      const e = entry as Record<string, unknown>;
      if (typeof e.sireId !== "string" || typeof e.damId !== "string") continue;
      if (!e.sireId || !e.damId || e.sireId === e.damId) continue;
      if (validIds && (!validIds.has(e.sireId) || !validIds.has(e.damId))) continue;
      const key = breedingPairKey(e.sireId, e.damId);
      if (seen.has(key)) continue;
      seen.add(key);
      const [sireId, damId] = [e.sireId, e.damId].sort();
      pairs.push({ sireId, damId });
    }
  }
  if (pairs.length === 0) return null;
  const done: Record<string, boolean> = {};
  if (typeof r.done === "object" && r.done !== null) {
    for (const [k, v] of Object.entries(r.done as Record<string, unknown>)) {
      if (v === true && seen.has(k)) done[k] = true;
    }
  }
  const benchedId =
    typeof r.benchedId === "string" && r.benchedId
      ? r.benchedId
      : null;
  return {
    id: r.id,
    label: typeof r.label === "string" && r.label.trim() ? r.label : "Breeding run",
    createdAt:
      typeof r.createdAt === "string" && r.createdAt ? r.createdAt : new Date(0).toISOString(),
    pairs,
    benchedId: validIds && benchedId && !validIds.has(benchedId) ? null : benchedId,
    done,
  };
}

/** Parses unknown storage payloads; corrupt entries are skipped, never throw. */
export function migrateBreedingRuns(raw: unknown): BreedingRun[] {
  const list = Array.isArray(raw) ? raw : [raw];
  const runs: BreedingRun[] = [];
  const seenIds = new Set<string>();
  for (const entry of list) {
    if (entry === undefined || entry === null) continue;
    const run = sanitizeBreedingRun(entry);
    if (!run || seenIds.has(run.id)) continue;
    seenIds.add(run.id);
    runs.push(run);
  }
  return runs.slice(0, MAX_BREEDING_RUNS);
}

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export function loadBreedingRuns(storage?: StorageLike | null): BreedingRun[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(BREEDING_RUNS_STORAGE_KEY);
    if (!raw) return [];
    return migrateBreedingRuns(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveBreedingRuns(storage: StorageLike, runs: BreedingRun[]): void {
  try {
    storage.setItem(
      BREEDING_RUNS_STORAGE_KEY,
      JSON.stringify(runs.slice(0, MAX_BREEDING_RUNS)),
    );
  } catch {
    // Quota/private-mode failures must never break the planner.
  }
}
