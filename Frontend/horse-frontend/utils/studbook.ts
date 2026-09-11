import { Horse } from "@/types/horse";
import { getSurnameFromDna } from "./genetics/utils";
import { getPurityTier } from "./genetics/utils";
import { getHorseFullName } from "./horseNames";
import { translateStat } from "./translateRawStats";

export interface FounderSummary {
  id: string;
  name: string;
  /** ISO date string, or null when neither createdAt nor a valid ObjectId is available. */
  foundedAt: string | null;
  speed: number;
  jump: number;
  health: number;
  generation: number;
}

export interface RecordHolder {
  /** Translated display value (dashboard convention). */
  value: number;
  horseId: string;
  horseName: string;
}

export interface FamilyRecord {
  family: string;
  count: number;
  founders: FounderSummary[];
  lastPurebred: {
    id: string;
    name: string;
    generation: number;
    status: Horse["status"];
    share: number;
    tierLabel: string;
  } | null;
  records: {
    speed: RecordHolder | null;
    jump: RecordHolder | null;
    health: RecordHolder | null;
  };
  /** Translated averages over living members only (null when none alive). */
  averages: {
    speed: number | null;
    jump: number | null;
    health: number | null;
    aliveCount: number;
  };
}

/** Family key for grouping: stored name, else DNA-derived surname. */
export function effectiveFamily(horse: Pick<Horse, "familyName" | "dna">): string {
  const stored = (horse.familyName || "").trim();
  if (stored) return stored;
  return getSurnameFromDna(horse.dna || {});
}

export interface FamilyCount {
  family: string;
  count: number;
}

/** Distinct families present in a list, name-sorted, with horse counts. */
export function familiesWithCounts(
  horses: Pick<Horse, "familyName" | "dna">[],
): FamilyCount[] {
  const counts = new Map<string, number>();
  for (const h of horses) {
    const family = effectiveFamily(h);
    counts.set(family, (counts.get(family) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([family, count]) => ({ family, count }))
    .sort((a, b) => a.family.localeCompare(b.family));
}

function toRoman(n: number): string {
  const table: [number, string][] = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let out = "";
  let rest = Math.max(1, Math.floor(n));
  for (const [value, numeral] of table) {
    while (rest >= value) {
      out += numeral;
      rest -= value;
    }
  }
  return out;
}

/**
 * Display first names with duplicate disambiguation: unique names pass
 * through untouched; the eldest of a duplicate set keeps the bare name
 * and younger ones gain II / III / … suffixes. Seniority is founding
 * date (ObjectId fallback), id-tie-broken — fully deterministic.
 * Built for minimal tree chips, where surnames are hidden.
 */
export function disambiguatedFirstNames(
  horses: Pick<Horse, "id" | "firstName" | "createdAt">[],
): Map<string, string> {
  const groups = new Map<string, { id: string; foundedAt: string }[]>();
  for (const h of horses) {
    const name = (h.firstName || "").trim() || "Unknown";
    const list = groups.get(name);
    const entry = { id: h.id, foundedAt: getFoundingDate(h) || "" };
    if (list) list.push(entry);
    else groups.set(name, [entry]);
  }
  const out = new Map<string, string>();
  for (const [name, members] of groups) {
    if (members.length === 1) {
      out.set(members[0].id, name);
      continue;
    }
    const ordered = [...members].sort(
      (a, b) => a.foundedAt.localeCompare(b.foundedAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    );
    ordered.forEach((m, i) => {
      out.set(m.id, i === 0 ? name : `${name} ${toRoman(i + 1)}`);
    });
  }
  return out;
}

/**
 * Derives a founding date without any stored timestamp: prefers
 * createdAt, falls back to the ObjectId timestamp (first 4 bytes).
 */
export function getFoundingDate(horse: Pick<Horse, "id" | "createdAt">): string | null {
  if (horse.createdAt) {
    const parsed = new Date(horse.createdAt);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  const match = /^[0-9a-fA-F]{24}$/.exec(horse.id || "");
  if (!match) return null;
  return new Date(parseInt(match[0].slice(0, 8), 16) * 1000).toISOString();
}

function dominantShare(dna: Horse["dna"]): number {
  const values = Object.values(dna || {});
  return values.length > 0 ? Math.max(...values) : 0;
}

/**
 * Builds per-family records live from the herd: founders (generation 0),
 * the highest-share ("last purebred") representative, and stat records.
 * Includes deceased horses (history); deleted horses are simply gone.
 */
export function buildFamilyRecords(horses: Horse[]): FamilyRecord[] {
  const groups = new Map<string, Horse[]>();
  for (const h of horses) {
    const family = effectiveFamily(h);
    const list = groups.get(family);
    if (list) list.push(h);
    else groups.set(family, [h]);
  }

  const records: FamilyRecord[] = [];
  for (const [family, members] of groups) {
    const founders: FounderSummary[] = members
      .filter((h) => (h.generation || 0) === 0)
      .map((h) => ({
        id: h.id,
        name: getHorseFullName(h),
        foundedAt: getFoundingDate(h),
        speed: translateStat("speed", h.speed),
        jump: translateStat("jump", h.jump),
        health: translateStat("health", h.health),
        generation: h.generation || 0,
      }))
      .sort((a, b) => (a.foundedAt || "").localeCompare(b.foundedAt || ""));

    let lastPurebred: FamilyRecord["lastPurebred"] = null;
    for (const h of members) {
      const share = dominantShare(h.dna);
      if (share <= 0) continue;
      if (
        !lastPurebred ||
        share > lastPurebred.share ||
        (share === lastPurebred.share && (h.generation || 0) < lastPurebred.generation)
      ) {
        lastPurebred = {
          id: h.id,
          name: getHorseFullName(h),
          generation: h.generation || 0,
          status: h.status,
          share,
          tierLabel: getPurityTier(h.dna).label,
        };
      }
    }

    const best = (
      field: "speed" | "jump" | "health",
    ): RecordHolder | null => {
      let holder: RecordHolder | null = null;
      for (const h of members) {
        const value = translateStat(field, h[field]);
        if (!holder || value > holder.value) {
          holder = { value, horseId: h.id, horseName: getHorseFullName(h) };
        }
      }
      return holder;
    };

    // Living averages: translate first (jump is nonlinear), average over
    // Alive members only — deceased/retired history stays in records.
    const living = members.filter((h) => h.status === "Alive");
    const avgAlive = (field: "speed" | "jump" | "health"): number | null => {
      if (living.length === 0) return null;
      return (
        living.reduce((t, h) => t + translateStat(field, h[field]), 0) /
        living.length
      );
    };

    records.push({
      family,
      count: members.length,
      founders,
      lastPurebred,
      records: { speed: best("speed"), jump: best("jump"), health: best("health") },
      averages: {
        speed: avgAlive("speed"),
        jump: avgAlive("jump"),
        health: avgAlive("health"),
        aliveCount: living.length,
      },
    });
  }

  return records.sort((a, b) => a.family.localeCompare(b.family));
}
