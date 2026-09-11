import dagre from 'dagre';
// Type-only imports: layout.ts must stay runnable in plain node/vitest,
// so runtime imports are limited to dagre plus relative pure utils.
import type { Edge } from '@xyflow/react';
import type { HorseNode } from '@/components/HorseNode/HorseNode';
import { translateStat } from './translateRawStats';

const VERTICAL_SPACING = 200;
const NODE_HEIGHT = 80;

export type NodeDensity = 'full' | 'compact' | 'minimal';

/** Density slider stops, in order. Add a level here to extend the slider. */
export const DENSITY_LEVELS: NodeDensity[] = ['full', 'compact', 'minimal'];

/**
 * Single source of truth for the node footprint per density level.
 * HorseNode caps its rendered width (ellipsis + tooltip) at these same
 * widths, so the spacing math below always holds on screen.
 */
export const DENSITY_CONFIG: Record<NodeDensity, { nodeWidth: number; gap: number }> = {
  full: { nodeWidth: 260, gap: 40 },
  compact: { nodeWidth: 180, gap: 28 },
  minimal: { nodeWidth: 96, gap: 20 },
};

export const DENSITY_LABELS: Record<NodeDensity, string> = {
  full: 'Full',
  compact: 'Compact',
  minimal: 'Minimal',
};

/**
 * Sweep-and-push: enforce a minimum step between node centers along one
 * row, preserving dagre's left-to-right order, then recenter the row on
 * dagre's original centroid. Guarantees zero overlap by construction.
 * Ties break by id so output is deterministic across runs.
 */
export function sweepRow(
  centers: { id: string; x: number }[],
  nodeWidth: number,
  gap: number,
): Map<string, number> {
  const step = nodeWidth + gap;
  const sorted = [...centers].sort((a, b) => a.x - b.x || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const placed = new Map<string, number>();
  if (sorted.length === 0) return placed;
  let cursor = sorted[0].x;
  for (const n of sorted) {
    const x = Math.max(n.x, cursor);
    placed.set(n.id, x);
    cursor = x + step;
  }
  const before = sorted.reduce((t, n) => t + n.x, 0) / sorted.length;
  let after = 0;
  for (const x of placed.values()) after += x;
  after /= placed.size;
  const shift = before - after;
  if (shift !== 0) {
    for (const [id, x] of placed) placed.set(id, x + shift);
  }
  return placed;
}

export const getBaseLayout = (nodes: HorseNode[], edges: Edge[], density: NodeDensity = 'full') => {
  const { nodeWidth, gap } = DENSITY_CONFIG[density];
  const dagreGraph = new dagre.graphlib.Graph();

  dagreGraph.setGraph({
    rankdir: 'TB',
    nodesep: gap,
    ranksep: VERTICAL_SPACING,
    ranker: 'network-simplex',
  });

  dagreGraph.setDefaultEdgeLabel(() => ({}));

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: NODE_HEIGHT });
  });

  const genMap = new Map(nodes.map(n => [n.id, n.data.horse.generation || 0]));

  edges.forEach((edge) => {
    if (dagreGraph.hasNode(edge.source) && dagreGraph.hasNode(edge.target)) {
      const sourceGen = genMap.get(edge.source) || 0;
      const targetGen = genMap.get(edge.target) || 0;
      const generationDiff = Math.max(1, targetGen - sourceGen);
      dagreGraph.setEdge(edge.source, edge.target, { minlen: generationDiff });
    }
  });

  dagre.layout(dagreGraph);

  // Dagre's x positions assume dagre's own row assignment, which we
  // replace with generation rows below — so re-enforce spacing per row.
  // Without this pass, nodes dagre stacked on different ranks collapse
  // onto one generation row and overlap.
  const rows = new Map<number, { id: string; x: number }[]>();
  for (const node of nodes) {
    const gen = node.data.horse.generation || 0;
    const list = rows.get(gen);
    const center = dagreGraph.node(node.id).x;
    if (list) list.push({ id: node.id, x: center });
    else rows.set(gen, [{ id: node.id, x: center }]);
  }
  const fixed = new Map<string, number>();
  for (const [, row] of rows) {
    for (const [id, x] of sweepRow(row, nodeWidth, gap)) fixed.set(id, x);
  }

  return nodes.map((node) => {
    const gen = node.data.horse.generation || 0;

    return {
      ...node,
      data: { ...node.data, activeView: 'base' as const },
      position: {
        x: (fixed.get(node.id) ?? 0) - (nodeWidth / 2),
        y: gen * VERTICAL_SPACING,
      },
    };
  });
};

export const getSortLayout = (nodes: HorseNode[], sortBy: 'speed' | 'jump' | 'health', density: NodeDensity = 'full') => {
  const { nodeWidth, gap: horizontalGap } = DENSITY_CONFIG[density];

  const generations: Record<number, HorseNode[]> = {};

  nodes.forEach((node) => {
    const gen = node.data.horse.generation ?? 0;
    if (!generations[gen]) generations[gen] = [];
    generations[gen].push(node);
  });

  Object.keys(generations).forEach((key) => {
    // Translated values (dashboard convention): the row is ordered by
    // what the node actually displays.
    generations[Number(key)].sort((a, b) => {
      const valA = translateStat(sortBy, a.data.horse[sortBy] || 0);
      const valB = translateStat(sortBy, b.data.horse[sortBy] || 0);
      return valB - valA;
    });
  });

  return nodes.map((node) => {
    const gen = node.data.horse.generation ?? 0;
    const row = generations[gen];
    const indexInRow = row.findIndex((n) => n.id === node.id);
    const rowWidth = (row.length * (nodeWidth + horizontalGap));
    const centeringOffset = -rowWidth / 2;

    return {
      ...node,
      position: {
        x: centeringOffset + (indexInRow * (nodeWidth + horizontalGap)),
        y: gen * VERTICAL_SPACING,
      },
      data: { ...node.data, activeView: sortBy }
    };
  });
};
