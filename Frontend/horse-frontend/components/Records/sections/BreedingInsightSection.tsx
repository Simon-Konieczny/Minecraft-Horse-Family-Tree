import Link from "next/link";
import { vars } from "@/styles/theme.css";
import { translateStat } from "@/utils/translateRawStats";
import {
  ChartCard,
  ScatterPlot,
} from "@/components/Charts/Charts";
import * as chartStyles from "@/components/Charts/Charts.css";
import {
  BubbleWatchCard,
  CullListCard,
  InbreedSplitCard,
  ReliabilityCard,
  UntriedCrossesCard,
  VariantUnlockCard,
} from "@/components/Records/InsightSections";
import type { RecordsModel } from "../useRecordsModel";

type Props = Pick<
  RecordsModel,
  | "activeHerd"
  | "bubble"
  | "crosses"
  | "reliability"
  | "unlockHints"
  | "heritability"
  | "inbredRanks"
  | "inbredCount"
  | "inbreedSplit"
  | "prolific"
  | "pairs"
  | "rangeFor"
  | "pastureGroupOf"
  | "speedOf"
  | "colors"
  | "nameOf"
>;

/** Foal average vs parent average with an improving/declining indicator. */
function DeltaCell({
  foal,
  parent,
  parentsFound,
  decimals,
  unit,
  rangeLo,
  rangeHi,
}: {
  foal: number;
  parent: number;
  parentsFound: number;
  decimals: number;
  unit: string;
  rangeLo: number | null;
  rangeHi: number | null;
}) {
  if (parentsFound === 0) {
    return (
      <td className={chartStyles.ledgerTd}>
        {foal.toFixed(decimals)} {unit}{" "}
        <span style={{ opacity: 0.6 }}>(parents unknown)</span>
      </td>
    );
  }
  const delta = foal - parent;
  const arrow = delta > 0 ? "▲" : delta < 0 ? "▼" : "＝";
  const color = delta > 0 ? vars.color.primary : delta < 0 ? vars.color.wax : "inherit";
  return (
    <td
      className={chartStyles.ledgerTd}
      title={`Foals ${foal.toFixed(decimals)} vs parents ${parent.toFixed(decimals)} ${unit}`}
    >
      {foal.toFixed(decimals)} {unit}{" "}
      <span style={{ color, fontWeight: 700 }}>
        {(delta >= 0 ? "+" : "") + delta.toFixed(decimals)} {arrow}
      </span>
      {rangeLo !== null && rangeHi !== null && (
        <>
          <br />
          <span
            style={{ opacity: 0.6 }}
            title="Possible range per the vanilla breeding roll; real foals cluster at the parent midpoint."
          >
            possible {rangeLo.toFixed(decimals)}–{rangeHi.toFixed(decimals)} {unit}
          </span>
        </>
      )}
    </td>
  );
}

