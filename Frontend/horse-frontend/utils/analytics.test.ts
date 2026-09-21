import { describe, expect, it } from "vitest";
import {
  ancestryOverlap,
  avgByGeneration,
  bloodlineDiversity,
  bloodlineShares,
  dominantBloodline,
  expectedFoalRange,
  filterHorsesByScope,
  generationCounts,
  heritabilityPoints,
  histogramBins,
  inbreedingCoefficient,
  inbreedingRanking,
  linearRegression,
  longestLineage,
  niceHistogram,
  pairOutcomes,
  pairOutcomesVsParents,
  prolificParents,
  purityRanking,
  planSequentialPairings,
  sharesByGeneration,
  statSummary,
  statusBreakdown,
  variantBloodlineCrosstab,
  variantBloodlineShares,
  variantDistribution,
} from "./analytics";

describe("statusBreakdown", () => {
  it("counts each status, defaulting unknowns to Alive", () => {
    expect(
      statusBreakdown([
        { status: "Alive" },
        { status: "Deceased" },
        { status: "Retired" },
        { status: "Alive" },
        {},
        { status: "weird" },
      ]),
    ).toEqual({ Alive: 4, Deceased: 1, Retired: 1 });
  });

  it("is empty-safe", () => {
    expect(statusBreakdown([])).toEqual({ Alive: 0, Deceased: 0, Retired: 0 });
  });
});

describe("generationCounts", () => {
  it("groups and sorts ascending, treating missing as 0", () => {
    expect(
      generationCounts([
        { generation: 2 },
        { generation: 0 },
        { generation: 2 },
        {},
      ]),
    ).toEqual([
      { generation: 0, count: 2 },
      { generation: 2, count: 2 },
    ]);
  });
});

describe("statSummary", () => {
  it("computes avg/min/max/count", () => {
    expect(statSummary([{ s: 1 }, { s: 2 }, { s: 3 }], "s")).toEqual({
      avg: 2,
      min: 1,
      max: 3,
      count: 3,
    });
  });

  it("ignores non-numeric values and is empty-safe", () => {
    expect(statSummary([{ s: "x" }, {}], "s")).toEqual({
      avg: 0,
      min: 0,
      max: 0,
      count: 0,
    });
  });
});

describe("histogramBins", () => {
  it("bins values into fixed widths, clamping outliers inward", () => {
    const bins = histogramBins([0, 0.5, 1, 1.5, 99, -5], 2, 0, 2);
    expect(bins.map((b) => b.count)).toEqual([3, 3]);
  });

  it("handles degenerate ranges", () => {
    expect(histogramBins([1, 1], 4, 1, 1).map((b) => b.count)).toEqual([
      2, 0, 0, 0,
    ]);
  });
});

describe("bloodlineShares", () => {
  it("sums weights per bloodline, descending, skipping junk", () => {
    expect(
      bloodlineShares([
        { dna: { A: 0.5, B: 0.5 } },
        { dna: { A: 0.25, C: 0.25 } },
        { dna: { B: "x", D: -1 } },
        {},
      ]),
    ).toEqual([
      { bloodline: "A", total: 0.75 },
      { bloodline: "B", total: 0.5 },
      { bloodline: "C", total: 0.25 },
    ]);
  });
});

describe("purityRanking", () => {
  it("ranks by dominant share, dropping shareless horses", () => {
    const herd = [
      { id: 1, dna: { A: 0.5, B: 0.5 } },
      { id: 2, dna: { A: 1.0 } },
      { id: 3, dna: {} },
    ];
    const ranking = purityRanking(herd);
    expect(ranking.map((r) => r.horse.id)).toEqual([2, 1]);
    expect(ranking[0]).toMatchObject({ bloodline: "A", share: 1.0 });
  });
});

describe("sharesByGeneration", () => {
  it("averages DNA weights within each generation, ascending", () => {
    expect(
      sharesByGeneration([
        { generation: 1, dna: { A: 1.0 } },
        { generation: 1, dna: { A: 0.5, B: 0.5 } },
        { generation: 0, dna: { B: 1.0 } },
      ]),
    ).toEqual([
      { generation: 0, shares: { B: 1.0 } },
      { generation: 1, shares: { A: 0.75, B: 0.25 } },
    ]);
  });
});

