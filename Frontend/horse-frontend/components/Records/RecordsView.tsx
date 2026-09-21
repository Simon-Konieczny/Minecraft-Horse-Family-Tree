"use client";

import type { Horse } from "@/types/horse";
import { ChapterHeading, Folio } from "@/components/Book/Book";
import GenerationScopeBar from "@/components/Common/GenerationScopeBar/GenerationScopeBar";
import { useRecordsModel } from "./useRecordsModel";
import { DistributionsSection } from "./sections/DistributionsSection";
import { ProgressionSection } from "./sections/ProgressionSection";
import { BloodlinesSection } from "./sections/BloodlinesSection";
import { TopPerformersSection } from "./sections/TopPerformersSection";
import { BreedingInsightSection } from "./sections/BreedingInsightSection";
import { CensusSection } from "./sections/CensusSection";

export default function RecordsView({
  horses,
  colors,
}: {
  horses: Horse[];
  colors: Record<string, string>;
}) {
  const model = useRecordsModel(horses, colors);

  return (
    <main style={{ padding: 24, maxWidth: 960 }}>
      <ChapterHeading
        numeral="Chapter IV"
        title="Records"
        subtitle="Distributions, progression, and top performers across the herd."
      />

      <GenerationScopeBar
        generations={model.genOptions}
        value={model.scope}
        inScopeCount={model.filtered.length}
        totalCount={horses.length}
        onChange={model.handleScopeChange}
        onReset={model.resetScope}
      />

      <DistributionsSection
        histograms={model.histograms}
        scatter={model.scatter}
        scatterAvg={model.scatterAvg}
        correlations={model.correlations}
        corrPoints={model.corrPoints}
        withinGenCorrelations={model.withinGenCorrelations}
      />

      <ProgressionSection
        trends={model.trends}
        bestByGen={model.bestByGen}
        variancePts={model.variancePts}
        deltas={model.deltas}
        recByGen={model.recByGen}
        nameOf={model.nameOf}
      />

      <BloodlinesSection
        filtered={model.filtered}
        herdShares={model.herdShares}
        diversity={model.diversity}
        herdTotal={model.herdTotal}
        genShares={model.genShares}
        legacy={model.legacy}
        purityPts={model.purityPts}
        champions={model.champions}
        colors={colors}
        nameOf={model.nameOf}
      />

      <TopPerformersSection
        filtered={model.filtered}
        fame={model.fame}
        godRoll={model.godRoll}
        nameOf={model.nameOf}
      />

      <BreedingInsightSection
        activeHerd={model.activeHerd}
        bubble={model.bubble}
        crosses={model.crosses}
        reliability={model.reliability}
        unlockHints={model.unlockHints}
        heritability={model.heritability}
        inbredRanks={model.inbredRanks}
        inbredCount={model.inbredCount}
        inbreedSplit={model.inbreedSplit}
        prolific={model.prolific}
        pairs={model.pairs}
        rangeFor={model.rangeFor}
        pastureGroupOf={model.pastureGroupOf}
        speedOf={model.speedOf}
        colors={colors}
        nameOf={model.nameOf}
      />

      <CensusSection
        filtered={model.filtered}
        fullVariants={model.fullVariants}
        presentCount={model.presentCount}
        rarest={model.rarest}
        colors={colors}
        pyramid={model.pyramid}
        lineage={model.lineage}
        filteredIds={model.filteredIds}
        deadAlive={model.deadAlive}
        nameOf={model.nameOf}
        crosstab={model.crosstab}
        crosstabShares={model.crosstabShares}
      />

      <Folio text="Chapter IV · Records" />
    </main>
  );
}
