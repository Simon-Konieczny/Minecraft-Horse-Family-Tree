import { getAllHorses } from "@/lib/horses";
import { getBloodlineColors } from "@/lib/bloodlines";
import {
  avgByGeneration,
  dominantBloodline,
  generationCounts,
  histogramBins,
  longestLineage,
  pairOutcomesVsParents,
  prolificParents,
  variantBloodlineCrosstab,
  variantDistribution,
} from "@/utils/analytics";
import Link from "next/link";
import { getHorseFullName } from "@/utils/horseNames";
import { vars } from "@/styles/theme.css";
import { getVariantName } from "@/utils/variant";
import { translateStat } from "@/utils/translateRawStats";
import { ChapterHeading, Folio } from "@/components/Book/Book";
import {
  Bars,
  ChartCard,
  ScatterPlot,
  TrendLine,
} from "@/components/Charts/Charts";
import * as chartStyles from "@/components/Charts/Charts.css";
import TopPerformers from "@/components/Records/TopPerformers";

export const dynamic = "force-dynamic";

const STATS = [
  { field: "speed", label: "Speed", unit: "m/s", decimals: 2 },
  { field: "jump", label: "Jump", unit: "blocks", decimals: 2 },
  { field: "health", label: "Health", unit: "hp", decimals: 1 },
] as const;

