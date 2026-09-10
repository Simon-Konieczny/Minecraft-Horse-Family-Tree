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
