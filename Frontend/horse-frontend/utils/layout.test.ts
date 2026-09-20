import { describe, expect, it } from "vitest";
import type { Edge } from "@xyflow/react";
import type { Horse } from "@/types/horse";
import type { HorseNode } from "@/components/HorseNode/HorseNode";
import {
  DENSITY_CONFIG,
  DENSITY_LEVELS,
  getBaseLayout,
  getFamilyLaneLayout,
  getLineageLayout,
  getSortLayout,
  sweepRow,
  timeSpacingFor,
  type NodeDensity,
} from "./layout";

function horse(id: string, generation: number, speed = 0.2, family = "Fam"): Horse {
  return {
    id,
    firstName: "Test",
    familyName: family,
    dna: {},
    status: "Alive",
    speed,
    jump: 0.7,
    health: 20,
    variant: 0,
    generation,
  } as Horse;
}

function node(id: string, generation: number, speed = 0.2, family = "Fam"): HorseNode {
  return {
    id,
    type: "horseNode",
    position: { x: 0, y: 0 },
    data: { horse: horse(id, generation, speed, family) },
  } as HorseNode;
}

function edge(source: string, target: string): Edge {
  return { id: `e-${source}-${target}`, source, target } as Edge;
}

// Diamond pedigree plus a skipped-generation edge (the minlen > 1 case)
// plus unrelated founders — the shape that collapsed rows in the old code.
function pedigree(): { nodes: HorseNode[]; edges: Edge[] } {
  const nodes = [
    node("sire", 0, 0.3),
    node("dam", 0, 0.25),
    node("foal", 1, 0.28),
    node("grandfoal", 2, 0.32),
    node("stray-a", 0, 0.2),
    node("stray-b", 1, 0.22),
  ];
  const edges = [
    edge("sire", "foal"),
    edge("dam", "foal"),
    edge("foal", "grandfoal"),
    edge("sire", "grandfoal"),
    edge("stray-a", "stray-b"),
  ];
  return { nodes, edges };
}

describe("sweepRow", () => {
  it("pushes overlapping centers apart, preserving order", () => {
    const out = sweepRow(
      [
        { id: "a", x: 0 },
        { id: "b", x: 10 },
        { id: "c", x: 1000 },
      ],
      260,
      40,
    );
    expect(out.get("a")).toBeLessThan(out.get("b")!);
    expect(out.get("b")! - out.get("a")!).toBeGreaterThanOrEqual(300);
    expect(out.get("c")! - out.get("b")!).toBeGreaterThanOrEqual(300);
  });

  it("leaves single nodes untouched", () => {
    expect(sweepRow([{ id: "solo", x: 123 }], 260, 40).get("solo")).toBe(123);
  });

  it("recenters on the original centroid and breaks ties deterministically", () => {
    const first = sweepRow(
      [
        { id: "a", x: 50 },
        { id: "b", x: 50 },
      ],
      100,
      10,
    );
    const second = sweepRow(
      [
        { id: "b", x: 50 },
        { id: "a", x: 50 },
      ],
      100,
      10,
    );
    expect([...first.entries()]).toEqual([...second.entries()]);
    expect((first.get("a")! + first.get("b")!) / 2).toBeCloseTo(50, 9);
  });

  it("compacts dagre spread into exact even spacing, order preserved", () => {
    // Simulates dagre emitting a horse-sized hole between b and c.
    const out = sweepRow(
      [
        { id: "a", x: 0 },
        { id: "b", x: 300 },
        { id: "c", x: 2000 },
      ],
      260,
      40,
    );
    const xs = ["a", "b", "c"].map((id) => out.get(id)!);
    expect(xs[1] - xs[0]).toBeCloseTo(300, 9);
    expect(xs[2] - xs[1]).toBeCloseTo(300, 9);
    expect((xs[0] + xs[1] + xs[2]) / 3).toBeCloseTo((0 + 300 + 2000) / 3, 9);
  });
});

