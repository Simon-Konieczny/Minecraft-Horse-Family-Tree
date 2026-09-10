import { BloodlineMap } from "@/types/horse";

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
  const dna: BloodlineMap = {};
  const allKeys = new Set([...Object.keys(sireDna), ...Object.keys(damDna)]);

  allKeys.forEach((key) => {
    const val = ((sireDna[key] || 0) + (damDna[key] || 0)) / 2;
    if (val > 0) dna[key] = val;
  });

  return dna;
}

export function calculateColorFromDna(dna: BloodlineMap): string {  let r = 0, g = 0, b = 0;
  const entries = Object.entries(dna);
  
  if (entries.length === 0) return BLOODLINE_COLORS["Unknown"];

  entries.forEach(([bloodline, weight]) => {
    const hex = (BLOODLINE_COLORS[bloodline] || BLOODLINE_COLORS["Unknown"]).replace('#', '');
    r += parseInt(hex.substring(0, 2), 16) * weight;
    g += parseInt(hex.substring(2, 4), 16) * weight;
    b += parseInt(hex.substring(4, 6), 16) * weight;
  });

  const toHex = (c: number) => Math.round(c).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Minimum DNA weight for a bloodline to appear in a surname. */
export const SURNAME_INCLUSION_THRESHOLD = 0.15;
/** Weight gap below which two bloodlines count as tied (sire decides). */
const SURNAME_TIE_EPSILON = 0.02;
/** Max bloodlines joined into a surname. */
const SURNAME_MAX_PARTS = 2;

export interface SurnameContext {
  sireDna?: BloodlineMap;
  damDna?: BloodlineMap;
}

/**
 * Derives a family surname from DNA: the top bloodlines by weight,
 * hyphenated in descending order (e.g. "Emberhoof-Frostmane"). Only
 * bloodlines at or above SURNAME_INCLUSION_THRESHOLD qualify; near-ties
 * are ordered by the sire's line, then alphabetically for determinism.
 */
export function getSurnameFromDna(
  dna: BloodlineMap,
  context: SurnameContext = {},
): string {
  const qualifying = Object.entries(dna || {})
    .filter(([, weight]) => typeof weight === "number" && weight >= SURNAME_INCLUSION_THRESHOLD)
    .sort(([, a], [, b]) => b - a);

  if (qualifying.length === 0) return "Unknown";

  const parts = qualifying.slice(0, SURNAME_MAX_PARTS).map(([name]) => name);

  // Tie-break: if the top two are within epsilon, the bloodline heavier
  // in the sire's DNA orders first.
  if (
    parts.length === 2 &&
    Math.abs(qualifying[0][1] - qualifying[1][1]) < SURNAME_TIE_EPSILON
  ) {
    const sireDna = context.sireDna || {};
    const [first, second] = parts;
    const sireFirst = sireDna[first] || 0;
    const sireSecond = sireDna[second] || 0;
    if (sireSecond > sireFirst) {
      parts.reverse();
    } else if (sireSecond === sireFirst && second < first) {
      parts.reverse();
    }
  }

  return parts.join("-");
}