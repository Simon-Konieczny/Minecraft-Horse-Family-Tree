import type { Horse } from "@/types/horse";
import { getHorseFullName } from "@/utils/horseNames";
import { effectiveFamilies } from "@/utils/studbook";
import { translateStat } from "@/utils/translateRawStats";

export type SearchStatField = "speed" | "jump" | "health";
export type SearchOperator = ">" | ">=" | "<" | "<=" | "=" | ":";

export interface StatSearchToken {
  kind: "stat";
  field: SearchStatField;
  op: SearchOperator;
  value: number;
}

export interface GenSearchToken {
  kind: "gen";
  op: SearchOperator;
  value: number;
}

export interface TextSearchToken {
  kind: "text";
  /** Lowercased, trimmed token. */
  value: string;
}

export type SearchToken = StatSearchToken | GenSearchToken | TextSearchToken;

export type SearchMatchKind = "name" | "family" | "generation" | "status" | "stat";

export interface RankedHit<T = Horse> {
  horse: T;
  score: number;
  matchedOn: SearchMatchKind[];
}

/** Tolerance for `=`/`:` display-unit equality (half a displayed hundredth). */
const STAT_EQUALITY_EPSILON = 0.005;

type SearchableHorse = Pick<
  Horse,
  "id" | "firstName" | "familyName" | "dna" | "status" | "generation" | "speed" | "jump" | "health"
>;

const STAT_ALIASES: Record<string, SearchStatField> = {
  speed: "speed",
  spd: "speed",
  jump: "jump",
  jmp: "jump",
  health: "health",
  hp: "health",
};

// e.g. "speed>12", "jump >= 3.5", "hp:10", "gen:2", "g3" handled separately.
const OPERATOR_PATTERN =
  /^(speed|spd|jump|jmp|health|hp|gen|generation)\s*(>=|<=|>|<|=|:)\s*(-?\d+(?:\.\d+)?)$/i;
const SHORTHAND_GEN_PATTERN = /^g(\d+)$/i;

function compareWithOp(actual: number, op: SearchOperator, expected: number): boolean {
  switch (op) {
    case ">":
      return actual > expected;
    case ">=":
      return actual >= expected;
    case "<":
      return actual < expected;
    case "<=":
      return actual <= expected;
    case "=":
    case ":":
      return Math.abs(actual - expected) <= STAT_EQUALITY_EPSILON;
  }
}

/**
 * Splits a raw query on whitespace into typed tokens. Unknown
 * `field-op-value` shapes (e.g. `color>3`) fall back to plain text so a
 * typo narrows to nothing instead of throwing.
 */
export function parseSearchQuery(query: string): SearchToken[] {
  const tokens: SearchToken[] = [];
  for (const raw of (query || "").trim().split(/\s+/)) {
    if (!raw) continue;
    const opMatch = OPERATOR_PATTERN.exec(raw);
    if (opMatch) {
      const field = opMatch[1].toLowerCase();
      const op = opMatch[2] as SearchOperator;
      const value = Number(opMatch[3]);
      if (!Number.isFinite(value)) {
        tokens.push({ kind: "text", value: raw.toLowerCase() });
        continue;
      }
      if (field === "gen" || field === "generation") {
        tokens.push({ kind: "gen", op, value });
      } else {
        tokens.push({ kind: "stat", field: STAT_ALIASES[field], op, value });
      }
      continue;
    }
    const genShorthand = SHORTHAND_GEN_PATTERN.exec(raw);
    if (genShorthand) {
      tokens.push({ kind: "gen", op: "=", value: Number(genShorthand[1]) });
      continue;
    }
    tokens.push({ kind: "text", value: raw.toLowerCase() });
  }
  return tokens;
}

function displayStat(horse: SearchableHorse, field: SearchStatField): number {
  const raw = horse[field];
  if (typeof raw !== "number" || !Number.isFinite(raw)) return NaN;
  return translateStat(field, raw);
}