describe("getBaseLayout", () => {
  it.each(DENSITY_LEVELS)(
    "never overlaps same-generation nodes at %s density",
    (density: NodeDensity) => {
      const { nodes, edges } = pedigree();
      const laid = getBaseLayout(nodes, edges, density);
      const { nodeWidth, gap } = DENSITY_CONFIG[density];
      const byGen = new Map<number, number[]>();
      for (const n of laid) {
        const gen = n.data.horse.generation || 0;
        expect(n.position.y).toBe(gen * 200);
        const list = byGen.get(gen) ?? [];
        list.push(n.position.x);
        byGen.set(gen, list);
      }
      for (const xs of byGen.values()) {
        const sorted = [...xs].sort((a, b) => a - b);
        for (let i = 1; i < sorted.length; i++) {
          expect(sorted[i] - sorted[i - 1]).toBeGreaterThanOrEqual(
            nodeWidth + gap - 1e-6,
          );
        }
      }
    },
  );

  it("is deterministic across runs", () => {
    const { nodes, edges } = pedigree();
    const first = getBaseLayout(nodes, edges, "full");
    const second = getBaseLayout(nodes, edges, "full");
    expect(first.map((n) => n.position)).toEqual(
      second.map((n) => n.position),
    );
  });

  it("groups each row by family, dagre order within families", () => {
    // Interleaved insertion: families must still read as blocks.
    const nodes = [
      node("m1", 0, 0.2, "Mandragoran"),
      node("l1", 0, 0.2, "Longbottom"),
      node("m2", 0, 0.2, "Mandragoran"),
      node("l2", 0, 0.2, "Longbottom"),
    ];
    const laid = getBaseLayout(nodes, [], "full");
    const order = [...laid]
      .sort((a, b) => a.position.x - b.position.x)
      .map((n) => n.id);
    expect(order).toEqual(["l1", "l2", "m1", "m2"]);
  });

  it("falls back to DNA surnames when no family name is stored", () => {
    const nodes = [
      node("x", 0, 0.2, ""),
      node("y", 0, 0.2, "Longbottom"),
    ];
    nodes[0].data.horse.dna = { Emberhoof: 1.0 };
    const laid = getBaseLayout(nodes, [], "full");
    const order = [...laid]
      .sort((a, b) => a.position.x - b.position.x)
      .map((n) => n.id);
    expect(order).toEqual(["x", "y"]);
  });
});

describe("getSortLayout", () => {
  it("orders each row by displayed (translated) stat, spaced without overlap", () => {
    const { nodes } = pedigree();
    const laid = getSortLayout(nodes, "speed", "compact");
    const { nodeWidth, gap } = DENSITY_CONFIG.compact;
    const row = laid
      .filter((n) => (n.data.horse.generation || 0) === 0)
      .sort((a, b) => a.position.x - b.position.x);
    const speeds = row.map((n) => n.data.horse.speed);
    expect(speeds).toEqual([0.3, 0.25, 0.2]);
    for (let i = 1; i < row.length; i++) {
      expect(row[i].position.x - row[i - 1].position.x).toBeGreaterThanOrEqual(
        nodeWidth + gap - 1e-6,
      );
    }
  });
});

describe("orientation (TB/LR)", () => {
  it("LR turns generations into spaced columns with non-overlapping stacks", () => {
    const { nodes, edges } = pedigree();
    const laid = getBaseLayout(nodes, edges, "full", "LR");
    const spacing = timeSpacingFor("full", "LR");
    expect(spacing).toBeGreaterThan(DENSITY_CONFIG.full.nodeWidth);
    for (const n of laid) {
      expect(n.position.x).toBe((n.data.horse.generation || 0) * spacing);
      expect(n.data.orientation).toBe("LR");
    }
    const byGen = new Map<number, number[]>();
    for (const n of laid) {
      const list = byGen.get(n.data.horse.generation || 0) ?? [];
      list.push(n.position.y);
      byGen.set(n.data.horse.generation || 0, list);
    }
    for (const ys of byGen.values()) {
      const sorted = [...ys].sort((a, b) => a - b);
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i] - sorted[i - 1]).toBeGreaterThanOrEqual(100 + 40 - 1e-6);
      }
    }
  });

  it("TB keeps the legacy row pitch and defaults orientation", () => {
    const { nodes, edges } = pedigree();
    const laid = getBaseLayout(nodes, edges, "full");
    for (const n of laid) {
      expect(n.position.y).toBe((n.data.horse.generation || 0) * 200);
      expect(n.data.orientation ?? "TB").toBe("TB");
    }
  });

  it("sort layout mirrors across orientations", () => {
    const { nodes } = pedigree();
    const tb = getSortLayout(nodes, "speed", "compact", "TB");
    const lr = getSortLayout(nodes, "speed", "compact", "LR");
    const orderTB = [...tb]
      .filter((n) => (n.data.horse.generation || 0) === 0)
      .sort((a, b) => a.position.x - b.position.x)
      .map((n) => n.id);
    const orderLR = [...lr]
      .filter((n) => (n.data.horse.generation || 0) === 0)
      .sort((a, b) => a.position.y - b.position.y)
      .map((n) => n.id);
    expect(orderLR).toEqual(orderTB);
  });
});