describe("avgByGeneration", () => {
  it("averages a field per generation, skipping non-numbers", () => {
    expect(
      avgByGeneration(
        [
          { generation: 0, speed: 0.125 },
          { generation: 1, speed: 0.25 },
          { generation: 1, speed: 0.5 },
          { generation: 1, speed: "x" },
        ],
        "speed",
      ),
    ).toEqual([
      { generation: 0, avg: 0.125, count: 1 },
      { generation: 1, avg: 0.375, count: 2 },
    ]);
  });
});

describe("dominantBloodline", () => {
  it("returns the top key, empty string when none", () => {
    expect(dominantBloodline({ A: 0.4, B: 0.6 })).toBe("B");
    expect(dominantBloodline({})).toBe("");
    expect(dominantBloodline(undefined)).toBe("");
  });
});

describe("variantDistribution", () => {
  it("counts per variant ascending, skipping junk", () => {
    expect(
      variantDistribution([
        { variant: 2 },
        { variant: 1 },
        { variant: 2 },
        { variant: "x" },
        {},
      ]),
    ).toEqual([
      { variant: 1, count: 1 },
      { variant: 2, count: 2 },
    ]);
  });
});

describe("variantBloodlineCrosstab", () => {
  it("counts occurring (variant, dominant bloodline) pairs", () => {
    expect(
      variantBloodlineCrosstab([
        { variant: 1, dna: { A: 1.0 } },
        { variant: 1, dna: { A: 0.6, B: 0.4 } },
        { variant: 2, dna: { B: 1.0 } },
        { variant: 2, dna: {} },
      ]),
    ).toEqual([
      { variant: 1, bloodline: "A", count: 2 },
      { variant: 2, bloodline: "B", count: 1 },
      { variant: 2, bloodline: "Unknown", count: 1 },
    ]);
  });
});

describe("prolificParents", () => {
  it("ranks parents by offspring count", () => {
    expect(
      prolificParents([
        { parentId1: "a", parentId2: "b" },
        { parentId1: "a", parentId2: "c" },
        { parentId1: "", parentId2: "" },
      ]),
    ).toEqual([
      { id: "a", offspring: 2 },
      { id: "b", offspring: 1 },
      { id: "c", offspring: 1 },
    ]);
  });
});

describe("pairOutcomes", () => {
  it("groups foals by pair regardless of parent order", () => {
    const outcomes = pairOutcomes([
      { parentId1: "a", parentId2: "b", speed: 0.25, jump: 0.5, health: 20 },
      { parentId1: "b", parentId2: "a", speed: 0.5, jump: 1.0, health: 30 },
      { parentId1: "", parentId2: "" },
    ]);
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]).toMatchObject({
      children: 2,
      avgSpeed: 0.375,
      avgJump: 0.75,
      avgHealth: 25,
    });
    expect([outcomes[0].parentId1, outcomes[0].parentId2].sort()).toEqual([
      "a",
      "b",
    ]);
  });
});

describe("pairOutcomesVsParents", () => {
  it("compares foal averages against the parents' own average", () => {
    const herd = [
      { id: "a", speed: 10, jump: 4, health: 20 },
      { id: "b", speed: 14, jump: 6, health: 30 },
      { id: "c", parentId1: "a", parentId2: "b", speed: 14, jump: 6, health: 30 },
      { id: "d", parentId1: "b", parentId2: "a", speed: 16, jump: 8, health: 40 },
    ];
    const outcomes = pairOutcomesVsParents(herd);
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]).toMatchObject({
      children: 2,
      parentsFound: 2,
      foalAvgSpeed: 15,
      foalAvgJump: 7,
      foalAvgHealth: 35,
      parentAvgSpeed: 12,
      parentAvgJump: 5,
      parentAvgHealth: 25,
    });
  });

  it("tolerates missing parents", () => {
    const herd = [
      { id: "a", speed: 10, jump: 4, health: 20 },
      { id: "c", parentId1: "a", parentId2: "ghost", speed: 12, jump: 5, health: 22 },
    ];
    const outcomes = pairOutcomesVsParents(herd);
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]).toMatchObject({
      children: 1,
      parentsFound: 1,
      parentAvgSpeed: 10,
    });
  });
});