function matchTextToken(
  horse: SearchableHorse,
  token: string,
  fullLower: string,
  firstLower: string,
  familyLower: string,
  familyPartsLower: string[],
  statusLower: string,
): { matched: boolean; score: number; kinds: SearchMatchKind[] } {
  const kinds = new Set<SearchMatchKind>();
  let score = 0;
  let matched = false;

  if (firstLower === token) {
    matched = true;
    score = Math.max(score, 3);
    kinds.add("name");
  }
  if (fullLower.includes(token)) {
    matched = true;
    score = Math.max(score, 2);
    kinds.add("name");
  }
  if (familyPartsLower.some((p) => p === token)) {
    matched = true;
    score = Math.max(score, 2);
    kinds.add("family");
  } else if (familyLower.includes(token)) {
    matched = true;
    score = Math.max(score, 1);
    kinds.add("family");
  }
  if (statusLower.includes(token) && token.length >= 3) {
    matched = true;
    score = Math.max(score, 1);
    kinds.add("status");
  }
  // A bare number doubles as a generation lookup ("3" finds Gen 3).
  if (/^\d+$/.test(token) && (horse.generation || 0) === Number(token)) {
    matched = true;
    score = Math.max(score, 1);
    kinds.add("generation");
  }
  return { matched, score, kinds: [...kinds] };
}

/**
 * AND-combined match of pre-parsed tokens against one horse. Returns the
 * relevance score (higher first) or null when any token misses.
 */
export function matchHorseTokens<T extends SearchableHorse>(
  horse: T,
  tokens: SearchToken[],
): { score: number; matchedOn: SearchMatchKind[] } | null {
  if (tokens.length === 0) return null;
  const fullLower = getHorseFullName(horse).toLowerCase();
  const firstLower = (horse.firstName || "").trim().toLowerCase();
  const familyLower = (horse.familyName || "").trim().toLowerCase();
  const familyPartsLower = effectiveFamilies(horse).map((f) => f.toLowerCase());
  const statusLower = String(horse.status || "").toLowerCase();

  let score = 0;
  const kinds = new Set<SearchMatchKind>();
  for (const token of tokens) {
    if (token.kind === "stat") {
      const actual = displayStat(horse, token.field);
      if (!Number.isFinite(actual) || !compareWithOp(actual, token.op, token.value)) {
        return null;
      }
      score += 1;
      kinds.add("stat");
    } else if (token.kind === "gen") {
      if (!compareWithOp(horse.generation || 0, token.op, token.value)) return null;
      score += 1;
      kinds.add("generation");
    } else {
      const hit = matchTextToken(
        horse,
        token.value,
        fullLower,
        firstLower,
        familyLower,
        familyPartsLower,
        statusLower,
      );
      if (!hit.matched) return null;
      score += hit.score;
      for (const k of hit.kinds) kinds.add(k);
    }
  }
  return { score, matchedOn: [...kinds] };
}

/** AND-combined match of a raw query string against one horse. */
export function matchesHorse<T extends SearchableHorse>(horse: T, query: string): boolean {
  const tokens = parseSearchQuery(query);
  if (tokens.length === 0) return true;
  return matchHorseTokens(horse, tokens) !== null;
}

/**
 * Ranked find over a herd (AND semantics, best first, alphabetical
 * tie-break). Empty queries return [] — the tree stays unfiltered.
 */
export function searchHorses<T extends SearchableHorse>(
  horses: T[],
  query: string,
  limit = 10,
): RankedHit<T>[] {
  const tokens = parseSearchQuery(query);
  if (tokens.length === 0) return [];
  const hits: RankedHit<T>[] = [];
  for (const horse of horses) {
    const match = matchHorseTokens(horse, tokens);
    if (match) hits.push({ horse, score: match.score, matchedOn: match.matchedOn });
  }
  hits.sort(
    (a, b) =>
      b.score - a.score ||
      getHorseFullName(a.horse).localeCompare(getHorseFullName(b.horse)) ||
      String(a.horse.id).localeCompare(String(b.horse.id)),
  );
  return hits.slice(0, Math.max(0, Math.floor(limit)));
}