describe("getFamilyLaneLayout", () => {
  it("keeps each family in a contiguous lane, alphabetical", () => {
    const nodes = [
      node("m1", 0, 0.2, "Mandragoran"),
      node("l1", 0, 0.2, "Longbottom"),
      node("m2", 1, 0.2, "Mandragoran"),
      node("l2", 1, 0.2, "Longbottom"),
    ];
    const laid = getFamilyLaneLayout(nodes, [], "full", "TB");
    for (const gen of [0, 1]) {
      const row = laid
        .filter((n) => (n.data.horse.generation || 0) === gen)
        .sort((a, b) => a.position.x - b.position.x)
        .map((n) => n.id);
      expect(row).toEqual(["l1", "m1"].map((id) => id.replace("1", String(gen === 0 ? "1" : "2"))));
    }
    // Lanes align across generations: same family, same x.
    const byId = new Map(laid.map((n) => [n.id, n.position.x]));
    expect(byId.get("l1")).toBeCloseTo(byId.get("l2")!, 9);
    expect(byId.get("m1")).toBeCloseTo(byId.get("m2")!, 9);
  });

  it("places hyphenated hybrids in their primary lane only, once", () => {
    const nodes = [node("h", 0, 0.2, "Aurelian-Baguette"), node("a", 0, 0.2, "Aurelian")];
    const laid = getFamilyLaneLayout(nodes, [], "full", "TB");
    expect(laid).toHaveLength(2);
    const xs = [...laid].sort((a, b) => a.position.x - b.position.x);
    // Same primary family => adjacent, no duplication.
    expect(xs[0].position.x).toBeLessThan(xs[1].position.x);
  });
});

describe("getLineageLayout", () => {
  function chain() {
    const gp1 = node("gp1", 0);
    const gp2 = node("gp2", 0);
    const parent = node("parent", 1);
    (parent.data.horse as Horse).parentId1 = "gp1";
    (parent.data.horse as Horse).parentId2 = "gp2";
    const focus = node("focus", 2);
    (focus.data.horse as Horse).parentId1 = "parent";
    (focus.data.horse as Horse).parentId2 = "gp2";
    const child = node("child", 3);
    (child.data.horse as Horse).parentId1 = "focus";
    (child.data.horse as Horse).parentId2 = "gp1";
    return [gp1, gp2, parent, focus, child];
  }

  it("orders ancestors left, focus center, descendants right", () => {
    const laid = getLineageLayout(chain(), "focus", "full");
    const byId = new Map(laid.map((n) => [n.id, n.position.x]));
    expect(byId.get("gp1")!).toBeLessThan(byId.get("parent")!);
    expect(byId.get("parent")!).toBeLessThan(byId.get("focus")!);
    expect(byId.get("focus")!).toBeLessThan(byId.get("child")!);
    for (const n of laid) {
      expect(n.data.orientation).toBe("LR");
    }
  });

  it("is deterministic and cycle-safe", () => {
    const nodes = chain();
    const first = getLineageLayout(nodes, "focus", "full");
    const second = getLineageLayout(nodes, "focus", "full");
    expect(first.map((n) => n.position)).toEqual(second.map((n) => n.position));
  });
});
