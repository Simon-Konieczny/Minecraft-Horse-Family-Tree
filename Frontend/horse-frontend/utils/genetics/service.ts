import { Horse } from "@/types/horse";
import { bloodlineSlug } from "@/utils/bloodlineValidation";
import { BLOODLINE_COLORS, assertDnaSum, calculateColorFromDna, mergeDna } from "./utils";

export function processNewHorseGenetics(
  sire: Horse | undefined,
  dam: Horse | undefined,
  originBlood?: string,
  colors: Record<string, string> = BLOODLINE_COLORS,
) {
  if (!sire || !dam) {
    let blood = originBlood || "Unknown";
    // Legacy remap, slug-compared like the rest of the registry so any
    // casing ("void born", "VOID BORN") still resolves.
    if (bloodlineSlug(blood) === "void born") blood = "Celestial Grass";

    const dna = { [blood]: 1.0 };
    return {
      dna,
      hexColor: colors[blood] || colors["Unknown"] || BLOODLINE_COLORS["Unknown"],
      generation: 0
    };
  }

  // Save-time gate: a stored (possibly hand-edited) parent map that
  // doesn't sum to ~1.0 must block the write, not poison descendants.
  if (sire) assertDnaSum(sire.dna, `sire "${sire.firstName}" DNA`);
  if (dam) assertDnaSum(dam.dna, `dam "${dam.firstName}" DNA`);

  const dna = mergeDna(sire.dna, dam.dna);
  const hexColor = calculateColorFromDna(dna, colors);
  const generation = Math.max(sire.generation, dam.generation) + 1;

  return { dna, hexColor, generation };
}
