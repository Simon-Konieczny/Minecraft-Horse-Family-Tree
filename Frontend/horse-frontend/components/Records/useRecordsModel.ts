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
  sharesByGeneration,
  variantBloodlineCrosstab,
  variantBloodlineShares,
  variantDistribution,
} from "@/utils/analytics";
import { getHorseFullName } from "@/utils/horseNames";
import { FALLBACK_HEX_COLOR } from "@/utils/bloodlineValidation";
import { getActiveHerd, ACTIVE_SPEED_COUNT, ACTIVE_JUMP_COUNT, ACTIVE_HEALTH_COUNT } from "@/utils/activeHerd";
import {
  bubbleWatch,
  deceasedVsLiving,
  founderLegacy,
  inbreedingSplit,
  parentReliability,
  purityTrend,
  recordByGeneration,
  statCorrelations,
  untriedBloodlineCrosses,
  varianceByGeneration,
  variantUnlockHints,
} from "@/utils/herdInsights";
import { ALL_VARIANTS } from "@/utils/variant";
import { translateStat } from "@/utils/translateRawStats";
import type { GenerationScopeValue } from "@/components/Common/GenerationScopeBar/GenerationScopeBar";

export const STATS = [
  { field: "speed", label: "Speed", unit: "m/s", decimals: 2 },
  { field: "jump", label: "Jump", unit: "blocks", decimals: 2 },
  { field: "health", label: "Health", unit: "hp", decimals: 1 },
] as const;

/**
 * All records-page derived data in one hook. Owns the generation-scope
 * state; the page component only composes sections from the model.
 * Everything downstream reads translated display units (jump is
 * nonlinear — translate first, average second).
 */