export function BreedingInsightSection({
  activeHerd,
  bubble,
  crosses,
  reliability,
  unlockHints,
  heritability,
  inbredRanks,
  inbredCount,
  inbreedSplit,
  prolific,
  pairs,
  rangeFor,
  pastureGroupOf,
  speedOf,
  colors,
  nameOf,
}: Props) {
  return (
    <>
      <div style={{ marginTop: 24 }}>
        <ChartCard title={`Active Herd — ${activeHerd.counts.active} active · ${activeHerd.counts.pastured} pastured`}>
          <p style={{ margin: "0 0 8px", fontSize: 14 }}>
            Speed cut #{Math.min(63, activeHerd.counts.active)}:{" "}
            <strong>
              {activeHerd.cuts.speed !== null
                ? `${translateStat("speed", activeHerd.cuts.speed).toFixed(2)} m/s`
                : "—"}
            </strong>{" "}
            · Jump cut #16:{" "}
            <strong>
              {activeHerd.cuts.jump !== null
                ? `${translateStat("jump", activeHerd.cuts.jump).toFixed(2)} blocks`
                : "—"}
            </strong>{" "}
            · Health cut #16:{" "}
            <strong>
              {activeHerd.cuts.health !== null
                ? `${translateStat("health", activeHerd.cuts.health).toFixed(1)} hp`
                : "—"}
            </strong>
          </p>
          <p className={chartStyles.mutedNote} style={{ margin: 0 }}>
            A horse is active when it makes ANY cut — slow jump/health
            keepers (🛡️) are never auto-retired for missing speed. Everything
            living outside all three cuts belongs in a heritage pasture
            grouped by dominant bloodline.
          </p>
        </ChartCard>
      </div>

      <div style={{ marginTop: 24 }}>
        <BubbleWatchCard bubble={bubble} nameOf={nameOf} />
      </div>

      <div className={chartStyles.chartGrid} style={{ marginTop: 24 }}>
        <CullListCard
          pastured={activeHerd.pastured}
          nameOf={nameOf}
          pastureGroupOf={pastureGroupOf}
          speedOf={speedOf}
        />
        <UntriedCrossesCard cells={crosses} colors={colors} />
      </div>

      <div style={{ marginTop: 24 }}>
        <ReliabilityCard rows={reliability} nameOf={nameOf} />
      </div>

      <div style={{ marginTop: 24 }}>
        <VariantUnlockCard hints={unlockHints} />
      </div>

      <div style={{ marginTop: 24 }}>
        <ChartCard title="Heritability — Foal vs Mid-Parent">
          <p className={chartStyles.mutedNote}>
            Each dot is a foal plotted against its parents&apos; average.
            Slope ≈ 1 means the stat breeds true; slope ≈ 0 means the roll dominates.
            Descriptive only — a selected herd is not a random-mating trial.
          </p>
          <div className={chartStyles.chartGrid}>
            {heritability.map((h) => (
              <div key={h.label}>
                <h4 style={{ margin: "8px 0" }}>
                  {h.label}{" "}
                  <span style={{ opacity: 0.6, fontWeight: 400, fontSize: 12 }}>
                    slope {h.regression.slope.toFixed(2)} · R²{" "}
                    {h.regression.r2.toFixed(2)} (n={h.regression.n}
                    {h.regression.slopeCI !== null &&
                      `, 95% CI [${h.regression.slopeCI[0].toFixed(2)}, ${h.regression.slopeCI[1].toFixed(2)}]`})
                  </span>
                </h4>
                <ScatterPlot
                  points={h.scatter}
                  xLabel={`Parents avg (${h.unit})`}
                  yLabel={`Foal (${h.unit})`}
                  xDecimals={h.label === "Health" ? 1 : 2}
                  yDecimals={h.label === "Health" ? 1 : 2}
                />
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <div style={{ marginTop: 24 }}>
        <ChartCard title={`Inbreeding Watch — ${inbredCount} inbred foal${inbredCount === 1 ? "" : "s"}`}>
          {inbredRanks.length > 0 ? (
            <table className={chartStyles.ledgerTable}>
              <thead>
                <tr>
                  <th className={chartStyles.ledgerTh}>#</th>
                  <th className={chartStyles.ledgerTh}>Foal</th>
                  <th className={chartStyles.ledgerTh}>Shared ancestors</th>
                  <th className={chartStyles.ledgerTh}>F</th>
                </tr>
              </thead>
              <tbody>
                {inbredRanks.slice(0, 10).map((r, i) => (
                  <tr key={r.id}>
                    <td className={chartStyles.ledgerTd}>{i + 1}</td>
                    <td className={chartStyles.ledgerTd}>
                      <Link href={`/horses/${r.id}`} className={chartStyles.ledgerLink}>
                        {nameOf(r.id)}
                      </Link>
                    </td>
                    <td
                      className={chartStyles.ledgerTd}
                      style={{ color: r.shared > 0 ? vars.color.wax : "inherit", fontWeight: r.shared > 0 ? 700 : 400 }}
                    >
                      {r.shared > 0 ? `${r.shared} ⚠` : "0"}
                    </td>
                    <td
                      className={chartStyles.ledgerTd}
                      title="Wright's inbreeding coefficient: probability two alleles are identical by descent (parent×offspring = 0.25)"
                    >
                      {r.f > 0 ? r.f.toFixed(3) : "0"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className={chartStyles.statusNote}>No foals with recorded parents yet.</p>
          )}
        </ChartCard>
      </div>

      <div style={{ marginTop: 24 }}>
        <InbreedSplitCard split={inbreedSplit} />
      </div>

      <div style={{ marginTop: 24 }}>
        <ChartCard title="Most Prolific Parents">
          {prolific.length > 0 ? (
            <table className={chartStyles.ledgerTable}>
              <thead>
                <tr>
                  <th className={chartStyles.ledgerTh}>#</th>
                  <th className={chartStyles.ledgerTh}>Parent</th>
                  <th className={chartStyles.ledgerTh}>Foals</th>
                </tr>
              </thead>
              <tbody>
                {prolific.map((p, i) => (
                  <tr key={p.id}>
                    <td className={chartStyles.ledgerTd}>{i + 1}</td>
                    <td className={chartStyles.ledgerTd}>
                      <Link
                        href={`/horses/${p.id}`}
                        className={chartStyles.ledgerLink}
                      >
                        {nameOf(p.id)}
                      </Link>
                    </td>
                    <td className={chartStyles.ledgerTd}>{p.offspring}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className={chartStyles.statusNote}>No foals recorded yet.</p>
          )}
        </ChartCard>
      </div>

      <div style={{ marginTop: 24 }}>
        <ChartCard title="Breeding Pair Outcomes — Are Pairings Improving?">
          {pairs.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table className={chartStyles.ledgerTable}>
                <thead>
                  <tr>
                    <th className={chartStyles.ledgerTh}>Pair</th>
                    <th className={chartStyles.ledgerTh}>Foals</th>
                    <th className={chartStyles.ledgerTh}>Speed (foals vs parents)</th>
                    <th className={chartStyles.ledgerTh}>Jump (foals vs parents)</th>
                    <th className={chartStyles.ledgerTh}>Health (foals vs parents)</th>
                  </tr>
                </thead>
                <tbody>
                  {pairs.map((pair) => {
                    const speedRange = rangeFor(pair.parentId1, pair.parentId2, "speed");
                    const jumpRange = rangeFor(pair.parentId1, pair.parentId2, "jump");
                    const healthRange = rangeFor(pair.parentId1, pair.parentId2, "health");
                    return (
                    <tr key={`${pair.parentId1}-${pair.parentId2}`}>
                      <td className={chartStyles.ledgerTd}>
                        <Link
                          href={`/horses/${pair.parentId1}`}
                          className={chartStyles.ledgerLink}
                        >
                          {nameOf(pair.parentId1)}
                        </Link>{" "}
                        ×{" "}
                        <Link
                          href={`/horses/${pair.parentId2}`}
                          className={chartStyles.ledgerLink}
                        >
                          {nameOf(pair.parentId2)}
                        </Link>
                      </td>
                      <td className={chartStyles.ledgerTd}>{pair.children}</td>
                      <DeltaCell
                        foal={pair.foalAvgSpeed}
                        parent={pair.parentAvgSpeed}
                        parentsFound={pair.parentsFound}
                        decimals={2}
                        unit="m/s"
                        rangeLo={speedRange?.lo ?? null}
                        rangeHi={speedRange?.hi ?? null}
                      />
                      <DeltaCell
                        foal={pair.foalAvgJump}
                        parent={pair.parentAvgJump}
                        parentsFound={pair.parentsFound}
                        decimals={2}
                        unit="blocks"
                        rangeLo={jumpRange?.lo ?? null}
                        rangeHi={jumpRange?.hi ?? null}
                      />
                      <DeltaCell
                        foal={pair.foalAvgHealth}
                        parent={pair.parentAvgHealth}
                        parentsFound={pair.parentsFound}
                        decimals={1}
                        unit="hp"
                        rangeLo={healthRange?.lo ?? null}
                        rangeHi={healthRange?.hi ?? null}
                      />
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={chartStyles.statusNote}>No pairings recorded yet.</p>
          )}
        </ChartCard>
      </div>
    </>
  );
}
