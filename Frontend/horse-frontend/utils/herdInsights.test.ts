import { describe, expect, it } from "vitest";
import {
  bubbleWatch,
  deceasedVsLiving,
  founderLegacy,
  inbreedingSplit,
  parentReliability,
  pearson,
  purityTrend,
  recordByGeneration,
  statCorrelations,
  untriedBloodlineCrosses,
  varianceByGeneration,
  variantIdOf,
  variantUnlockHints,
  VARIANT_TOTAL,
} from "./herdInsights";

describe("bubbleWatch", () => {
  it("lists horses around each cut with signed distance", () => {
    const ranked = {
      speed: ["a", "b", "c", "d"],
      jump: ["a", "b"],
      health: ["a"],
    };
    const values: Record<string, { speed: number; jump: number; health: number }> = {
      a: { speed: 14, jump: 5, health: 25 },
      b: { speed: 13, jump: 4, health: 20 },
      c: { speed: 12, jump: 3, health: 15 },
      d: { speed: 11, jump: 2, health: 10 },
    };
    const out = bubbleWatch(ranked, (id) => values[id], { speed: 12, jump: 4, health: 20 }, { speed: 3, jump: 1, health: 1 });
    // Speed cut at rank 3 (value 12): c inside by 0, d outside by -1.
    expect(out.speed.find((r) => r.id === "c")).toMatchObject({ rank: 3, delta: 0, inside: true });
    expect(out.speed.find((r) => r.id === "d")).toMatchObject({ rank: 4, delta: -1, inside: false });
    expect(out.jump.find((r) => r.id === "b")).toMatchObject({ inside: false });
  });

  it("is empty-safe", () => {
    expect(
      bubbleWatch({ speed: [], jump: [], health: [] }, () => ({ speed: 1, jump: 1, health: 1 }), { speed: null, jump: null, health: null }, { speed: 63, jump: 16, health: 16 }),
    ).toEqual({ speed: [], jump: [], health: [] });
  });
});

describe("parentReliability", () => {
  it("compares foal averages against the parent's own stats", () => {
    const out = parentReliability(
      [
        { id: "f1", parentId1: "s", parentId2: "d", speed: 14, jump: 5, health: 25 },
        { id: "f2", parentId1: "s", parentId2: "d", speed: 10, jump: 3, health: 15 },
      ],
      (id) => (id === "s" ? { speed: 12, jump: 4, health: 20 } : { speed: null, jump: null, health: null }),
    );
    const sire = out.find((r) => r.parentId === "s");
    expect(sire).toMatchObject({ foals: 2, bestFoalId: "f1", worstFoalId: "f2" });
    expect(sire?.foalAvg.speed).toBeCloseTo(12, 9);
    expect(sire?.delta.speed).toBeCloseTo(0, 9);
    // Unknown parent yields null deltas.
    expect(out.find((r) => r.parentId === "d")?.delta.speed).toBeNull();
  });
});

describe("untriedBloodlineCrosses", () => {
  const bloodlineOf = (id: string) =>
    ({ s1: "A", s2: "B", d1: "A", d2: "B" })[id] ?? "Unknown";
  const active = [
    { id: "s1", dna: { A: 1 }, speed: 14 },
    { id: "d1", dna: { A: 1 }, speed: 13 },
    { id: "s2", dna: { B: 1 }, speed: 12 },
    { id: "d2", dna: { B: 1 }, speed: 11 },
  ];

  it("marks bloodline crosses with no recorded foals as untried", () => {
    const cells = untriedBloodlineCrosses(active, [], bloodlineOf);
    // Pairs are (s1,d1)=A×A and (s2,d2)=B×B; A×B never paired.
    const axb = cells.find((c) => c.b1 === "A" && c.b2 === "B");
    expect(axb).toMatchObject({ triedFoals: 0, activePairs: 0 });
    const axa = cells.find((c) => c.b1 === "A" && c.b2 === "A");
    expect(axa?.activePairs).toBe(1);
  });

  it("counts recorded foals per cross", () => {
    const cells = untriedBloodlineCrosses(
      active,
      [{ parentId1: "s1", parentId2: "s2", children: 2 }],
      bloodlineOf,
    );
    expect(cells.find((c) => c.b1 === "A" && c.b2 === "B")?.triedFoals).toBe(2);
  });
});

