import type { Horse, HorseStatus } from "@/types/horse";
import { effectiveFamilies, familiesWithCounts } from "./studbook";
import { matchesHorse, parseSearchQuery } from "./horseSearch";

export interface TreeFilters {
  /** Enabled families (effective names). Empty hides every horse. */
  families: string[];
  /**
   * Families present when the filter was saved. Present-but-unknown
   * families are newcomers (enabled); saved-but-absent ones are gone.
   * This keeps deliberate exclusions across remounts while new
   * bloodlines stay visible.
   */
  knownFamilies: string[];
  /** Enabled statuses. Empty hides every horse. */
  statuses: HorseStatus[];
  genMin: number;
  genMax: number;
  /**
   * Herd generation span when the filter was saved. Generations that
   * appeared since (newcomers) auto-expand the restored bounds so a
   * foal born into a new generation is never hidden by a stale cookie.
   * Narrowing chosen inside the saved span is preserved as deliberate.
   */
  knownGenMin: number;
  knownGenMax: number;
  /** Session-only text query. Never restored from the cookie. */
  search: string;
}

/** Persisted filter schema version (v1 had no version field). */
export const TREE_FILTERS_VERSION = 2;

export const ALL_STATUSES: HorseStatus[] = ["Alive", "Deceased", "Retired"];

/** All-on defaults derived from the herd at hand. */
export function defaultTreeFilters(horses: Horse[]): TreeFilters {
  const gens = horses.map((h) => h.generation || 0);
  const families = familiesWithCounts(horses).map((f) => f.family);
  const genMin = gens.length > 0 ? Math.min(...gens) : 0;
  const genMax = gens.length > 0 ? Math.max(...gens) : 0;
  return {
    families,
    knownFamilies: [...families],
    statuses: [...ALL_STATUSES],
    genMin,
    genMax,
    knownGenMin: genMin,
    knownGenMax: genMax,
    search: "",
  };
}

/**
 * Visible horse ids under AND-combined filters. Unknown families or
 * statuses in the filter never match (stale-cookie safe). Hyphenated
 * horses stay visible when ANY of their families is enabled. The text
 * query shares the find-box matcher (name, family, generation, status,
 * stat operators) so both search surfaces agree.
 */
export function applyTreeFilters(horses: Horse[], filters: TreeFilters): Set<string> {
  const tokens = parseSearchQuery(filters.search);
  const visible = new Set<string>();
  for (const h of horses) {
    if (!effectiveFamilies(h).some((f) => filters.families.includes(f))) continue;
    if (!filters.statuses.includes(h.status)) continue;
    const gen = h.generation || 0;
    if (gen < filters.genMin || gen > filters.genMax) continue;
    if (tokens.length > 0 && !matchesHorse(h, filters.search)) continue;
    visible.add(h.id);
  }
  return visible;
}

/**
 * Forgiving cookie restore: unknown families/statuses are dropped,
 * non-finite generations fall back, min/max swaps and clamps into the
 * herd span. Explicit empty lists are respected (they hide everything).
 * Unversioned (pre-v2) cookies reset to defaults once — their family
 * keys predate split-family grouping and can't be trusted.
 * The text search is session-only and never restored. Generation
 * bounds auto-expand for newcomer generations beyond the saved span;
 * narrowing inside the saved span is kept as deliberate.
 */
export function sanitizeTreeFilters(saved: unknown, horses: Horse[]): TreeFilters {
  const def = defaultTreeFilters(horses);
  if (!saved || typeof saved !== "object") return def;
  const s = saved as Partial<TreeFilters> & { version?: unknown };
  if (s.version !== TREE_FILTERS_VERSION) return def;
  const present = new Set(def.families);
  const known = Array.isArray(s.knownFamilies)
    ? s.knownFamilies.filter((f): f is string => typeof f === "string")
    : def.families;
  const enabledSaved = Array.isArray(s.families)
    ? s.families.filter((f): f is string => typeof f === "string" && present.has(f))
    : def.families;
  // Deliberate exclusions persist; families that appeared since the save
  // are newcomers and stay visible.
  const families = [
    ...new Set([
      ...enabledSaved,
      ...def.families.filter((f) => !known.includes(f)),
    ]),
  ];
  const statuses = Array.isArray(s.statuses)
    ? s.statuses.filter(
        (x): x is HorseStatus => x === "Alive" || x === "Deceased" || x === "Retired",
      )
    : def.statuses;
  let genMin =
    typeof s.genMin === "number" && Number.isFinite(s.genMin) ? s.genMin : def.genMin;
  let genMax =
    typeof s.genMax === "number" && Number.isFinite(s.genMax) ? s.genMax : def.genMax;
  if (genMin > genMax) [genMin, genMax] = [genMax, genMin];
  const knownGenMin =
    typeof s.knownGenMin === "number" && Number.isFinite(s.knownGenMin)
      ? s.knownGenMin
      : genMin;
  const knownGenMax =
    typeof s.knownGenMax === "number" && Number.isFinite(s.knownGenMax)
      ? s.knownGenMax
      : genMax;
  // Newcomer generations beyond the saved span stay visible — but only
  // when the saved bound sat at the old edge (a narrowed bound is
  // deliberate and stays put).
  if (genMax >= knownGenMax && def.genMax > knownGenMax) genMax = def.genMax;
  if (genMin <= knownGenMin && def.genMin < knownGenMin) genMin = def.genMin;
  genMin = Math.min(Math.max(genMin, def.genMin), def.genMax);
  genMax = Math.max(Math.min(genMax, def.genMax), def.genMin);
  return {
    families,
    knownFamilies: def.families,
    statuses,
    genMin,
    genMax,
    knownGenMin: def.genMin,
    knownGenMax: def.genMax,
    search: "",
  };
}
