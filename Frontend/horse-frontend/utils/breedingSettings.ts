/**
 * Breeding policy flags (server-side).
 *
 * The priority is fastest-horse-first breeding, so close-relative
 * pairings (siblings, parent-child, shared blood within N generations)
 * are ALLOWED by default. Flip `ALLOW_CLOSE_RELATIVE_BREEDING=false`
 * (e.g. for a "clean lineage" event or competitive bracket) to reject
 * them in the create/edit server actions instead.
 *
 * Loop protection (a horse parented to itself or its own descendant) is
 * separate, lives in `utils/lineage.ts#validateParents`, and stays
 * hard-blocked regardless of these flags.
 */

function parseEnvInt(raw: string | undefined, fallback: number): number {
  const n = parseInt(raw ?? "", 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export const breedingSettings = {
  /** Default true. Set ALLOW_CLOSE_RELATIVE_BREEDING=false to block. */
  allowCloseRelativeBreeding:
    (process.env.ALLOW_CLOSE_RELATIVE_BREEDING ?? "true").toLowerCase() !==
    "false",
  /** Generations back the inbreeding buffer looks. Default 3. */
  inbreedingGenerations: parseEnvInt(process.env.INBREEDING_GENERATIONS, 3),
  /** Shared ancestors within the buffer that trigger rejection. Default 1 (any overlap). */
  inbreedingAncestorThreshold: parseEnvInt(
    process.env.INBREEDING_ANCESTOR_THRESHOLD,
    1,
  ),
};

export type BreedingSettings = typeof breedingSettings;
