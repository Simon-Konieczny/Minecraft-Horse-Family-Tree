"use client";

import { useState } from "react";
import type { Horse } from "@/types/horse";
import { ChapterHeading, Folio } from "@/components/Book/Book";
import * as chartStyles from "@/components/Charts/Charts.css";
import GenerationScopeBar from "@/components/Common/GenerationScopeBar/GenerationScopeBar";
import CollapsibleSection from "./CollapsibleSection";
import { RecordsMiniNav } from "./RecordsMiniNav";
import { OverviewSection } from "./OverviewSection";
import { useRecordsModel } from "./useRecordsModel";
import { DistributionsSection } from "./sections/DistributionsSection";
import { ProgressionSection } from "./sections/ProgressionSection";
import { BloodlinesSection } from "./sections/BloodlinesSection";
import { TopPerformersSection } from "./sections/TopPerformersSection";
import { BreedingInsightSection } from "./sections/BreedingInsightSection";
import { CensusSection } from "./sections/CensusSection";

type SectionId =
  | "distributions"
  | "progression"
  | "bloodlines"
  | "performers"
  | "breeding"
  | "census";

export default function RecordsView({
  horses,
  colors,
}: {
  horses: Horse[];
  colors: Record<string, string>;
}) {
  const model = useRecordsModel(horses, colors);
  const [openMap, setOpenMap] = useState<Record<SectionId, boolean>>({
    distributions: true,
    progression: true,
    bloodlines: true,
    performers: false,
    breeding: true,
    census: false,
  });

  const sections: {
    id: SectionId;
    title: string;
    count: number;
  }[] = [
    { id: "distributions", title: "Distributions", count: model.histograms.length + 3 },
    {
      id: "progression",
      title: "Progression",
      count: model.trends.length * 2 + model.deltas.length + model.recByGen.length,
    },
    {
      id: "bloodlines",
      title: "Bloodlines",
      count:
        model.herdShares.length +
        model.genShares.length +
        model.legacy.length +
        model.champions.length,
    },
    { id: "performers", title: "Top performers", count: model.filtered.length },
    {
      id: "breeding",
      title: "Breeding insight",
      count:
        model.activeHerd.counts.active +
        model.bubble.speed.length +
        model.bubble.jump.length +
        model.bubble.health.length,
    },
    { id: "census", title: "Census", count: model.filtered.length },
  ];

  const navigate = (id: string) => {
    const section = sections.find((s) => s.id === id);
    if (section) {
      setOpenMap((prev) => ({ ...prev, [section.id]: true }));
    }
    // Expand first so the anchor exists, then jump to it.
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };
  const expandAll = () =>
    setOpenMap({
      distributions: true,
      progression: true,
      bloodlines: true,
      performers: true,
      breeding: true,
      census: true,
    });
  const collapseAll = () =>
    setOpenMap({
      distributions: false,
      progression: false,
      bloodlines: false,
      performers: false,
      breeding: false,
      census: false,
    });

  const wrap = (id: SectionId, children: React.ReactNode) => {
    const section = sections.find((s) => s.id === id)!;
    return (
      <CollapsibleSection
        id={id}
        title={section.title}
        count={section.count}
        open={openMap[id]}
        onToggle={() => setOpenMap((prev) => ({ ...prev, [id]: !prev[id] }))}
      >
        {children}
      </CollapsibleSection>
    );
  };

  return (
    <main className={chartStyles.recordsMain}>
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

      <RecordsMiniNav
        sections={sections.map((s) => ({ ...s, open: openMap[s.id] }))}
        onNavigate={navigate}
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
      />

      <OverviewSection
        activeHerd={model.activeHerd}
        diversity={model.diversity}
        fame={model.fame}
        unlockHints={model.unlockHints}
        crosses={model.crosses}
        inbredCount={model.inbredCount}
        presentCount={model.presentCount}
        nameOf={model.nameOf}
        onNavigate={navigate}
      />

      {wrap(
        "distributions",
        <DistributionsSection
          histograms={model.histograms}
          scatter={model.scatter}
          scatterAvg={model.scatterAvg}
          correlations={model.correlations}
          corrPoints={model.corrPoints}
          withinGenCorrelations={model.withinGenCorrelations}
        />,
      )}

      {wrap(
        "progression",
        <ProgressionSection
          trends={model.trends}
          bestByGen={model.bestByGen}
          variancePts={model.variancePts}
          deltas={model.deltas}
          recByGen={model.recByGen}
          nameOf={model.nameOf}
        />,
      )}

      {wrap(
        "bloodlines",
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
        />,
      )}

      {wrap(
        "performers",
        <TopPerformersSection
          filtered={model.filtered}
          fame={model.fame}
          godRoll={model.godRoll}
          nameOf={model.nameOf}
        />,
      )}

      {wrap(
        "breeding",
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
        />,
      )}

      {wrap(
        "census",
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
        />,
      )}

      <Folio text="Chapter IV · Records" />
    </main>
  );
}
