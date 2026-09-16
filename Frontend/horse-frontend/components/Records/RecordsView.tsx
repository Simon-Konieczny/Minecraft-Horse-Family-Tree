"use client";

import { useMemo, useState } from "react";
import type { Horse } from "@/types/horse";
import {
  avgByGeneration,
  bloodlineDiversity,
  bloodlineShares,
  BREEDING_RANGES,
  dominantBloodline,
  expectedFoalRange,
  filterHorsesByScope,
  generationCounts,
  heritabilityPoints,
  inbreedingRanking,
  linearRegression,
  longestLineage,
  niceHistogram,
  pairOutcomesVsParents,
  prolificParents,
  purityRanking,
  variantBloodlineCrosstab,
  variantBloodlineShares,
  variantDistribution,
} from "@/utils/analytics";
import Link from "next/link";
import { getHorseFullName } from "@/utils/horseNames";
import { getActiveHerd } from "@/utils/activeHerd";
import { vars } from "@/styles/theme.css";
import { getVariantName } from "@/utils/variant";
import { translateStat } from "@/utils/translateRawStats";
import { ChapterHeading, Folio } from "@/components/Book/Book";
import {
  Bars,
  ChartCard,
  ScatterPlot,
  TrendLine,
  VerticalHistogram,
} from "@/components/Charts/Charts";
import * as chartStyles from "@/components/Charts/Charts.css";
import TopPerformers from "@/components/Records/TopPerformers";
import VariantGrid from "@/components/Records/VariantGrid";
import GenerationScopeBar, {
  type GenerationScopeValue,
} from "@/components/Common/GenerationScopeBar/GenerationScopeBar";

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

