import { describe, expect, it } from "vitest";
import type { Edge } from "@xyflow/react";
import type { Horse } from "@/types/horse";
import type { HorseNode } from "@/components/HorseNode/HorseNode";
import {
  DENSITY_CONFIG,
  DENSITY_LEVELS,
  getBaseLayout,
  getSortLayout,
  sweepRow,
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

  it("leaves already-spaced rows and single nodes untouched", () => {
    const out = sweepRow(
      [
        { id: "a", x: -500 },
        { id: "b", x: 500 },
      ],
      260,
      40,
    );
    expect(out.get("a")).toBe(-500);
    expect(out.get("b")).toBe(500);
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