describe("variantUnlockHints", () => {
  it("covers all 35 combos and suggests producing pairs", () => {
    expect(VARIANT_TOTAL).toBe(35);
    // Only variant 0 observed; active horses wear 0 and 1.
    const hints = variantUnlockHints([0], [0, 1]);
    expect(hints).toHaveLength(34);
    // Missing variant color=1/pattern=0 (id 1) is already worn → pair exists.
    const one = hints.find((h) => h.missingVariant === 1);
    expect(one?.examplePairs.length).toBeGreaterThan(0);
    // Missing color=2 needs a holder nobody has → no pairs.
    const two = hints.find((h) => h.missingVariant === 2);
    expect(two?.examplePairs).toHaveLength(0);
    expect(variantIdOf(2, 3)).toBe(2 + 3 * 256);
  });
});

describe("founderLegacy", () => {
  it("counts living and active descendants per founder", () => {
    const horses = [
      { id: "f", generation: 0, status: "Alive" },
      { id: "c1", parentId1: "f", generation: 1, status: "Alive" },
      { id: "c2", parentId1: "f", generation: 1, status: "Deceased" },
      { id: "g", parentId1: "c1", generation: 2, status: "Alive" },
    ];
    const out = founderLegacy(horses, new Set(["g"]));
    expect(out).toEqual([{ founderId: "f", livingDescendants: 2, activeDescendants: 1 }]);
  });
});

describe("purityTrend", () => {
  it("averages dominant share per generation", () => {
    expect(
      purityTrend([
        { generation: 0, dna: { A: 1 } },
        { generation: 1, dna: { A: 0.5, B: 0.5 } },
        { generation: 1, dna: {} },
      ]),
    ).toEqual([
      { generation: 0, avgShare: 1, count: 1 },
      { generation: 1, avgShare: 0.5, count: 1 },
    ]);
  });
});

describe("pearson / statCorrelations", () => {
  it("fits a perfect line with r = 1", () => {
    expect(pearson([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 9);
    expect(pearson([1, 2, 3], [6, 4, 2])).toBeCloseTo(-1, 9);
  });

  it("is degenerate-safe", () => {
    expect(pearson([], [])).toBe(0);
    expect(pearson([5, 5], [1, 2])).toBe(0);
  });

  it("correlates all three stat pairs", () => {
    const out = statCorrelations([
      { speed: 10, jump: 4, health: 20 },
      { speed: 12, jump: 5, health: 25 },
      { speed: 14, jump: 6, health: 30 },
    ]);
    expect(out.n).toBe(3);
    expect(out.speedJump).toBeCloseTo(1, 9);
  });
});

describe("varianceByGeneration", () => {
  it("computes std-dev per generation", () => {
    const out = varianceByGeneration([
      { generation: 0, value: 10 },
      { generation: 1, value: 10 },
      { generation: 1, value: 14 },
    ]);
    expect(out.find((p) => p.generation === 0)?.std).toBeCloseTo(0, 9);
    expect(out.find((p) => p.generation === 1)?.std).toBeCloseTo(2, 9);
  });
});

describe("inbreedingSplit", () => {
  it("separates inbred and clean foal averages", () => {
    const out = inbreedingSplit(
      [
        { id: "a", speed: 14, jump: 5, health: 25 },
        { id: "b", speed: 10, jump: 3, health: 15 },
      ],
      (id) => (id === "a" ? 2 : 0),
    );
    expect(out.inbred.n).toBe(1);
    expect(out.clean.speed).toBeCloseTo(10, 9);
  });
});

describe("recordByGeneration", () => {
  it("tracks best holder per stat per generation", () => {
    const out = recordByGeneration([
      { id: "a", generation: 0, speed: 10, jump: 4, health: 20 },
      { id: "b", generation: 0, speed: 12, jump: 3, health: 18 },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].speed?.id).toBe("b");
    expect(out[0].jump?.id).toBe("a");
  });
});

describe("deceasedVsLiving", () => {
  it("compares living averages against deceased history", () => {
    const out = deceasedVsLiving([
      { status: "Alive", speed: 14, jump: 5, health: 25 },
      { status: "Deceased", speed: 10, jump: 3, health: 15 },
    ]);
    expect(out.living.n).toBe(1);
    expect(out.deceased.speed).toBeCloseTo(10, 9);
  });
});