export default function RecordsView({
  horses,
  colors,
}: {
  horses: Horse[];
  colors: Record<string, string>;
}) {
  // All generations across the full herd drive the dropdowns; the default
  // scope (earliest–latest, All) reproduces the previous unfiltered view.
  const genOptions = useMemo(
    () => generationCounts(horses).map((g) => g.generation),
    [horses],
  );
  const defaultScope: GenerationScopeValue = {
    from: genOptions.length > 0 ? genOptions[0] : 0,
    to: genOptions.length > 0 ? genOptions[genOptions.length - 1] : 0,
    status: "All",
  };
  const [scope, setScope] = useState<GenerationScopeValue>(defaultScope);

  const handleScopeChange = (next: GenerationScopeValue) => {
    // Keep the invariant from <= to so every figure reads naturally.
    setScope({
      from: Math.min(next.from, next.to),
      to: Math.max(next.from, next.to),
      status: next.status,
    });
  };

  const filtered = useMemo(
    () => filterHorsesByScope(horses, scope),
    [horses, scope],
  );
  const filteredIds = useMemo(() => new Set(filtered.map((h) => h.id)), [filtered]);
  // Active-herd cuts within the current scope: top-63 speed ∪ top-16
  // jump/health. Jump/health keepers survive missing the speed cut.
  const activeHerd = useMemo(() => getActiveHerd(filtered), [filtered]);

  // Full-herd lookups so names and foal-range estimates still resolve when
  // a parent falls outside the selected generations.
  const horseById = useMemo(() => new Map(horses.map((h) => [h.id, h])), [horses]);
  const nameOf = (id: string) => {
    const h = horseById.get(id);
    return h ? getHorseFullName(h) : "Unknown";
  };

  // Translate first (jump is nonlinear), then average per generation.
  const translated = useMemo(
    () =>
      filtered.map((h) => ({
        generation: h.generation || 0,
        speed: translateStat("speed", h.speed),
        jump: translateStat("jump", h.jump),
        health: translateStat("health", h.health),
      })),
    [filtered],
  );

  const histograms = STATS.map(({ field, label, unit, decimals }) => {
    const values = translated.map((h) => h[field]);
    return {
      label,
      unit,
      decimals,
      bins: niceHistogram(values, decimals),
    };
  });

  const trends = STATS.map(({ field, label, unit, decimals }) => ({
    label,
    unit,
    decimals,
    points: avgByGeneration(translated, field).map((g) => ({
      label: `Gen ${g.generation}`,
      value: Math.round(g.avg * 10 ** decimals) / 10 ** decimals,
    })),
  }));

  const scatter = filtered.map((h) => {
    const dominant = dominantBloodline(h.dna);
    return {
      x: translateStat("speed", h.speed),
      y: translateStat("jump", h.jump),
      color: (dominant && colors[dominant]) || "#94a3b8",
      label: `${getHorseFullName(h)} — ${translateStat("speed", h.speed).toFixed(2)} m/s, ${translateStat("jump", h.jump).toFixed(2)} blocks`,
    };
  });

  // Mean reference lines for Speed vs Jump (translated units).
  const scatterAvg =
    scatter.length > 0
      ? {
          x: scatter.reduce((t, p) => t + p.x, 0) / scatter.length,
          y: scatter.reduce((t, p) => t + p.y, 0) / scatter.length,
        }
      : null;

  const growth = generationCounts(filtered);
  const prolific = prolificParents(filtered).slice(0, 10);
  // Translate first (jump is nonlinear), then compare foal averages
  // against the parents' own average — "are pairings improving?".
  const translatedWithIds = useMemo(
    () =>
      filtered.map((h) => ({
        id: h.id,
        parentId1: h.parentId1,
        parentId2: h.parentId2,
        speed: translateStat("speed", h.speed),
        jump: translateStat("jump", h.jump),
        health: translateStat("health", h.health),
      })),
    [filtered],
  );
  const pairs = pairOutcomesVsParents(translatedWithIds);
  // Lineage is inherently cross-generation: compute from the full herd so
  // chains never break, and dim links outside the scope when rendering.
  const lineage = longestLineage(horses);

  // Heritability: foal vs mid-parent on translated stats, per stat.
  const heritability = STATS.map(({ field, label, unit }) => {
    const points = heritabilityPoints(translatedWithIds, field);
    return {
      label,
      unit,
      regression: linearRegression(points),
      scatter: points.map((p, i) => ({
        x: p.x,
        y: p.y,
        color: "#b98a2f",
        label: `Foal ${i + 1}: parents ${p.x.toFixed(2)}, foal ${p.y.toFixed(2)} ${unit}`,
      })),
    };
  });

  // Inbreeding watch: foals ranked by parental shared ancestry.
  const inbredRanks = inbreedingRanking(filtered);
  const inbredCount = inbredRanks.filter((r) => r.shared > 0).length;

  // Diversity + generation deltas.
  const herdShares = bloodlineShares(filtered);
  const diversity = bloodlineDiversity(herdShares);
  const herdTotal = herdShares.reduce((t, s) => t + s.total, 0);
  const avgMaps = new Map(
    STATS.map(({ field }) => [
      field,
      new Map(avgByGeneration(translated, field).map((g) => [g.generation, g.avg])),
    ]),
  );
  const deltaGens = [...new Set([...avgMaps.values()].flatMap((m) => [...m.keys()]))].sort(
    (a, b) => a - b,
  );
  const deltas = deltaGens.slice(1).map((gen) => ({
    gen,
    values: STATS.map(({ field }) => {
      const prev = avgMaps.get(field)?.get(gen - 1);
      const curr = avgMaps.get(field)?.get(gen);
      return prev !== undefined && curr !== undefined ? curr - prev : null;
    }),
  }));

  // Hall of fame + god-roll chase (translated units, linked names).
  const display = filtered.map((h) => ({
    horse: h,
    speed: translateStat("speed", h.speed),
    jump: translateStat("jump", h.jump),
    health: translateStat("health", h.health),
  }));
  const maxBy = (field: "speed" | "jump" | "health") =>
    display.reduce((best, d) => (d[field] > best[field] ? d : best), display[0]);
  const fame =
    display.length > 0
      ? {
          speed: maxBy("speed"),
          jump: maxBy("jump"),
          health: maxBy("health"),
          prolific: prolific.length > 0 ? horseById.get(prolific[0].id) : undefined,
          prolificCount: prolific[0]?.offspring ?? 0,
          purest: purityRanking(filtered)[0],
        }
      : null;
  const godRoll = (["speed", "jump", "health"] as const).map((field) => {
    const max = translateStat(field, BREEDING_RANGES[field].max);
    const best = display.length > 0 ? maxBy(field) : null;
    return {
      field,
      max,
      horse: best?.horse,
      value: best?.[field] ?? 0,
      gap: best ? max - best[field] : 0,
    };
  });

  // Possible foal range per pair from the vanilla roll. Runs on RAW
  // parent stats (the game rolls raw), translated only for display.
  const rangeFor = (
    parentId1: string,
    parentId2: string,
    field: "speed" | "jump" | "health",
  ): { lo: number; hi: number } | null => {
    const range = BREEDING_RANGES[field];
    const vals = [horseById.get(parentId1), horseById.get(parentId2)]
      .map((p) => p?.[field])
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    if (vals.length === 0) return null;
    const [a, b] = vals.length === 2 ? vals : [vals[0], vals[0]];
    const r = expectedFoalRange(a, b, range.min, range.max);
    return {
      lo: translateStat(field, r.lo),
      hi: translateStat(field, r.hi),
    };
  };

  const variants = variantDistribution(filtered);
  // Fractional DNA-split crosstab (hybrids share their count across
  // bloodlines) with a dominant-only fallback toggle in the UI.
  const [crosstabMode, setCrosstabMode] = useState<"split" | "dominant">("split");
  const crosstab = variantBloodlineCrosstab(filtered);
  const crosstabShares = variantBloodlineShares(filtered);
  const crosstabSource: { variant: number; bloodline: string; display: string; title: string; raw: number }[] =
    crosstabMode === "split"
      ? crosstabShares.map((c) => ({
          variant: c.variant,
          bloodline: c.bloodline,
          display: c.share.toFixed(1),
          title: `${c.horses} horse${c.horses === 1 ? "" : "s"} touch this cell (DNA-split share ${c.share.toFixed(1)})`,
          raw: c.share,
        }))
      : crosstab.map((c) => ({
          variant: c.variant,
          bloodline: c.bloodline,
          display: `${c.count}`,
          title: `${c.count} horse${c.count === 1 ? "" : "s"} with this dominant bloodline`,
          raw: c.count,
        }));
  const crosstabBloodlines = [
    ...new Set(crosstabSource.map((c) => c.bloodline)),
  ].sort();
  const crosstabMax = Math.max(0, ...crosstabSource.map((c) => c.raw));
  const crosstabByVariant = new Map<number, Map<string, (typeof crosstabSource)[number]>>();
  for (const c of crosstabSource) {
    let row = crosstabByVariant.get(c.variant);
    if (!row) {
      row = new Map();
      crosstabByVariant.set(c.variant, row);
    }
    row.set(c.bloodline, c);
  }

  return (
    <main style={{ padding: 24, maxWidth: 960 }}>
      <ChapterHeading
        numeral="Chapter IV"
        title="Records"
        subtitle="Distributions, progression, and top performers across the herd."
      />

      <GenerationScopeBar
        generations={genOptions}
        value={scope}
        inScopeCount={filtered.length}
        totalCount={horses.length}
        onChange={handleScopeChange}
        onReset={() => setScope(defaultScope)}
      />

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

      <div className={chartStyles.chartGrid}>
        {trends.map((t) => (
          <ChartCard key={t.label} title={`Avg ${t.label} by Generation`}>
            <TrendLine points={t.points} unit={t.unit} decimals={t.decimals} />
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

      <div style={{ marginTop: 24 }}>
        <ChartCard title="Heritability — Foal vs Mid-Parent">
          <p className={chartStyles.mutedNote}>
            Each dot is a foal plotted against its parents&apos; average.
            Slope ≈ 1 means the stat breeds true; slope ≈ 0 means the roll dominates.
          </p>
          <div className={chartStyles.chartGrid}>
            {heritability.map((h) => (
              <div key={h.label}>
                <h4 style={{ margin: "8px 0" }}>
                  {h.label}{" "}
                  <span style={{ opacity: 0.6, fontWeight: 400, fontSize: 12 }}>
                    slope {h.regression.slope.toFixed(2)} · R²{" "}
                    {h.regression.r2.toFixed(2)} (n={h.regression.n})
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
                          backgroundColor: colors[s.bloodline] || "#94a3b8",
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ minWidth: 110, fontWeight: 700 }}>{s.bloodline}</span>
                      <span
                        style={{
                          display: "block",
                          height: 8,
                          flex: 1,
                          backgroundColor: "#e9dcc0",
                          borderRadius: 9999,
                          overflow: "hidden",
                        }}
                      >
                        <span
                          style={{
                            display: "block",
                            height: "100%",
                            width: `${pct}%`,
                            backgroundColor: colors[s.bloodline] || "#94a3b8",
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
                    : " — no bottleneck; the gene pool looks healthy."}
              </p>
            </div>
          ) : (
            <p className={chartStyles.mutedNote}>No horses yet.</p>
          )}
        </ChartCard>
        <ChartCard title="Generation Deltas — Avg Improvement">
          {deltas.length > 0 ? (
            <table className={chartStyles.ledgerTable}>
              <thead>
                <tr>
                  <th className={chartStyles.ledgerTh}>Gen</th>
                  {STATS.map((s) => (
                    <th key={s.field} className={chartStyles.ledgerTh}>
                      Δ {s.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deltas.map((d) => (
                  <tr key={d.gen}>
                    <td className={chartStyles.ledgerTd}>{d.gen}</td>
                    {d.values.map((v, i) => (
                      <td
                        key={STATS[i].field}
                        className={chartStyles.ledgerTd}
                        style={{
                          color:
                            v === null || v === 0
                              ? "inherit"
                              : v > 0
                                ? "#2d4a3e"
                                : "#8f2d22",
                          fontWeight: 700,
                        }}
                      >
                        {v === null
                          ? "—"
                          : `${(v >= 0 ? "+" : "") + v.toFixed(STATS[i].decimals)}`}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className={chartStyles.mutedNote}>
              Needs horses across at least two generations.
            </p>
          )}
        </ChartCard>
      </div>

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
        <ChartCard title="Top Performers — Top 63 Speed · Top 16 Jump/Health">
          <TopPerformers horses={filtered} />
        </ChartCard>
      </div>

      <div className={chartStyles.chartGrid} style={{ marginTop: 24 }}>
        <ChartCard title="Hall of Fame">
          {fame ? (
            <table className={chartStyles.ledgerTable}>
              <tbody>
                <tr>
                  <td className={chartStyles.ledgerTd}>⚡ Fastest</td>
                  <td className={chartStyles.ledgerTd}>
                    <Link href={`/horses/${fame.speed.horse.id}`} className={chartStyles.ledgerLink}>
                      {nameOf(fame.speed.horse.id)}
                    </Link>{" "}
                    · {fame.speed.speed.toFixed(2)} m/s
                  </td>
                </tr>
                <tr>
                  <td className={chartStyles.ledgerTd}>🐎 Highest jump</td>
                  <td className={chartStyles.ledgerTd}>
                    <Link href={`/horses/${fame.jump.horse.id}`} className={chartStyles.ledgerLink}>
                      {nameOf(fame.jump.horse.id)}
                    </Link>{" "}
                    · {fame.jump.jump.toFixed(2)} blocks
                  </td>
                </tr>
                <tr>
                  <td className={chartStyles.ledgerTd}>❤ Toughest</td>
                  <td className={chartStyles.ledgerTd}>
                    <Link href={`/horses/${fame.health.horse.id}`} className={chartStyles.ledgerLink}>
                      {nameOf(fame.health.horse.id)}
                    </Link>{" "}
                    · {fame.health.health.toFixed(1)} hp
                  </td>
                </tr>
                {fame.prolific && (
                  <tr>
                    <td className={chartStyles.ledgerTd}>👑 Most prolific</td>
                    <td className={chartStyles.ledgerTd}>
                      <Link href={`/horses/${fame.prolific.id}`} className={chartStyles.ledgerLink}>
                        {nameOf(fame.prolific.id)}
                      </Link>{" "}
                      · {fame.prolificCount} foals
                    </td>
                  </tr>
                )}
                {fame.purest && (
                  <tr>
                    <td className={chartStyles.ledgerTd}>🧬 Purest</td>
                    <td className={chartStyles.ledgerTd}>
                      <Link href={`/horses/${fame.purest.horse.id}`} className={chartStyles.ledgerLink}>
                        {nameOf(fame.purest.horse.id)}
                      </Link>{" "}
                      · {(fame.purest.share * 100).toFixed(1)}% {fame.purest.bloodline}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <p className={chartStyles.mutedNote}>No horses yet.</p>
          )}
        </ChartCard>
        <ChartCard title="God-Roll Tracker — Distance to Max">
          {filtered.length > 0 ? (
            <table className={chartStyles.ledgerTable}>
              <thead>
                <tr>
                  <th className={chartStyles.ledgerTh}>Stat</th>
                  <th className={chartStyles.ledgerTh}>Closest</th>
                  <th className={chartStyles.ledgerTh}>Gap</th>
                </tr>
              </thead>
              <tbody>
                {godRoll.map((g) => (
                  <tr key={g.field}>
                    <td className={chartStyles.ledgerTd}>{g.field}</td>
                    <td className={chartStyles.ledgerTd}>
                      {g.horse ? (
                        <Link href={`/horses/${g.horse.id}`} className={chartStyles.ledgerLink}>
                          {nameOf(g.horse.id)}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className={chartStyles.ledgerTd}>
                      {g.gap.toFixed(2)} off {g.max.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className={chartStyles.mutedNote}>No horses yet.</p>
          )}
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
                      style={{ color: r.shared > 0 ? "#8f2d22" : "inherit", fontWeight: r.shared > 0 ? 700 : 400 }}
                    >
                      {r.shared > 0 ? `${r.shared} ⚠` : "0"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className={chartStyles.mutedNote}>No foals with recorded parents yet.</p>
          )}
        </ChartCard>
      </div>

      <div style={{ marginTop: 24 }}>
        <ChartCard title="Variant Distribution">
          <p className={chartStyles.mutedNote} style={{ margin: 0 }}>
            Which coats the herd wears — same pictures as the create/edit
            form. Sorted most common first.
          </p>
          <VariantGrid counts={variants} total={filtered.length} />
        </ChartCard>
      </div>

      <div style={{ marginTop: 24 }}>
        <ChartCard title="Variant × Bloodline">
          <p className={chartStyles.mutedNote} style={{ margin: 0 }}>
            {crosstabMode === "split"
              ? "DNA-split shares: a 50/50 hybrid adds 0.5 to each bloodline, so mixed horses are never misattributed. Hover a cell for the horse count."
              : "Dominant-only counts: each horse sits in a single column by its top bloodline."}{" "}
            <button
              type="button"
              onClick={() => setCrosstabMode(crosstabMode === "split" ? "dominant" : "split")}
              style={{ textDecoration: "underline", cursor: "pointer", background: "none", border: "none", padding: 0, font: "inherit", color: "inherit" }}
            >
              Show {crosstabMode === "split" ? "dominant-only" : "DNA-split"} instead
            </button>
          </p>
          {crosstabSource.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table className={chartStyles.ledgerTable} style={{ minWidth: Math.max(400, crosstabBloodlines.length * 90) }}>
                <thead>
                  <tr>
                    <th className={chartStyles.ledgerTh} style={{ position: "sticky", left: 0 }}>Variant</th>
                    {crosstabBloodlines.map((b) => (
                      <th key={b} className={chartStyles.ledgerTh}>
                        <span
                          style={{
                            display: "inline-block",
                            width: 10,
                            height: 10,
                            borderRadius: 3,
                            backgroundColor: colors[b] || "#94a3b8",
                            marginRight: 6,
                          }}
                        />
                        {b}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...crosstabByVariant.entries()].map(([variant, row]) => (
                    <tr key={variant}>
                      <td className={chartStyles.ledgerTd} style={{ position: "sticky", left: 0 }}>
                        {getVariantName(variant)}
                      </td>
                      {crosstabBloodlines.map((b) => {
                        const cell = row.get(b);
                        const intensity = crosstabMax > 0 && cell ? cell.raw / crosstabMax : 0;
                        return (
                          <td
                            key={b}
                            className={chartStyles.ledgerTd}
                            title={cell?.title}
                            style={cell ? { backgroundColor: `rgba(185,138,47,${(intensity * 0.35).toFixed(2)})`, fontWeight: 700 } : undefined}
                          >
                            {cell ? cell.display : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
            rows={growth.map((g) => ({
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
              {lineage.chainIds.map((id, i) => {
                const inScope = filteredIds.has(id);
                return (
                  <span key={`${id}-${i}`}>
                    {i > 0 && " → "}
                    <Link
                      href={`/horses/${id}`}
                      className={chartStyles.ledgerLink}
                      style={
                        inScope
                          ? undefined
                          : { opacity: 0.45 }
                      }
                      title={inScope ? undefined : "Outside selected generations"}
                    >
                      {nameOf(id)}
                    </Link>
                  </span>
                );
              })}
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
            <p className={chartStyles.mutedNote}>No pairings recorded yet.</p>
          )}
        </ChartCard>
      </div>

      <Folio text="Chapter IV · Records" />
    </main>
  );
}
