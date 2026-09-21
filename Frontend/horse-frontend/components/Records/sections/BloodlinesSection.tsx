import Link from "next/link";
import { vars } from "@/styles/theme.css";
import { FALLBACK_HEX_COLOR } from "@/utils/bloodlineValidation";
import {
  ChartCard,
  StackedArea,
} from "@/components/Charts/Charts";
import * as chartStyles from "@/components/Charts/Charts.css";
import {
  FounderCard,
  PurityCard,
} from "@/components/Records/InsightSections";
import type { RecordsModel } from "../useRecordsModel";

type Props = Pick<
  RecordsModel,
  | "filtered"
  | "herdShares"
  | "diversity"
  | "herdTotal"
  | "genShares"
  | "legacy"
  | "purityPts"
  | "champions"
  | "colors"
  | "nameOf"
>;

export function BloodlinesSection({
  filtered,
  herdShares,
  diversity,
  herdTotal,
  genShares,
  legacy,
  purityPts,
  champions,
  colors,
  nameOf,
}: Props) {
  return (
    <>
      <div className={chartStyles.chartGrid} style={{ marginTop: 24 }}>
        <ChartCard title="Bloodline Diversity">
          {filtered.length > 0 ? (
            <div>
              <p style={{ margin: "0 0 8px", fontSize: 20, fontFamily: vars.font.display }}>
                {diversity.effective.toFixed(1)} effective bloodlines
              </p>
              <p className={chartStyles.mutedNote} style={{ margin: "0 0 8px" }}>
                Think of it as: if the herd were split evenly, how many
                bloodlines would it feel like? 1.0 means a single-bloodline
                herd; {herdShares.length} (your bloodline count) would mean a
                perfectly even split. Shannon {diversity.shannon.toFixed(2)}{" "}
                nats is the evenness score behind it — higher is more balanced.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                {herdShares.map((s) => {
                  const pct = herdTotal > 0 ? (s.total / herdTotal) * 100 : 0;
                  return (
                    <div key={s.bloodline} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                      <span
                        style={{
                          display: "inline-block",
                          width: 12,
                          height: 12,
                          borderRadius: 3,
                          backgroundColor: colors[s.bloodline] || FALLBACK_HEX_COLOR,
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ minWidth: 110, fontWeight: 700 }}>{s.bloodline}</span>
                      <span
                        style={{
                          display: "block",
                          height: 8,
                          flex: 1,
                          backgroundColor: vars.color.parchmentDeep,
                          borderRadius: 9999,
                          overflow: "hidden",
                        }}
                      >
                        <span
                          style={{
                            display: "block",
                            height: "100%",
                            width: `${pct}%`,
                            backgroundColor: colors[s.bloodline] || FALLBACK_HEX_COLOR,
                            borderRadius: 9999,
                          }}
                        />
                      </span>
                      <span style={{ minWidth: 44, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className={chartStyles.mutedNote} style={{ margin: 0 }}>
                Bottleneck meter: largest share{" "}
                {(diversity.topShare * 100).toFixed(1)}%
                {diversity.topShare > 0.6
                  ? " — one bloodline dominates; outcross to widen the gene pool."
                  : diversity.topShare > 0.45
                    ? " — one bloodline is pulling ahead; watch the next generations."
                    : " — no bottleneck; the gene pool looks healthy."}{" "}
                Bias-corrected (Miller-Madow): {diversity.effectiveMM.toFixed(1)} effective
                across {diversity.richness} bloodlines.
              </p>
            </div>
          ) : (
            <p className={chartStyles.statusNote}>No horses yet.</p>
          )}
        </ChartCard>
        <ChartCard title="Market Share by Generation">
          <p className={chartStyles.mutedNote} style={{ margin: 0 }}>
            Which bloodlines own each generation — watch lines rise toward
            dominance or fade out over time.
          </p>
          <StackedArea data={genShares} colors={colors} />
        </ChartCard>
      </div>

      <div className={chartStyles.chartGrid}>
        <FounderCard rows={legacy} nameOf={nameOf} />
        <PurityCard points={purityPts} />
      </div>

      <ChartCard title="Bloodline Champions — best of each line">
        <p className={chartStyles.mutedNote} style={{ margin: 0 }}>
          Which line owns which trait — your outcrossing guide.
        </p>
        {champions.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table className={chartStyles.ledgerTable}>
              <thead>
                <tr>
                  <th className={chartStyles.ledgerTh}>Bloodline</th>
                  <th className={chartStyles.ledgerTh}>⚡ Speed</th>
                  <th className={chartStyles.ledgerTh}>🐎 Jump</th>
                  <th className={chartStyles.ledgerTh}>❤ Health</th>
                </tr>
              </thead>
              <tbody>
                {champions.map((c) => (
                  <tr key={c.bloodline}>
                    <td className={chartStyles.ledgerTd}>
                      <span
                        style={{
                          display: "inline-block",
                          width: 10,
                          height: 10,
                          borderRadius: 3,
                          backgroundColor: colors[c.bloodline] || FALLBACK_HEX_COLOR,
                          marginRight: 6,
                        }}
                      />
                      {c.bloodline}
                    </td>
                    <td className={chartStyles.ledgerTd}>
                      {c.speed ? <><Link href={`/horses/${c.speed.id}`} className={chartStyles.ledgerLink}>{nameOf(c.speed.id)}</Link> · {c.speed.value.toFixed(2)}</> : "—"}
                    </td>
                    <td className={chartStyles.ledgerTd}>
                      {c.jump ? <><Link href={`/horses/${c.jump.id}`} className={chartStyles.ledgerLink}>{nameOf(c.jump.id)}</Link> · {c.jump.value.toFixed(2)}</> : "—"}
                    </td>
                    <td className={chartStyles.ledgerTd}>
                      {c.health ? <><Link href={`/horses/${c.health.id}`} className={chartStyles.ledgerLink}>{nameOf(c.health.id)}</Link> · {c.health.value.toFixed(1)}</> : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={chartStyles.statusNote}>No horses yet.</p>
        )}
      </ChartCard>
    </>
  );
}
