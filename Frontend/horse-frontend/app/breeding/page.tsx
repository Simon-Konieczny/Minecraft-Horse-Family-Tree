import { getAllHorses } from "@/lib/horses";
import { getBloodlineColors } from "@/lib/bloodlines";
import { getBreedingSettings } from "@/lib/breedingSettings";
import { pairOutcomes, planSequentialPairings } from "@/utils/analytics";
import { getActiveHerd } from "@/utils/activeHerd";
import { ChapterHeading, Folio } from "@/components/Book/Book";
import BreedingBoard from "@/components/Breeding/BreedingBoard";
import StableBoard from "@/components/Stable/StableBoard";

export const dynamic = "force-dynamic";

export default async function BreedingPage() {
  const [horses, colors, settings] = await Promise.all([
    getAllHorses(),
    getBloodlineColors(),
    getBreedingSettings(),
  ]);

  // Active-herd policy: top-63 speed UNION top-16 jump UNION top-16
  // health (living only). Slow jump/health keepers stay active — they
  // are never auto-retired for missing the speed cut.
  const herd = getActiveHerd(horses);
  // Pair the active set exclusively, fastest-first (1st×2nd, 3rd×4th,
  // …); slowest active is benched when the pool is odd. Deceased,
  // Retired, and pastured horses sit out (no toggle).
  const { pairs, benched } = planSequentialPairings(herd.active, {
    allowCloseRelativeBreeding: settings.allowCloseRelativeBreeding,
    limit: 40,
  });
  const triedKeys = pairOutcomes(horses).map((p) =>
    [p.parentId1, p.parentId2].sort().join("|||"),
  );
  const keeperIds = [...herd.reasons.entries()]
    .filter(([, r]) => !r.speed && (r.jump || r.health))
    .map(([id]) => id);

  return (
    <main style={{ padding: 24, maxWidth: 960 }}>
      <ChapterHeading
        numeral="Chapter V"
        title="Breeding Planner"
        subtitle={`Active ${herd.counts.active} (top-63 speed ∪ top-16 jump/health) — fastest × 2nd, 3rd × 4th, … — slowest benched if odd. ${herd.counts.pastured} pastured.`}
      />
      <BreedingBoard
        horses={horses}
        colors={colors}
        pairs={pairs}
        benched={benched}
        triedKeys={triedKeys}
        policyBlocksRelatives={!settings.allowCloseRelativeBreeding}
        herdSummary={{
          active: herd.counts.active,
          pastured: herd.counts.pastured,
          cuts: herd.cuts,
          keeperCount: keeperIds.length,
        }}
        keeperIds={keeperIds}
      />
      <div style={{ marginTop: 24 }}>
        <StableBoard horses={horses} />
      </div>
      <Folio text="Chapter V · Breeding Planner" />
    </main>
  );
}
