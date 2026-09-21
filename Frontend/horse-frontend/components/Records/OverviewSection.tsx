"use client";

import { ChartCard } from "@/components/Charts/Charts";
import { vars } from "@/styles/theme.css";
import * as chartStyles from "@/components/Charts/Charts.css";
import type { RecordsModel } from "./useRecordsModel";

type Props = Pick<
  RecordsModel,
  | "activeHerd"
  | "diversity"
  | "fame"
  | "unlockHints"
  | "crosses"
  | "inbredCount"
  | "presentCount"
  | "nameOf"
> & {
  onNavigate: (id: string) => void;
};

/**
 * KPI overview: the whole herd at a glance, each card jumping to its
 * section. This is the first thing on the page so the ledger reads
 * top-down instead of burying actionable content fifth.
 */
export function OverviewSection({
  activeHerd,
  diversity,
  fame,
  unlockHints,
  crosses,
  inbredCount,
  presentCount,
  nameOf,
  onNavigate,
}: Props) {
  const unlockable = unlockHints.filter((h) => h.examplePairs.length > 0).length;
  const actionableCrosses = crosses.filter(
    (c) => c.triedFoals === 0 && c.activePairs > 0,
  ).length;
  const fastest = fame?.speed;

  const kpis: {
    label: string;
    value: string;
    note: string;
    target: string;
  }[] = [
    {
      label: "Active herd",
      value: `${activeHerd.counts.active} active · ${activeHerd.counts.pastured} pastured`,
      note: "Top 63 speed ∪ top 16 jump/health",
      target: "breeding",
    },
    {
      label: "Gene pool",
      value: `${diversity.effectiveMM.toFixed(1)} effective bloodlines`,
      note: `Across ${diversity.richness} lines (bias-corrected)`,
      target: "bloodlines",
    },
    {
      label: "Fastest",
      value: fastest ? `${fastest.speed.toFixed(2)} m/s` : "—",
      note: fastest ? nameOf(fastest.horse.id) : "No horses yet",
      target: "performers",
    },
    {
      label: "Coats to unlock",
      value: `${unlockable} of 35`,
      note: `${presentCount} present in scope`,
      target: "census",
    },
    {
      label: "Untried crosses",
      value: `${actionableCrosses} with active pairs`,
      note: "Breeding opportunities right now",
      target: "breeding",
    },
    {
      label: "Inbred foals",
      value: `${inbredCount}`,
      note: inbredCount > 0 ? "Review pairings" : "Clean herd",
      target: "breeding",
    },
  ];

  return (
    <div className={chartStyles.chartGrid} style={{ marginTop: 16 }}>
      {kpis.map((kpi) => (
        <button
          key={kpi.label}
          type="button"
          onClick={() => onNavigate(kpi.target)}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            textAlign: "left",
            cursor: "pointer",
            font: "inherit",
          }}
          title={`Go to ${kpi.target}`}
        >
          <ChartCard title={kpi.label}>
            <p style={{ margin: 0, fontSize: 20, fontFamily: vars.font.display }}>
              {kpi.value}
            </p>
            <p className={chartStyles.mutedNote} style={{ margin: 0 }}>
              {kpi.note} →
            </p>
          </ChartCard>
        </button>
      ))}
    </div>
  );
}
