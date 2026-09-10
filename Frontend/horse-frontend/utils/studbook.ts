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
}

/** Family key for grouping: stored name, else DNA-derived surname. */
export function effectiveFamily(horse: Pick<Horse, "familyName" | "dna">): string {
  const stored = (horse.familyName || "").trim();
  if (stored) return stored;
  return getSurnameFromDna(horse.dna || {});
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

    records.push({
      family,
      count: members.length,
      founders,
      lastPurebred,
      records: { speed: best("speed"), jump: best("jump"), health: best("health") },
    });
  }

  return records.sort((a, b) => a.family.localeCompare(b.family));
}
