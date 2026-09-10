export interface SplitName {
  firstName: string;
  /** Always "" — family names come from DNA, never parsed from strings. */
  familyName: string;
}

/**
 * Splits a legacy single-`name` string. Single-word names become the
 * first name as-is; multi-word names keep everything except the last
 * token (assumed an ad-hoc surname, superseded by the DNA surname).
 */
export function splitLegacyName(name: unknown): SplitName {
  const tokens = String(name ?? "").trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return { firstName: "Unknown", familyName: "" };
  if (tokens.length === 1) return { firstName: tokens[0], familyName: "" };
  return { firstName: tokens.slice(0, -1).join(" "), familyName: "" };
}

export function getHorseFullName(horse: {
  firstName?: string;
  familyName?: string;
}): string {
  const first = (horse.firstName || "").trim();
  const family = (horse.familyName || "").trim();
  if (first && family) return `${first} ${family}`;
  return first || family || "Unknown";
}
