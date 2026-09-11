export interface HorseStats {
  speed: number;
  health: number;
  jump: number;
  variant: number;
  firstName?: string;
  familyName?: string;
}

// Contract: extract RAW numbers out of a pasted /summon command string
// only. Stat translation (raw <-> display) lives in translateRawStats.ts
// and color/pattern decoding lives in utils/variant.ts — do not
// reimplement either of them here.
//
// Accepts both the legacy attribute IDs ("minecraft:generic.*") and the
// current ones ("minecraft:*"). CustomName is split on the last space
// into first/family names (single word -> first name only).
export function parseHorseStats(raw: string): HorseStats | null {
  try {
    const get = (key: string) => {
      const match = raw.match(new RegExp(`(?:^|[{,\\s])${key}:\\s*([\\d.]+)`));
      return match ? parseFloat(match[1]) : null;
    };

    const getAttr = (name: string) => {
      const match = raw.match(
        new RegExp(`"minecraft:(?:generic\\.)?${name}",\\s*base:\\s*([\\d.]+)`),
      );
      return match ? parseFloat(match[1]) : null;
    };

    const speed = getAttr("movement_speed");
    const health = get("Health");
    const jump = getAttr("jump_strength");
    const variant = get("Variant");

    if (speed == null || health == null || jump == null || variant == null) {
      return null;
    }

    const result: HorseStats = { speed, health, jump, variant };

    const customName = parseCustomName(raw);
    if (customName) {
      const { firstName, familyName } = splitHorseName(customName);
      if (firstName) result.firstName = firstName;
      if (familyName) result.familyName = familyName;
    }

    return result;
  } catch {
    return null;
  }
}

/** Raw CustomName string from pasted NBT, or null when absent/unusable. */
function parseCustomName(raw: string): string | null {
  const match = raw.match(
    /CustomName:\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')/,
  );
  if (!match) return null;
  const quoted = match[1] ?? match[2] ?? "";
  const unescaped = quoted.replace(/\\(.)/g, "$1");
  const trimmed = unescaped.trim();
  if (!trimmed) return null;
  // Best-effort JSON text component: {"text": "Name", ...}
  if (trimmed.startsWith("{")) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        typeof (parsed as { text?: unknown }).text === "string"
      ) {
        const text = (parsed as { text: string }).text.trim();
        return text || null;
      }
      return null;
    } catch {
      return null;
    }
  }
  return trimmed;
}

/** Split "First ... Last" on the last space (single word -> first only). */
function splitHorseName(name: string): {
  firstName: string;
  familyName: string;
} {
  const collapsed = name.trim().replace(/\s+/g, " ");
  const lastSpace = collapsed.lastIndexOf(" ");
  if (lastSpace === -1) return { firstName: collapsed, familyName: "" };
  return {
    firstName: collapsed.slice(0, lastSpace),
    familyName: collapsed.slice(lastSpace + 1),
  };
}