describe("expectedFoalRange", () => {
  it("centers on the parent midpoint with the vanilla spread", () => {
    // Identical parents: spread is just 30% of the range.
    const r = expectedFoalRange(0.25, 0.25, 0.1125, 0.3375);
    expect(r.midpoint).toBeCloseTo(0.25, 12);
    expect(r.spread).toBeCloseTo(0.3 * 0.225, 12);
    expect(r.lo).toBeCloseTo(0.25 - r.spread / 2, 12);
    expect(r.hi).toBeCloseTo(0.25 + r.spread / 2, 12);
  });

  it("widens with parental difference", () => {
    const narrow = expectedFoalRange(0.2, 0.22, 0.1125, 0.3375);
    const wide = expectedFoalRange(0.12, 0.33, 0.1125, 0.3375);
    expect(wide.hi - wide.lo).toBeGreaterThan(narrow.hi - narrow.lo);
  });

  it("clamps out-of-range bounds inside (displayed, not reflected)", () => {
    // Midpoint at the floor: raw lo escapes below min and clamps up.
    const r = expectedFoalRange(0.1125, 0.1125, 0.1125, 0.3375);
    expect(r.lo).toBeGreaterThanOrEqual(0.1125);
    expect(r.hi).toBeLessThanOrEqual(0.3375);
    expect(r.lo).toBeLessThanOrEqual(r.hi);
    // Midpoint at the ceiling: raw hi escapes above max and clamps down.
    const c = expectedFoalRange(1.0, 1.0, 0.4, 1.0);
    expect(c.lo).toBeGreaterThanOrEqual(0.4);
    expect(c.hi).toBeLessThanOrEqual(1.0);
  });

  it("clamps the midpoint for out-of-range parents", () => {
    const r = expectedFoalRange(0.5, 0.5, 0.1125, 0.3375);
    expect(r.midpoint).toBeLessThanOrEqual(0.3375);
    expect(r.midpoint).toBeGreaterThanOrEqual(0.1125);
  });

  it("never shows fast parents a max below themselves (cap is achievable)", () => {
    // Identical 14.19 m/s parents: the old endpoint reflection displayed
    // ~13.49 while slower pairs displayed ~14.26.
    const best = expectedFoalRange(0.3288, 0.3288, 0.1125, 0.3375);
    expect(best.hi).toBeCloseTo(0.3375, 12);
    expect(best.hi).toBeGreaterThanOrEqual(0.3288);
  });

  it("is monotone: faster parents never display a lower max", () => {
    const speeds = [0.15, 0.2, 0.25, 0.2966, 0.31, 0.3288, 0.3375];
    const his = speeds.map(
      (s) => expectedFoalRange(s, s, 0.1125, 0.3375).hi,
    );
    for (let i = 1; i < his.length; i++) {
      expect(his[i]).toBeGreaterThanOrEqual(his[i - 1]);
    }
  });
});

describe("longestLineage", () => {
  it("finds the longest unbroken chain", () => {
    const herd = [
      { id: "a", parentId1: "", parentId2: "" },
      { id: "b", parentId1: "a", parentId2: "" },
      { id: "c", parentId1: "b", parentId2: "" },
      { id: "d", parentId1: "", parentId2: "" },
    ];
    expect(longestLineage(herd)).toEqual({
      depth: 3,
      chainIds: ["c", "b", "a"],
    });
  });

  it("terminates on cyclic data", () => {
    const herd = [
      { id: "x", parentId1: "y", parentId2: "" },
      { id: "y", parentId1: "x", parentId2: "" },
    ];
    const { depth } = longestLineage(herd);
    expect(depth).toBeLessThanOrEqual(3);
  });

  it("is empty-safe", () => {
    expect(longestLineage([])).toEqual({ depth: 0, chainIds: [] });
  });
});

