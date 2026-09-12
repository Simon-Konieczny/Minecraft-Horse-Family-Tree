import { getAllHorses } from "@/lib/horses";
import { getBloodlineColors } from "@/lib/bloodlines";
import { getBreedingSettings } from "@/lib/breedingSettings";
import { pairOutcomes, rankPairsBySpeed } from "@/utils/analytics";
import { ChapterHeading, Folio } from "@/components/Book/Book";
import PairingPlanner from "@/components/Breeding/PairingPlanner";

export const dynamic = "force-dynamic";

/** Top-N pairs pre-ranked server-side; the client only filters/slices. */
const PRE_RANK_LIMIT = 300;

export default async function BreedingPage() {
  const [horses, colors, settings] = await Promise.all([
    getAllHorses(),
    getBloodlineColors(),
    getBreedingSettings(),
  ]);

  const ranked = rankPairsBySpeed(horses, {
    allowCloseRelativeBreeding: settings.allowCloseRelativeBreeding,
    // Rank with Retired included so the client toggle can reveal them
    // without a round-trip; Deceased are still excluded at the source.
    includeRetired: true,
    limit: PRE_RANK_LIMIT,
  });
  const triedKeys = pairOutcomes(horses).map((p) =>
    [p.parentId1, p.parentId2].sort().join("|||"),
  );

  return (
    <main style={{ padding: 24, maxWidth: 960 }}>
      <ChapterHeading
        numeral="Chapter V"
        title="Breeding Planner"
        subtitle="Every eligible pair ranked by predicted foal speed — fastest midpoint first."
      />
      <PairingPlanner
        horses={horses}
        colors={colors}
        initialPairs={ranked}
        triedKeys={triedKeys}
        policyBlocksRelatives={!settings.allowCloseRelativeBreeding}
      />
      <Folio text="Chapter V · Breeding Planner" />
    </main>
  );
}
