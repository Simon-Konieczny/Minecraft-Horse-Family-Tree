import { BloodlineMap } from "@/types/horse";
// Relative import: vitest has no "@" alias configured, and this is a
// runtime (value) import, unlike the type-only import above.
import { bloodlineSlug } from "../bloodlineValidation";

export const BLOODLINE_COLORS: Record<string, string> = {
  "Star Strider": "#000066",
  "Celestial Grass": "#00FF00", 
  "Thunder Blood": "#ffa621",
  "Frostmane": "#00FFFF", 
  "Emberhoof": "#FF0000", 
  "Slothsoul": "#708090",
  "Unknown": "#444444"
};

export function mergeDna(sireDna: BloodlineMap, damDna: BloodlineMap): BloodlineMap {
  const sire = normalizeDna(sireDna);
  const dam = normalizeDna(damDna);
  const dna: BloodlineMap = {};
  const allKeys = new Set([...Object.keys(sire), ...Object.keys(dam)]);

  allKeys.forEach((key) => {
    const val = ((sire[key] || 0) + (dam[key] || 0)) / 2;
    if (val > 0) dna[key] = val;
  });

  return normalizeDna(dna);
}

/** Tolerance for a DNA map's weights summing to 1.0 (float dust allowed). */
export const DNA_SUM_TOLERANCE = 0.01;

/**
 * Throws if a DNA map is corrupt: negative or non-finite weights, or
 * weights summing outside 1.0 ± DNA_SUM_TOLERANCE. Save-time gate —
 * call before persisting DNA derived from stored (possibly hand-edited)
 * maps so one bad map can't quietly distort every descendant.
 */
export function assertDnaSum(dna: BloodlineMap, label = "DNA"): void {
  const entries = Object.entries(dna || {});
  for (const [bloodline, weight] of entries) {
    if (typeof weight !== "number" || !Number.isFinite(weight) || weight < 0) {
      throw new Error(
        `Invalid ${label}: bloodline "${bloodline}" has weight ${String(weight)}.`,
      );
    }
  }
  const sum = entries.reduce((total, [, weight]) => total + weight, 0);
  if (Math.abs(sum - 1) > DNA_SUM_TOLERANCE) {
    throw new Error(
      `Invalid ${label}: weights sum to ${sum.toFixed(4)}, expected ~1.0.`,
    );
  }
}

/**
 * Scales a DNA map's weights to sum to exactly 1.0 (ratios preserved),
 * dropping non-positive/non-finite entries. Dust removal only — maps
 * that are wildly off should be rejected via assertDnaSum, not laundered.
 */
export function normalizeDna(dna: BloodlineMap): BloodlineMap {
  const clean = Object.entries(dna || {}).filter(
    ([, weight]) => typeof weight === "number" && Number.isFinite(weight) && weight > 0,
  );
  const sum = clean.reduce((total, [, weight]) => total + weight, 0);
  if (!(sum > 0)) return {};
  const normalized: BloodlineMap = {};
  for (const [bloodline, weight] of clean) {
    normalized[bloodline] = weight / sum;
  }
  return normalized;
}