describe("ancestryOverlap", () => {
  // a <- b <- d, a <- c (siblings b,c; d child of b)
  const herd = [
    { id: "a", parentId1: "", parentId2: "" },
    { id: "b", parentId1: "a", parentId2: "" },
    { id: "c", parentId1: "a", parentId2: "" },
    { id: "d", parentId1: "b", parentId2: "" },
  ];

  it("measures shared ancestry (siblings share their parent)", () => {
    expect(ancestryOverlap(herd, "b", "c")).toEqual({
      shared: 1,
      total: 1,
      pct: 1,
    });
  });

  it("is zero for unrelated horses", () => {
    expect(ancestryOverlap(herd, "b", "a")).toEqual({
      shared: 0,
      total: 1,
      pct: 0,
    });
  });

  it("is zero when neither has ancestors", () => {
    expect(
      ancestryOverlap([{ id: "a" }, { id: "z" }], "a", "z"),
    ).toEqual({ shared: 0, total: 0, pct: 0 });
  });
});

describe("planSequentialPairings", () => {
  const herd = [
    { id: "a", speed: 0.3, status: "Alive" },
    { id: "b", speed: 0.2, status: "Alive" },
    { id: "c", speed: 0.25, status: "Alive" },
    { id: "d", speed: 0.28, status: "Alive" },
    { id: "dead", speed: 0.33, status: "Deceased" },
    { id: "retired", speed: 0.33, status: "Retired" },
  ];

  it("pairs strictly in speed order, each horse exactly once", () => {
    const { pairs, benched } = planSequentialPairings(herd);
    // Sorted: a(0.3) d(0.28) c(0.25) b(0.2) → (a,d) (b,c), nobody benched.
    expect(pairs.map((p) => [p.sireId, p.damId])).toEqual([
      ["a", "d"],
      ["b", "c"],
    ]);
    expect(pairs[0].midSpeed).toBeCloseTo(0.29, 9);
    expect(benched).toBeNull();
    const used = pairs.flatMap((p) => [p.sireId, p.damId]);
    expect(new Set(used).size).toBe(used.length);
  });

  it("benches the slowest horse of an odd pool", () => {
    const { pairs, benched } = planSequentialPairings(
      herd.filter((h) => h.id !== "d"),
    );
    expect(pairs.map((p) => [p.sireId, p.damId])).toEqual([["a", "c"]]);
    expect(benched).toBe("b");
  });

  it("excludes Deceased and Retired from the pool", () => {
    const { pairs, benched } = planSequentialPairings(herd);
    const used = pairs.flatMap((p) => [p.sireId, p.damId]);
    expect(used).not.toContain("dead");
    expect(used).not.toContain("retired");
    expect(benched).not.toBe("dead");
  });

  it("still pairs relatives in strict order but flags them when policy is off", () => {
    const family = [
      { id: "sire", speed: 0.3, status: "Alive" },
      { id: "foal", speed: 0.29, status: "Alive", parentId1: "sire", parentId2: "other" },
      { id: "other", speed: 0.2, status: "Alive" },
      { id: "slow", speed: 0.1, status: "Alive" },
    ];
    const strict = planSequentialPairings(family, { allowCloseRelativeBreeding: true });
    expect(strict.pairs[0]).toMatchObject({ sireId: "foal", damId: "sire", blocked: false });
    const flagged = planSequentialPairings(family, { allowCloseRelativeBreeding: false });
    expect(flagged.pairs[0].blocked).toBe(true);
    // Unrelated pair is never blocked.
    expect(flagged.pairs[1].blocked).toBe(false);
  });

  it("is empty-safe and honors the limit", () => {
    expect(planSequentialPairings([])).toEqual({ pairs: [], benched: null });
    expect(planSequentialPairings([{ id: "solo", speed: 0.3 }])).toEqual({
      pairs: [],
      benched: "solo",
    });
    expect(planSequentialPairings(herd, { limit: 1 }).pairs).toHaveLength(1);
  });
});

