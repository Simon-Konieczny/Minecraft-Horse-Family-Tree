import { getAllHorses } from "@/lib/horses";
import { getBloodlineColors } from "@/lib/bloodlines";
import { getBreedingSettings } from "@/lib/breedingSettings";
import { pairOutcomes, planSequentialPairings } from "@/utils/analytics";
import { ChapterHeading, Folio } from "@/components/Book/Book";
import BreedingBoard from "@/components/Breeding/BreedingBoard";

export const dynamic = "force-dynamic";

export default async function BreedingPage() {
  const [horses, colors, settings] = await Promise.all([
    getAllHorses(),
    getBloodlineColors(),
    getBreedingSettings(),
  ]);

  // Strict exclusive plan: sort Alive horses fastest-first, pair 1st×2nd,
  // 3rd×4th, …; slowest is benched when the pool is odd. Deceased and
  // Retired sit out (Alive-only, no toggle).
  const { pairs, benched } = planSequentialPairings(horses, {
    allowCloseRelativeBreeding: settings.allowCloseRelativeBreeding,
  });
  const triedKeys = pairOutcomes(horses).map((p) =>
    [p.parentId1, p.parentId2].sort().join("|||"),
  );

  return (
    <main style={{ padding: 24, maxWidth: 960 }}>
      <ChapterHeading
        numeral="Chapter V"
        title="Breeding Planner"
        subtitle="Strict order: fastest × 2nd, 3rd × 4th, … — slowest benched if odd."
      />
      <BreedingBoard
        horses={horses}
        colors={colors}
        pairs={pairs}
        benched={benched}
        triedKeys={triedKeys}
        policyBlocksRelatives={!settings.allowCloseRelativeBreeding}
      />
      <Folio text="Chapter V · Breeding Planner" />
    </main>
  );
}