export function calculateColorFromDna(
  dna: BloodlineMap,
  colors: Record<string, string> = BLOODLINE_COLORS,
): string {
  let r = 0, g = 0, b = 0;
  const entries = Object.entries(dna);

  if (entries.length === 0) return colors["Unknown"] || BLOODLINE_COLORS["Unknown"];

  entries.forEach(([bloodline, weight]) => {
    const hex = (colors[bloodline] || colors["Unknown"] || BLOODLINE_COLORS["Unknown"]).replace('#', '');
    r += parseInt(hex.substring(0, 2), 16) * weight;
    g += parseInt(hex.substring(2, 4), 16) * weight;
    b += parseInt(hex.substring(4, 6), 16) * weight;
  });

  const toHex = (c: number) => Math.round(c).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Renames a bloodline inside a DNA map (slug-compared, so legacy casing
 * variants follow). Weights merge when `newName` already exists in the
 * same map. Returns the next map, or null when nothing matched.
 */
export function renameBloodlineInDna(
  dna: BloodlineMap,
  oldName: string,
  newName: string,
): BloodlineMap | null {
  const oldSlug = bloodlineSlug(oldName);
  let next: BloodlineMap | null = null;
  for (const key of Object.keys(dna || {})) {
    if (bloodlineSlug(key) === oldSlug && key !== newName) {
      next = next || { ...(dna || {}) };
      next[newName] = (next[newName] || 0) + next[key];
      delete next[key];
    }
  }
  return next;
}

/**
 * Renames a bloodline inside a family name (slug-compared per hyphen
 * part, so "Emberhoof-Frostmane" follows an "Emberhoof" rename while
 * preserving part order). Returns the next name, or undefined when
 * nothing matched.
 */
export function renameBloodlineInFamilyName(
  familyName: string | undefined | null,
  oldName: string,
  newName: string,
): string | undefined {
  if (typeof familyName !== "string") return undefined;
  const trimmed = familyName.trim();
  if (!trimmed) return undefined;
  const oldSlug = bloodlineSlug(oldName);
  const parts = trimmed.split("-").map((p) => p.trim());
  let changed = false;
  const nextParts = parts.map((part) =>
    bloodlineSlug(part) === oldSlug && part !== newName
      ? ((changed = true), newName)
      : part,
  );
  if (!changed) return undefined;
  return nextParts.join("-");
}

/** Pure/mixed/total reference counts for a bloodline (slug-compared). */
export interface BloodlineReferenceCounts {
  pure: number;
  mixed: number;
  total: number;
}

export function countBloodlineReferencesInList(
  horses: { dna?: BloodlineMap }[],
  name: string,
): BloodlineReferenceCounts {
  const slug = bloodlineSlug(name);
  let pure = 0;
  let mixed = 0;
  for (const h of horses) {
    const dnaKeys = Object.keys(h.dna || {});
    if (!dnaKeys.some((k) => bloodlineSlug(k) === slug)) continue;
    if (dnaKeys.length === 1) pure += 1;
    else mixed += 1;
  }
  return { pure, mixed, total: pure + mixed };
}

/** Minimum DNA weight for a bloodline to appear in a surname. */
export const SURNAME_INCLUSION_THRESHOLD = 0.15;

/**
 * Canonical registry name for a founder's surname (slug-compared, so
 * "longbottom" resolves to "Longbottom"), or undefined when it matches
 * nothing usable. Used as originBlood for parentless horses so a linked
 * surname seeds DNA instead of falling back to Unknown. Blank, Unknown,
 * and unmatched names all resolve to undefined (Unknown fallback).
 */
export function resolveOriginBlood(
  familyName: string | undefined | null,
  colors: Record<string, string>,
): string | undefined {
  const trimmed = (familyName || "").trim();
  if (!trimmed || bloodlineSlug(trimmed) === "unknown") return undefined;
  const slug = bloodlineSlug(trimmed);
  return Object.keys(colors || {}).find((name) => bloodlineSlug(name) === slug);
}
/** Max bloodlines joined into a surname. */
const SURNAME_MAX_PARTS = 2;

/**
 * Derives a family surname from DNA: the top bloodlines by weight,
 * hyphenated in descending weight order (e.g. "Emberhoof-Frostmane").
 * Only bloodlines at or above SURNAME_INCLUSION_THRESHOLD qualify.
 * Equal weights order alphabetically (A–Z) for determinism — the
 * sire/dam slot never decides the order.
 */
export function getSurnameFromDna(dna: BloodlineMap): string {
  const qualifying = Object.entries(dna || {})
    .filter(([, weight]) => typeof weight === "number" && weight >= SURNAME_INCLUSION_THRESHOLD)
    .sort(([nameA, a], [nameB, b]) => b - a || nameA.localeCompare(nameB));

  if (qualifying.length === 0) return "Unknown";

  const parts = qualifying.slice(0, SURNAME_MAX_PARTS).map(([name]) => name);

  return parts.join("-");
}

export type PurityTierKey =
  | "purebred"
  | "highblood"
  | "crossbred"
  | "mixed"
  | "unknown";

export interface PurityTier {
  key: PurityTierKey;
  /** Display label, e.g. "of House Emberhoof", "Emberhoof-blooded". */
  label: string;
  /** Dominant bloodline name ("" when unknown). */
  bloodline: string;
  /** Dominant bloodline weight 0–1. */
  share: number;
}

/** Float tolerance so near-pure lines (e.g. 0.9999999) count as 100%. */
const PUREBRED_EPSILON = 1e-6;

/**
 * Classifies DNA into a purity tier by the dominant bloodline's share.
 * Display-only companion to getSurnameFromDna — computed on the fly,
 * never stored.
 */
export function getPurityTier(dna: BloodlineMap): PurityTier {
  const entries = Object.entries(dna || {}).sort(([, a], [, b]) => b - a);
  const [bloodline, share] = entries[0] ?? ["", 0];

  if (!bloodline || bloodline === "Unknown" || !(share > 0)) {
    return { key: "unknown", label: "Unknown blood", bloodline: "", share: 0 };
  }
  if (share >= 1 - PUREBRED_EPSILON) {
    return { key: "purebred", label: `of House ${bloodline}`, bloodline, share };
  }
  if (share >= 0.75) {
    return { key: "highblood", label: `${bloodline}-blooded`, bloodline, share };
  }
  if (share >= 0.5) {
    return {
      key: "crossbred",
      label: `${bloodline} Crossbred · mixed`,
      bloodline,
      share,
    };
  }
  return { key: "mixed", label: "Hybrid", bloodline, share };
}