describe("heritabilityPoints / linearRegression", () => {
  const herd = [
    { id: "sire", speed: 10 },
    { id: "dam", speed: 12 },
    { id: "foal1", parentId1: "sire", parentId2: "dam", speed: 11 },
    { id: "foal2", parentId1: "sire", parentId2: "dam", speed: 13 },
    { id: "orphan", speed: 9 },
  ];

  it("pairs each foal with its mid-parent stat", () => {
    expect(heritabilityPoints(herd, "speed")).toEqual([
      { x: 11, y: 11 },
      { x: 11, y: 13 },
    ]);
  });

  it("fits a perfect line with R² = 1", () => {
    expect(
      linearRegression([
        { x: 1, y: 2 },
        { x: 2, y: 4 },
        { x: 3, y: 6 },
      ]),
    ).toEqual({ slope: 2, intercept: 0, r2: 1, n: 3, seSlope: 0, slopeCI: [2, 2] });
  });

  it("reports slope uncertainty", () => {
    const r = linearRegression([
      { x: 1, y: 1 },
      { x: 2, y: 2.5 },
      { x: 3, y: 2.5 },
      { x: 4, y: 4 },
    ]);
    expect(r.seSlope).toBeGreaterThan(0);
    expect(r.slopeCI?.[0]).toBeLessThan(r.slope);
    expect(r.slopeCI?.[1]).toBeGreaterThan(r.slope);
  });

  it("is empty-safe", () => {
    expect(heritabilityPoints([], "speed")).toEqual([]);
    expect(linearRegression([])).toEqual({ slope: 0, intercept: 0, r2: 0, n: 0, seSlope: null, slopeCI: null });
  });
});

describe("inbreedingRanking / bloodlineDiversity", () => {
  it("ranks the foal of relatives above the foal of founders", () => {
    const herd = [
      { id: "a", parentId1: null, parentId2: null },
      { id: "b", parentId1: null, parentId2: null },
      { id: "c", parentId1: "a", parentId2: "b" },
      { id: "inbred", parentId1: "a", parentId2: "c" },
      { id: "clean", parentId1: "a", parentId2: "b" },
    ];
    const ranks = inbreedingRanking(herd);
    expect(ranks[0].id).toBe("inbred");
    expect(ranks[0].shared).toBeGreaterThan(0);
    expect(ranks.find((r) => r.id === "clean")?.shared).toBe(0);
  });

  it("measures diversity: pure herd = 1 effective bloodline", () => {
    expect(bloodlineDiversity([{ total: 5 }])).toEqual({
      shannon: 0,
      effective: 1,
      topShare: 1,
      richness: 1,
      shannonMM: 0,
      effectiveMM: 1,
    });
    const even = bloodlineDiversity([{ total: 1 }, { total: 1 }]);
    expect(even.effective).toBeCloseTo(2, 9);
    expect(even.topShare).toBeCloseTo(0.5, 9);
    // Miller-Madow lifts the plug-in estimate at small n: ln2 + 1/4.
    expect(even.shannonMM).toBeCloseTo(Math.LN2 + 0.25, 9);
    expect(bloodlineDiversity([])).toEqual({ shannon: 0, effective: 0, topShare: 0, richness: 0, shannonMM: 0, effectiveMM: 0 });
  });

  it("computes Wright's inbreeding coefficient", () => {
    // sire × daughter (d is sire's daughter): sire is a common ancestor
    // at distances 0 and 1 → F = (1/2)^2 = 0.25.
    const herd = [
      { id: "sire", parentId1: null, parentId2: null },
      { id: "dam", parentId1: null, parentId2: null },
      { id: "daughter", parentId1: "sire", parentId2: "dam" },
      { id: "foal", parentId1: "sire", parentId2: "daughter" },
      { id: "clean", parentId1: "sire", parentId2: "dam" },
    ];
    expect(inbreedingCoefficient(herd, "foal")).toBeCloseTo(0.25, 9);
    expect(inbreedingCoefficient(herd, "clean")).toBe(0);
    expect(inbreedingCoefficient(herd, "sire")).toBe(0);
  });
});

