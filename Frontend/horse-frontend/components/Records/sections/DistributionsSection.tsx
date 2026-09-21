import {
  ChartCard,
  ScatterPlot,
  VerticalHistogram,
} from "@/components/Charts/Charts";
import * as chartStyles from "@/components/Charts/Charts.css";
import CollapsibleSection from "@/components/Records/CollapsibleSection";
import type { RecordsModel } from "../useRecordsModel";

type Props = Pick<
  RecordsModel,
  "histograms" | "scatter" | "scatterAvg" | "correlations" | "corrPoints"
>;

export function DistributionsSection({
  histograms,
  scatter,
  scatterAvg,
  correlations,
  corrPoints,
}: Props) {
  return (
    <CollapsibleSection title="Distributions" count={histograms.length + 3} defaultOpen>
      <div className={chartStyles.chartGrid}>
        {histograms.map((h) => (
          <ChartCard key={h.label} title={`${h.label} Distribution`}>
            <p className={chartStyles.mutedNote} style={{ margin: 0 }}>
              {h.label} ({h.unit}) along the bottom, horse count going up.
            </p>
            <VerticalHistogram bins={h.bins} />
          </ChartCard>
        ))}
      </div>

      <ChartCard title="Speed vs Jump">
        <p className={chartStyles.mutedNote} style={{ margin: 0 }}>
          Each dot is a horse, colored by dominant bloodline. Dashed lines
          mark the herd averages — horses upper-right are fast AND jumpy.
        </p>
        <ScatterPlot
          points={scatter}
          xLabel="Speed (m/s)"
          yLabel="Jump (blocks)"
          xDecimals={2}
          yDecimals={2}
          avgX={scatterAvg?.x ?? null}
          avgY={scatterAvg?.y ?? null}
        />
      </ChartCard>

      <div className={chartStyles.chartGrid} style={{ marginTop: 24 }}>
        <ChartCard title={`Speed × Health — r = ${correlations.speedHealth.toFixed(2)} (n=${correlations.n})`}>
          <p className={chartStyles.mutedNote} style={{ margin: 0 }}>
            {correlations.speedHealth > 0.5
              ? "Strong positive — fast horses tend to be tough too."
              : correlations.speedHealth < -0.5
                ? "Strong trade-off — selecting for speed costs health."
                : "Weak link — speed and health breed mostly independently."}
          </p>
          <ScatterPlot points={corrPoints.speedHealth} xLabel="Speed (m/s)" yLabel="Health (hp)" xDecimals={2} yDecimals={1} />
        </ChartCard>
        <ChartCard title={`Jump × Health — r = ${correlations.jumpHealth.toFixed(2)} (n=${correlations.n})`}>
          <p className={chartStyles.mutedNote} style={{ margin: 0 }}>
            Speed × Jump r = {correlations.speedJump.toFixed(2)} (see chart above).{" "}
            {correlations.jumpHealth > 0.5
              ? "Strong positive — springy horses tend to be tough too."
              : correlations.jumpHealth < -0.5
                ? "Strong trade-off — selecting for jump costs health."
                : "Weak link — jump and health breed mostly independently."}
          </p>
          <ScatterPlot points={corrPoints.jumpHealth} xLabel="Jump (blocks)" yLabel="Health (hp)" xDecimals={2} yDecimals={1} />
        </ChartCard>
      </div>
    </CollapsibleSection>
  );
}