/** Foal average vs parent average with an improving/declining indicator. */
function DeltaCell({
  foal,
  parent,
  parentsFound,
  decimals,
  unit,
}: {
  foal: number;
  parent: number;
  parentsFound: number;
  decimals: number;
  unit: string;
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
  const color = delta > 0 ? "#2d4a3e" : delta < 0 ? "#8f2d22" : "inherit";
  return (
    <td
      className={chartStyles.ledgerTd}
      title={`Foals ${foal.toFixed(decimals)} vs parents ${parent.toFixed(decimals)} ${unit}`}
    >
      {foal.toFixed(decimals)} {unit}{" "}
      <span style={{ color, fontWeight: 700 }}>
        {(delta >= 0 ? "+" : "") + delta.toFixed(decimals)} {arrow}
      </span>
    </td>
  );
}

export default async function RecordsPage() {
  const [horses, colors] = await Promise.all([
    getAllHorses(),
    getBloodlineColors(),
  ]);

  // Translate first (jump is nonlinear), then average per generation.
  const translated = horses.map((h) => ({
    generation: h.generation || 0,
    speed: translateStat("speed", h.speed),
    jump: translateStat("jump", h.jump),
    health: translateStat("health", h.health),
  }));

  const histograms = STATS.map(({ field, label, unit, decimals }) => {
    const values = translated.map((h) => h[field]);
    const min = values.length > 0 ? Math.min(...values) : 0;
    const max = values.length > 0 ? Math.max(...values) : 0;
    return {
      label,
      unit,
      bins: histogramBins(values, 8, min, max).map((b) => ({
        label: b.start.toFixed(decimals),
        value: b.count,
      })),
    };
  });

  const trends = STATS.map(({ field, label, unit, decimals }) => ({
    label,
    unit,
    points: avgByGeneration(translated, field).map((g) => ({
      label: `Gen ${g.generation}`,
      value: Math.round(g.avg * 10 ** decimals) / 10 ** decimals,
    })),
  }));

  const scatter = horses.map((h) => {
    const dominant = dominantBloodline(h.dna);
    return {
      x: translateStat("speed", h.speed),
      y: translateStat("jump", h.jump),
      color: (dominant && colors[dominant]) || "#94a3b8",
      label: `${getHorseFullName(h)} — ${translateStat("speed", h.speed).toFixed(2)} m/s, ${translateStat("jump", h.jump).toFixed(2)} blocks`,
    };
  });

  const generations = generationCounts(horses);
  const prolific = prolificParents(horses).slice(0, 10);
  // Translate first (jump is nonlinear), then compare foal averages
  // against the parents' own average — "are pairings improving?".
  const translatedWithIds = horses.map((h) => ({
    id: h.id,
    parentId1: h.parentId1,
    parentId2: h.parentId2,
    speed: translateStat("speed", h.speed),
    jump: translateStat("jump", h.jump),
    health: translateStat("health", h.health),
  }));
  const pairs = pairOutcomesVsParents(translatedWithIds);
  const lineage = longestLineage(horses);
  const horseById = new Map(horses.map((h) => [h.id, h]));
  const nameOf = (id: string) => {
    const h = horseById.get(id);
    return h ? getHorseFullName(h) : "Unknown";
  };

  const variants = variantDistribution(horses);
  const crosstab = variantBloodlineCrosstab(horses);
  const crosstabBloodlines = [
    ...new Set(crosstab.map((c) => c.bloodline)),
  ].sort();
  const crosstabByVariant = new Map<number, Map<string, number>>();
  for (const c of crosstab) {
    let row = crosstabByVariant.get(c.variant);
    if (!row) {
      row = new Map();
      crosstabByVariant.set(c.variant, row);
    }
    row.set(c.bloodline, c.count);
  }

  return (
    <main style={{ padding: 24, maxWidth: 960 }}>
      <ChapterHeading
        numeral="Chapter IV"
        title="Records"
        subtitle="Distributions, progression, and top performers across the herd."
      />

      <div className={chartStyles.chartGrid}>
        {histograms.map((h) => (
          <ChartCard key={h.label} title={`${h.label} Distribution`}>
            <Bars rows={h.bins} />
          </ChartCard>
        ))}
      </div>

      <div className={chartStyles.chartGrid}>
        {trends.map((t) => (
          <ChartCard key={t.label} title={`Avg ${t.label} by Generation`}>
            <TrendLine points={t.points} unit={t.unit} />
          </ChartCard>
        ))}
      </div>

      <ChartCard title="Speed vs Jump">
        <ScatterPlot
          points={scatter}
          xLabel="Speed (m/s)"
          yLabel="Jump (blocks)"
        />
      </ChartCard>

      <div style={{ marginTop: 24 }}>
        <ChartCard title="Top Performers">
          <TopPerformers horses={horses} />
        </ChartCard>
      </div>

      <div className={chartStyles.chartGrid} style={{ marginTop: 24 }}>
        <ChartCard title="Variant Distribution">
          <Bars
            rows={variants.map((v) => ({
              label: getVariantName(v.variant),
              value: v.count,
            }))}
          />
        </ChartCard>
        <ChartCard title="Variant × Bloodline">
          {crosstab.length > 0 ? (
            <table className={chartStyles.ledgerTable}>
              <thead>
                <tr>
                  <th className={chartStyles.ledgerTh}>Variant</th>
                  {crosstabBloodlines.map((b) => (
                    <th key={b} className={chartStyles.ledgerTh}>
                      {b}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...crosstabByVariant.entries()].map(([variant, row]) => (
                  <tr key={variant}>
                    <td className={chartStyles.ledgerTd}>
                      {getVariantName(variant)}
                    </td>
                    {crosstabBloodlines.map((b) => (
                      <td key={b} className={chartStyles.ledgerTd}>
                        {row.get(b) || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className={chartStyles.mutedNote}>No variants recorded yet.</p>
          )}
        </ChartCard>
      </div>

      <div className={chartStyles.chartGrid} style={{ marginTop: 24 }}>
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
            <p className={chartStyles.mutedNote}>No foals recorded yet.</p>
          )}
        </ChartCard>
        <ChartCard title="Generation Growth">
          <Bars
            rows={generations.map((g) => ({
              label: `Gen ${g.generation}`,
              value: g.count,
            }))}
          />
        </ChartCard>
      </div>

      <div style={{ marginTop: 24 }}>
        <ChartCard title="Longest Lineage">
          {lineage.depth > 0 ? (
            <p style={{ margin: 0 }}>
              <strong style={{ fontFamily: vars.font.display, fontSize: 20 }}>
                {lineage.depth} generation{lineage.depth === 1 ? "" : "s"}
              </strong>
              <br />
              {lineage.chainIds.map((id, i) => (
                <span key={`${id}-${i}`}>
                  {i > 0 && " → "}
                  <Link
                    href={`/horses/${id}`}
                    className={chartStyles.ledgerLink}
                  >
                    {nameOf(id)}
                  </Link>
                </span>
              ))}
            </p>
          ) : (
            <p className={chartStyles.mutedNote}>No horses yet.</p>
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
                  {pairs.map((pair) => (
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
                      />
                      <DeltaCell
                        foal={pair.foalAvgJump}
                        parent={pair.parentAvgJump}
                        parentsFound={pair.parentsFound}
                        decimals={2}
                        unit="blocks"
                      />
                      <DeltaCell
                        foal={pair.foalAvgHealth}
                        parent={pair.parentAvgHealth}
                        parentsFound={pair.parentsFound}
                        decimals={1}
                        unit="hp"
                      />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={chartStyles.mutedNote}>No pairings recorded yet.</p>
          )}
        </ChartCard>
      </div>

      <Folio text="Chapter IV · Records" />
    </main>
  );
}