describe("filterHorsesByScope", () => {
  const herd = [
    { generation: 0, status: "Alive" },
    { generation: 1, status: "Alive" },
    { generation: 2, status: "Deceased" },
    { generation: 3, status: "Alive" },
    { generation: 4, status: "Retired" },
  ];

  it("keeps an inclusive generation range", () => {
    expect(filterHorsesByScope(herd, { from: 1, to: 3 })).toEqual([
      { generation: 1, status: "Alive" },
      { generation: 2, status: "Deceased" },
      { generation: 3, status: "Alive" },
    ]);
  });

  it("covers cumulative history when from is the earliest generation", () => {
    expect(filterHorsesByScope(herd, { from: 0, to: 2 })).toHaveLength(3);
  });

  it("treats missing generations as 0", () => {
    expect(filterHorsesByScope([{}], { from: 0, to: 0 })).toEqual([{}]);
    expect(filterHorsesByScope([{}], { from: 1, to: 2 })).toEqual([]);
  });

  it("normalizes swapped bounds", () => {
    expect(filterHorsesByScope(herd, { from: 3, to: 1 })).toEqual(
      filterHorsesByScope(herd, { from: 1, to: 3 }),
    );
  });

  it("applies the status filter and defaults to All", () => {
    expect(
      filterHorsesByScope(herd, { from: 0, to: 4, status: "Alive" }),
    ).toHaveLength(3);
    expect(filterHorsesByScope(herd, { from: 0, to: 4 })).toHaveLength(5);
  });

  it("is empty-safe", () => {
    expect(filterHorsesByScope([], { from: 0, to: 4 })).toEqual([]);
  });
});

describe("niceHistogram", () => {
  it("bins clustered values with nice widths and true range labels", () => {
    const bins = niceHistogram([12.4, 12.41, 12.55, 13.9], 2);
    expect(bins.length).toBeGreaterThan(1);
    expect(bins.length).toBeLessThanOrEqual(16);
    expect(bins.reduce((t, b) => t + b.count, 0)).toBe(4);
    for (const b of bins) {
      expect(b.label).toContain("–");
      expect(b.end).toBeGreaterThan(b.start);
    }
  });

  it("collapses degenerate input to a single bin", () => {
    const bins = niceHistogram([5, 5, 5], 2);
    expect(bins).toHaveLength(1);
    expect(bins[0].count).toBe(3);
  });

  it("is empty-safe", () => {
    expect(niceHistogram([], 2)).toEqual([]);
    expect(niceHistogram([NaN, Infinity], 2)).toEqual([]);
  });
});

describe("variantBloodlineShares", () => {
  it("splits hybrids by DNA weight so totals stay exact", () => {
    const cells = variantBloodlineShares([
      { variant: 1, dna: { A: 0.5, B: 0.5 } },
      { variant: 1, dna: { A: 1.0 } },
    ]);
    const a = cells.find((c) => c.bloodline === "A");
    const b = cells.find((c) => c.bloodline === "B");
    expect(a?.share).toBeCloseTo(1.5, 9);
    expect(b?.share).toBeCloseTo(0.5, 9);
    expect(a?.horses).toBe(2);
    expect(b?.horses).toBe(1);
    // Fractional shares still sum to the horse count.
    expect(cells.reduce((t, c) => t + c.share, 0)).toBeCloseTo(2, 9);
  });

  it("falls back to Unknown when DNA is missing", () => {
    expect(variantBloodlineShares([{ variant: 2, dna: {} }])).toEqual([
      { variant: 2, bloodline: "Unknown", share: 1, horses: 1 },
    ]);
  });

  it("skips non-numeric variants", () => {
    expect(variantBloodlineShares([{ variant: "x", dna: { A: 1 } }])).toEqual([]);
  });
});
