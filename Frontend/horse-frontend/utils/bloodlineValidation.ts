export interface BloodlineInput {
  name: string;
  hexColor: string;
}

export interface CleanBloodlineInput {
  name: string;
  hexColor: string;
}

export function bloodlineSlug(name: string): string {
  return name.trim().toLowerCase();
}

export function isValidHex(hex: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(hex);
}

/** Fallback swatch when a bloodline has no registered color. */
export const FALLBACK_HEX_COLOR = "#94a3b8";

/**
 * Normalizes a typed hex draft for the strict #rrggbb registry format:
 * trims whitespace and uppercases. Returns the normalized value when it
 * is submittable, otherwise null (held locally, never saved).
 */
export function normalizeHexInput(draft: string): string | null {
  const normalized = draft.trim().toUpperCase();
  return isValidHex(normalized) ? normalized : null;
}

/**
 * Shared add/edit validation (pure, unit-tested). Returns trimmed values.
 * Uniqueness is checked against the DB by the caller.
 */
export function validateBloodlineInput(
  input: BloodlineInput,
): CleanBloodlineInput {
  const name = input.name?.trim();
  if (!name) throw new Error("Bloodline name is required.");
  if (name.includes(".") || name.includes("$")) {
    throw new Error('Bloodline names cannot contain "." or "$".');
  }
  if (!isValidHex(input.hexColor || "")) {
    throw new Error(`"${input.hexColor}" is not a valid #rrggbb color.`);
  }
  return { name, hexColor: input.hexColor };
}