export function useRecordsModel(horses: Horse[], colors: Record<string, string>) {
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
  const resetScope = () => setScope(defaultScope);

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
  const pastureGroupOf = (id: string) => dominantBloodline(horseById.get(id)?.dna) || "Unknown";

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
    field,
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
      color: (dominant && colors[dominant]) || FALLBACK_HEX_COLOR,
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
  // Full 35-combo census in canonical create/edit (color-major) order so
  // missing coats stay visible. Counts respect the current scope.
  const fullVariants = useMemo(() => {
    const byVariant = new Map(variants.map((v) => [v.variant, v.count]));
    return ALL_VARIANTS.map((variant) => ({
      variant,
      count: byVariant.get(variant) ?? 0,
    }));
  }, [variants]);
  // Fractional DNA-split crosstab (hybrids share their count across
  // bloodlines) with a dominant-only fallback toggle in the UI.
  const crosstab = variantBloodlineCrosstab(filtered);
  const crosstabShares = variantBloodlineShares(filtered);
  const rarest = useMemo(() => [...variants].sort((a, b) => a.count - b.count).slice(0, 5), [variants]);
  const presentCount = variants.length;

  // ---- Insight engine (all translated units; no dates anywhere) ----
  const tById = useMemo(
    () => new Map(translatedWithIds.map((h) => [h.id, h])),
    [translatedWithIds],
  );
  const speedOf = (id: string) => tById.get(id)?.speed ?? null;
  const finiteOrNull = (v: number) => (Number.isFinite(v) ? v : null);
  const translatedCuts = {
    speed: activeHerd.cuts.speed !== null ? translateStat("speed", activeHerd.cuts.speed) : null,
    jump: activeHerd.cuts.jump !== null ? translateStat("jump", activeHerd.cuts.jump) : null,
    health: activeHerd.cuts.health !== null ? translateStat("health", activeHerd.cuts.health) : null,
  };
  const bubble = useMemo(
    () =>
      bubbleWatch(
        activeHerd.ranked,
        (id) => {
          const t = tById.get(id);
          return t
            ? { speed: finiteOrNull(t.speed), jump: finiteOrNull(t.jump), health: finiteOrNull(t.health) }
            : { speed: null, jump: null, health: null };
        },
        translatedCuts,
        { speed: ACTIVE_SPEED_COUNT, jump: ACTIVE_JUMP_COUNT, health: ACTIVE_HEALTH_COUNT },
      ),
    // translatedCuts derives from activeHerd; tById covers value lookups.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeHerd, tById],
  );
  const reliability = useMemo(
    () =>
      parentReliability(
        translatedWithIds.filter((h) => h.parentId1 || h.parentId2),
        (id) => {
          const t = tById.get(id);
          return t
            ? { speed: finiteOrNull(t.speed), jump: finiteOrNull(t.jump), health: finiteOrNull(t.health) }
            : { speed: null, jump: null, health: null };
        },
      ),
    [translatedWithIds, tById],
  );
  const crosses = useMemo(
    () =>
      untriedBloodlineCrosses(
        activeHerd.active.map((h) => ({
          id: h.id,
          dna: h.dna,
          speed: tById.get(h.id)?.speed ?? 0,
        })),
        pairs,
        (id) => dominantBloodline(horseById.get(id)?.dna) || "Unknown",
      ),
    [activeHerd, tById, horseById, pairs],
  );
  const unlockHints = useMemo(
    () =>
      variantUnlockHints(
        variants.map((v) => v.variant),
        activeHerd.active
          .map((h) => h.variant)
          .filter((v): v is number => typeof v === "number" && Number.isFinite(v)),
      ),
    [variants, activeHerd],
  );
  const genShares = useMemo(() => sharesByGeneration(filtered), [filtered]);
  const legacy = useMemo(() => founderLegacy(filtered, activeHerd.activeIds), [filtered, activeHerd]);
  const purityPts = useMemo(
    () =>
      purityTrend(filtered).map((p) => ({
        label: `Gen ${p.generation}`,
        value: Math.round(p.avgShare * 1000) / 10,
      })),
    [filtered],
  );
  const correlations = useMemo(() => statCorrelations(translated), [translated]);
  const corrPoints = useMemo(() => {
    const mk = (xf: "speed" | "jump", yf: "jump" | "health") =>
      filtered.map((h) => {
        const dominant = dominantBloodline(h.dna);
        return {
          x: translateStat(xf, h[xf]),
          y: translateStat(yf, h[yf]),
          color: (dominant && colors[dominant]) || FALLBACK_HEX_COLOR,
          label: getHorseFullName(h),
        };
      });
    return { speedHealth: mk("speed", "health"), jumpHealth: mk("jump", "health") };
  }, [filtered, colors]);
  // Per-generation best (ceiling) aligned to the avg trend order.
  const bestByGen = useMemo(() => {
    const out = new Map<string, { label: string; value: number }[]>();
    for (const { field, decimals } of STATS) {
      const groups = new Map<number, number>();
      for (const h of translated) {
        const v = h[field];
        if (!Number.isFinite(v)) continue;
        groups.set(h.generation, Math.max(groups.get(h.generation) ?? -Infinity, v));
      }
      out.set(
        field,
        [...groups.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([gen, v]) => ({ label: `Gen ${gen}`, value: Math.round(v * 10 ** decimals) / 10 ** decimals })),
      );
    }
    return out;
  }, [translated]);
  const variancePts = useMemo(() => {
    const out = new Map<string, { label: string; value: number }[]>();
    for (const { field, decimals } of STATS) {
      const rows = translated.map((h) => ({ generation: h.generation, value: h[field] }));
      out.set(
        field,
        varianceByGeneration(rows).map((p) => ({
          label: `Gen ${p.generation}`,
          value: Math.round(p.std * 10 ** decimals) / 10 ** decimals,
        })),
      );
    }
    return out;
  }, [translated]);
  const recByGen = useMemo(
    () =>
      recordByGeneration(
        filtered.map((h) => {
          const t = tById.get(h.id);
          return {
            id: h.id,
            generation: h.generation || 0,
            speed: t?.speed ?? NaN,
            jump: t?.jump ?? NaN,
            health: t?.health ?? NaN,
          };
        }),
      ),
    [filtered, tById],
  );
  const inbreedShared = useMemo(() => new Map(inbredRanks.map((r) => [r.id, r.shared])), [inbredRanks]);
  const inbreedSplit = useMemo(
    () =>
      inbreedingSplit(
        translatedWithIds.filter((h) => h.parentId1 || h.parentId2),
        (id) => inbreedShared.get(id) ?? 0,
      ),
    [translatedWithIds, inbreedShared],
  );
  const pyramid = useMemo(
    () => generationCounts(filtered.filter((h) => h.status !== "Deceased")),
    [filtered],
  );
  const deadAlive = useMemo(
    () =>
      deceasedVsLiving(
        filtered.map((h) => {
          const t = tById.get(h.id);
          return {
            status: h.status,
            speed: t?.speed ?? NaN,
            jump: t?.jump ?? NaN,
            health: t?.health ?? NaN,
          };
        }),
      ),
    [filtered, tById],
  );
  const champions = useMemo(() => {
    const table = new Map<
      string,
      {
        speed: { id: string; value: number } | null;
        jump: { id: string; value: number } | null;
        health: { id: string; value: number } | null;
      }
    >();
    for (const h of filtered) {
      const t = tById.get(h.id);
      if (!t) continue;
      const bloodline = dominantBloodline(h.dna) || "Unknown";
      let row = table.get(bloodline);
      if (!row) {
        row = { speed: null, jump: null, health: null };
        table.set(bloodline, row);
      }
      (["speed", "jump", "health"] as const).forEach((field) => {
        const v = t[field];
        if (Number.isFinite(v) && (!row[field] || v > (row[field]?.value ?? -Infinity))) {
          row[field] = { id: h.id, value: v };
        }
      });
    }
    return [...table.entries()]
      .map(([bloodline, row]) => ({ bloodline, ...row }))
      .sort((a, b) => a.bloodline.localeCompare(b.bloodline));
  }, [filtered, tById]);

  return {
    scope, defaultScope, handleScopeChange, resetScope, genOptions,
    horses, colors, filtered, filteredIds, activeHerd,
    nameOf, pastureGroupOf, speedOf, rangeFor,
    histograms, trends, scatter, scatterAvg,
    prolific, pairs, lineage, heritability,
    inbredRanks, inbredCount,
    herdShares, diversity, herdTotal,
    fame, godRoll, deltas,
    fullVariants, crosstab, crosstabShares, rarest, presentCount,
    bubble, reliability, crosses, unlockHints,
    genShares, legacy, purityPts,
    correlations, corrPoints, bestByGen, variancePts, recByGen,
    inbreedSplit, pyramid, deadAlive, champions,
  };
}

export type RecordsModel = ReturnType<typeof useRecordsModel>;
