import { dominantBloodline } from "./analytics";

/** Active-herd policy: 63 fastest by speed UNION top-16 jump UNION top-16 health. */
export const ACTIVE_SPEED_COUNT = 63;
export const ACTIVE_JUMP_COUNT = 16;
export const ACTIVE_HEALTH_COUNT = 16;
/** In-game active pens: 9 pens × 7 horses = 63 speed slots. */
export const PEN_SIZE = 7;
export const PEN_COUNT = 9;

export interface ActiveReason {
  speed: boolean;
  jump: boolean;
  health: boolean;
}

export interface ActiveHerdResult<T> {
  /** Union of all three cuts — the horses that stay in the active stable. */
  active: T[];
  /** Living horses outside the union (Alive non-keepers + Retired). */
  pastured: T[];
  activeIds: Set<string>;
  reasons: Map<string, ActiveReason>;
  /** Raw-stat value at the last included rank (null when pool is empty). */
  cuts: { speed: number | null; jump: number | null; health: number | null };
  counts: { candidates: number; active: number; pastured: number };
  /** Living-candidate ids per stat, fastest-first (ties by id) — powers bubble watch. */
  ranked: { speed: string[]; jump: string[]; health: string[] };
}

type HerdHorse = {
  id: string;
  status?: unknown;
  speed?: unknown;
  jump?: unknown;
  health?: unknown;
  dna?: Record<string, unknown>;
};

function isLiving(h: HerdHorse): boolean {
  return h.status !== "Deceased" && h.status !== "Retired";
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function topIds<T extends HerdHorse>(candidates: T[], field: "speed" | "jump" | "health", n: number): { ids: Set<string>; cut: number | null; ranked: string[] } {
  const rankedAll = candidates
    .filter((h) => num(h[field]) !== null)
    .sort((a, b) => (num(b[field]) as number) - (num(a[field]) as number) || a.id.localeCompare(b.id));
  const ids = new Set(rankedAll.slice(0, Math.max(0, n)).map((h) => h.id));
  const cut = rankedAll.length > 0 ? (num(rankedAll[Math.min(n, rankedAll.length) - 1][field]) as number) : null;
  return { ids, cut, ranked: rankedAll.map((h) => h.id) };
}

/**
 * Splits the herd into Active (top-63 speed ∪ top-16 jump ∪ top-16
 * health, living only) and Pastured (everything living left over plus
 * Retired). Deceased horses appear in neither list. Deterministic:
 * ties break by id, matching planSequentialPairings.
 */
export function getActiveHerd<T extends HerdHorse>(horses: T[]): ActiveHerdResult<T> {
  const candidates = horses.filter(isLiving);
  const speed = topIds(candidates, "speed", ACTIVE_SPEED_COUNT);
  const jump = topIds(candidates, "jump", ACTIVE_JUMP_COUNT);
  const health = topIds(candidates, "health", ACTIVE_HEALTH_COUNT);

  const reasons = new Map<string, ActiveReason>();
  for (const h of candidates) {
    const r = {
      speed: speed.ids.has(h.id),
      jump: jump.ids.has(h.id),
      health: health.ids.has(h.id),
    };
    if (r.speed || r.jump || r.health) reasons.set(h.id, r);
  }
  const activeIds = new Set(reasons.keys());
  const byId = new Map(candidates.map((h) => [h.id, h]));
  // Active sorted fastest-first so pen assignment and breeding order agree.
  const active = [...activeIds]
    .map((id) => byId.get(id) as T)
    .sort((a, b) => (num(b.speed) ?? -Infinity) - (num(a.speed) ?? -Infinity) || a.id.localeCompare(b.id));
  const pastured = horses.filter(
    (h) => h.status !== "Deceased" && !activeIds.has(h.id),
  );
  return {
    active,
    pastured,
    activeIds,
    reasons,
    cuts: { speed: speed.cut, jump: jump.cut, health: health.cut },
    counts: { candidates: candidates.length, active: active.length, pastured: pastured.length },
    ranked: { speed: speed.ranked, jump: jump.ranked, health: health.ranked },
  };
}

/** 1-based pen number for an active horse's speed rank (overflow past PEN_COUNT allowed). */
export function penForSpeedRank(speedRankZeroBased: number): number {
  return Math.floor(speedRankZeroBased / PEN_SIZE) + 1;
}

export interface HousingSuggestion {
  zone: "active" | "pasture" | "deceased";
  /** 1-based pen when active, else null. */
  pen: number | null;
  /** Dominant bloodline group when pastured, else null. */
  pastureGroup: string | null;
  reasons: ActiveReason | null;
  /** True for slow jump/health keepers living past pen 9 (overflow). */
  overflow: boolean;
}

/**
 * Where one horse lives in-game: active pens are speed tiers of 7
 * (Pen 1 = active ranks 1–7 … Pen 9 = 57–63, overflow P10+ for slow
 * jump/health keepers); pastured horses group by dominant bloodline
 * for heritage. Deceased horses need no stall.
 */
export function getSuggestedHousing<T extends HerdHorse>(
  horse: T,
  herd: ActiveHerdResult<T>,
): HousingSuggestion {
  if (horse.status === "Deceased") {
    return { zone: "deceased", pen: null, pastureGroup: null, reasons: null, overflow: false };
  }
  const reasons = herd.reasons.get(horse.id) ?? null;
  if (!reasons) {
    const group = dominantBloodline(horse.dna) || "Unknown";
    return { zone: "pasture", pen: null, pastureGroup: group, reasons: null, overflow: false };
  }
  const rank = herd.active.findIndex((h) => h.id === horse.id);
  const pen = penForSpeedRank(Math.max(0, rank));
  return { zone: "active", pen, pastureGroup: null, reasons, overflow: pen > PEN_COUNT };
}

/** Groups pastured horses by dominant bloodline for heritage pastures. */
export function groupPasturesByBloodline<T extends HerdHorse>(pastured: T[]): { group: string; horses: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const h of pastured) {
    const group = dominantBloodline(h.dna) || "Unknown";
    const list = groups.get(group);
    if (list) list.push(h);
    else groups.set(group, [h]);
  }
  return [...groups.entries()]
    .map(([group, horses]) => ({ group, horses }))
    .sort((a, b) => b.horses.length - a.horses.length || a.group.localeCompare(b.group));
}
