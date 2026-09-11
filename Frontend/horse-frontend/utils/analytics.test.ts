import { describe, expect, it } from "vitest";
import {
  ancestryOverlap,
  avgByGeneration,
  bloodlineShares,
  dominantBloodline,
  generationCounts,
  histogramBins,
  longestLineage,
  pairOutcomes,
  pairOutcomesVsParents,
  prolificParents,
  purityRanking,
  sharesByGeneration,
  statSummary,
  statusBreakdown,
  variantBloodlineCrosstab,
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
