import dagre from 'dagre';
// Type-only imports: layout.ts must stay runnable in plain node/vitest,
// so runtime imports are limited to dagre plus relative pure utils.
import type { Edge } from '@xyflow/react';
import type { HorseNode } from '@/components/HorseNode/HorseNode';
import { translateStat } from './translateRawStats';
// Relative import: vitest has no "@" alias configured (same reason as
// in genetics/utils.ts and lineage.ts).
import { effectiveFamily } from './studbook';

const VERTICAL_SPACING = 200;
// Stacked first/family name lines (plus the stat line) render ~100px
// tall; rows are pitched at 200px so there is no overlap risk.
const NODE_HEIGHT = 100;

/** Tree direction: generations flow down (TB) or right (LR). */
export type Orientation = 'TB' | 'LR';

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
 * Axis-agnostic even placement: sort (group, order, id), then space
 * nodes at exact size+gap intervals centered on the input centroid.
 * `sweepRow` is the TB (horizontal) specialization kept for compat.
 * Deterministic across runs.
 */
export function sweepLine(
  centers: { id: string; pos: number; group?: string }[],
  nodeSize: number,
  gap: number,
): Map<string, number> {
  const step = nodeSize + gap;
  const sorted = [...centers].sort(
    (a, b) =>
      (a.group ?? "").localeCompare(b.group ?? "") ||
      a.pos - b.pos ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
  const placed = new Map<string, number>();
  if (sorted.length === 0) return placed;
  const centroid = sorted.reduce((t, n) => t + n.pos, 0) / sorted.length;
  const start = centroid - ((sorted.length - 1) * step) / 2;
  sorted.forEach((n, i) => placed.set(n.id, start + i * step));
  return placed;
}

/**
 * Compact-even row placement: sort (group, dagre-x, id), then space
 * nodes at exact width+gap intervals centered on the input centroid.
 * Order and grouping are dagre's; distances are uniform, so gaps are
 * impossible by construction — dagre spread is never preserved.
 * Deterministic across runs.
 */
export function sweepRow(
  centers: { id: string; x: number; group?: string }[],
  nodeWidth: number,
  gap: number,
): Map<string, number> {
  return sweepLine(
    centers.map((c) => ({ id: c.id, pos: c.x, group: c.group })),
    nodeWidth,
    gap,
  );
}

/** Time-axis pitch per orientation (LR columns need full card width). */
export function timeSpacingFor(density: NodeDensity, orientation: Orientation): number {
  if (orientation === 'TB') return VERTICAL_SPACING;
  return DENSITY_CONFIG[density].nodeWidth + DENSITY_CONFIG[density].gap + 60;
}

export const getBaseLayout = (nodes: HorseNode[], edges: Edge[], density: NodeDensity = 'full', orientation: Orientation = 'TB') => {
  const { nodeWidth, gap } = DENSITY_CONFIG[density];
  const timeSpacing = timeSpacingFor(density, orientation);
  const dagreGraph = new dagre.graphlib.Graph();

  dagreGraph.setGraph({
    rankdir: orientation,
    nodesep: gap,
    ranksep: orientation === 'TB' ? VERTICAL_SPACING : timeSpacing,
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

  // Dagre's positions assume dagre's own rank assignment, which we
  // replace with generation rows (TB) or columns (LR) below — so
  // re-enforce spacing per generation. Without this pass, nodes dagre
  // stacked on different ranks collapse onto one generation line and
  // overlap. Lines are grouped by family first (bloodline blocks),
  // dagre order within each family.
  const perpSize = orientation === 'TB' ? nodeWidth : NODE_HEIGHT;
  const lines = new Map<number, { id: string; pos: number; group: string }[]>();
  for (const node of nodes) {
    const gen = node.data.horse.generation || 0;
    const list = lines.get(gen);
    const center = orientation === 'TB' ? dagreGraph.node(node.id).x : dagreGraph.node(node.id).y;
    const entry = { id: node.id, pos: center, group: effectiveFamily(node.data.horse) };
    if (list) list.push(entry);
    else lines.set(gen, [entry]);
  }
  const fixed = new Map<string, number>();
  for (const [, line] of lines) {
    for (const [id, v] of sweepLine(line, perpSize, gap)) fixed.set(id, v);
  }

  return nodes.map((node) => {
    const gen = node.data.horse.generation || 0;

    if (orientation === 'LR') {
      return {
        ...node,
        data: { ...node.data, activeView: 'base' as const, orientation },
        position: {
          x: gen * timeSpacing,
          y: (fixed.get(node.id) ?? 0) - NODE_HEIGHT / 2,
        },
      };
    }
    return {
      ...node,
      data: { ...node.data, activeView: 'base' as const, orientation },
      position: {
        x: (fixed.get(node.id) ?? 0) - (nodeWidth / 2),
        y: gen * timeSpacing,
      },
    };
  });
};

export const getSortLayout = (nodes: HorseNode[], sortBy: 'speed' | 'jump' | 'health', density: NodeDensity = 'full', orientation: Orientation = 'TB') => {
  const { nodeWidth, gap } = DENSITY_CONFIG[density];
  const timeSpacing = timeSpacingFor(density, orientation);
  const perpSize = orientation === 'TB' ? nodeWidth : NODE_HEIGHT;

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
    const rowWidth = (row.length * (perpSize + gap));
    const centeringOffset = -rowWidth / 2;

    if (orientation === 'LR') {
      return {
        ...node,
        position: {
          x: gen * timeSpacing,
          y: centeringOffset + (indexInRow * (perpSize + gap)),
        },
        data: { ...node.data, activeView: sortBy, orientation }
      };
    }
    return {
      ...node,
      position: {
        x: centeringOffset + (indexInRow * (perpSize + gap)),
        y: gen * timeSpacing,
      },
      data: { ...node.data, activeView: sortBy, orientation }
    };
  });
};

/**
 * Family lanes: strict bloodline columns (TB) or bands (LR) that stay
 * aligned across generations. Each horse sits in exactly one lane by
 * its PRIMARY effective family (hyphenated hybrids are not duplicated).
 * Within each (generation, lane) cell, dagre order decides placement.
 */
export const getFamilyLaneLayout = (nodes: HorseNode[], edges: Edge[], density: NodeDensity = 'full', orientation: Orientation = 'TB') => {
  const { nodeWidth, gap } = DENSITY_CONFIG[density];
  const timeSpacing = timeSpacingFor(density, orientation);
  const perpSize = orientation === 'TB' ? nodeWidth : NODE_HEIGHT;
  const step = perpSize + gap;
  const LANE_GAP = gap * 2;

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setGraph({
    rankdir: orientation,
    nodesep: gap,
    ranksep: orientation === 'TB' ? VERTICAL_SPACING : timeSpacing,
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

  // Lane order: alphabetical (matches familiesWithCounts record order).
  const laneOf = (id: string) => {
    const n = nodes.find((x) => x.id === id);
    return n ? effectiveFamily(n.data.horse) : "Unknown";
  };
  const laneOrder = [...new Set(nodes.map((n) => effectiveFamily(n.data.horse)))].sort((a, b) =>
    a.localeCompare(b),
  );
  // Cells keyed gen -> lane -> entries (dagre order coordinate for sorting).
  const cells = new Map<number, Map<string, { id: string; pos: number }[]>>();
  for (const node of nodes) {
    const gen = node.data.horse.generation || 0;
    const lane = laneOf(node.id);
    const orderPos = orientation === 'TB' ? dagreGraph.node(node.id).x : dagreGraph.node(node.id).y;
    let byLane = cells.get(gen);
    if (!byLane) {
      byLane = new Map();
      cells.set(gen, byLane);
    }
    const list = byLane.get(lane);
    const entry = { id: node.id, pos: orderPos };
    if (list) list.push(entry);
    else byLane.set(lane, [entry]);
  }
  // Lane spans: widest cell across generations reserves the column width
  // so lanes align vertically; minimum one slot so empty lanes hold shape.
  const laneSpan = new Map<string, number>();
  for (const lane of laneOrder) {
    let widest = 1;
    for (const [, byLane] of cells) {
      const count = byLane.get(lane)?.length ?? 0;
      if (count > widest) widest = count;
    }
    laneSpan.set(lane, widest * step);
  }
  const laneStart = new Map<string, number>();
  let cursor = 0;
  for (const lane of laneOrder) {
    laneStart.set(lane, cursor);
    cursor += (laneSpan.get(lane) ?? step) + LANE_GAP;
  }
  const totalWidth = Math.max(0, cursor - LANE_GAP);
  // Place each cell centered within its lane span.
  const fixed = new Map<string, number>();
  for (const [, byLane] of cells) {
    for (const lane of laneOrder) {
      const entries = byLane.get(lane) ?? [];
      if (entries.length === 0) continue;
      const sorted = [...entries].sort((a, b) => a.pos - b.pos || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
      const span = laneSpan.get(lane) ?? step;
      const start = (laneStart.get(lane) ?? 0) + (span - (sorted.length - 1) * step) / 2 - totalWidth / 2;
      sorted.forEach((e, i) => fixed.set(e.id, start + i * step));
    }
  }

  return nodes.map((node) => {
    const gen = node.data.horse.generation || 0;
    if (orientation === 'LR') {
      return {
        ...node,
        data: { ...node.data, activeView: 'base' as const, orientation },
        position: {
          x: gen * timeSpacing,
          y: (fixed.get(node.id) ?? 0) - NODE_HEIGHT / 2,
        },
      };
    }
    return {
      ...node,
      data: { ...node.data, activeView: 'base' as const, orientation },
      position: {
        x: (fixed.get(node.id) ?? 0) - nodeWidth / 2,
        y: gen * timeSpacing,
      },
    };
  });
};

interface LineageLink { parentId1?: string | null; parentId2?: string | null }

/**
 * Focus lineage: ancestors left, focus at 0, descendants right (fixed
 * LR time flow). Depth = shortest graph distance from the focus
 * (parents -1, grandparents -2, children +1, ...). Within a column,
 * horses order by (family, generation, id) — deterministic, no dagre.
 * Unreachable ids (shouldn't happen: callers pass the focus cone) sit
 * in a trailing column. Cycle-safe via visited sets.
 */
export const getLineageLayout = (
  nodes: HorseNode[],
  focusId: string,
  density: NodeDensity = 'full',
) => {
  const { gap } = DENSITY_CONFIG[density];
  const timeSpacing = timeSpacingFor(density, 'LR');
  const step = NODE_HEIGHT + gap;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const links = new Map<string, LineageLink>(
    nodes.map((n) => [n.id, { parentId1: n.data.horse.parentId1 ?? null, parentId2: n.data.horse.parentId2 ?? null }]),
  );
  const childrenOf = new Map<string, string[]>();
  for (const [id, link] of links) {
    for (const p of [link.parentId1, link.parentId2]) {
      if (!p || !byId.has(p) || !byId.has(id)) continue;
      const list = childrenOf.get(p);
      if (list) list.push(id);
      else childrenOf.set(p, [id]);
    }
  }
  const depth = new Map<string, number>();
  if (byId.has(focusId)) {
    depth.set(focusId, 0);
    // Ancestors: BFS up, closest depth wins.
    let frontier: string[] = [focusId];
    const seenUp = new Set<string>([focusId]);
    let d = 0;
    while (frontier.length > 0) {
      d -= 1;
      const next: string[] = [];
      for (const cur of frontier) {
        const link = links.get(cur);
        if (!link) continue;
        for (const p of [link.parentId1, link.parentId2]) {
          if (!p || !byId.has(p) || seenUp.has(p)) continue;
          seenUp.add(p);
          if (!depth.has(p)) depth.set(p, d);
          next.push(p);
        }
      }
      frontier = next;
    }
    // Descendants: BFS down, closest depth wins (never overwrites ancestors).
    frontier = [focusId];
    const seenDown = new Set<string>([focusId]);
    d = 0;
    while (frontier.length > 0) {
      d += 1;
      const next: string[] = [];
      for (const cur of frontier) {
        for (const child of childrenOf.get(cur) ?? []) {
          if (seenDown.has(child)) continue;
          seenDown.add(child);
          if (!depth.has(child)) depth.set(child, d);
          next.push(child);
        }
      }
      frontier = next;
    }
  }
  const maxDepth = Math.max(0, ...[...depth.values()].map((v) => Math.abs(v)), 0);
  const columns = new Map<number, { id: string; family: string; gen: number }[]>();
  for (const node of nodes) {
    const col = depth.get(node.id) ?? maxDepth + 1;
    const list = columns.get(col);
    const entry = {
      id: node.id,
      family: effectiveFamily(node.data.horse),
      gen: node.data.horse.generation || 0,
    };
    if (list) list.push(entry);
    else columns.set(col, [entry]);
  }
  const orderedCols = [...columns.keys()].sort((a, b) => a - b);
  const minCol = orderedCols.length > 0 ? orderedCols[0] : 0;
  const fixedY = new Map<string, number>();
  for (const col of orderedCols) {
    const entries = [...(columns.get(col) ?? [])].sort(
      (a, b) =>
        a.family.localeCompare(b.family) || a.gen - b.gen || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    );
    const start = -((entries.length - 1) * step) / 2;
    entries.forEach((e, i) => fixedY.set(e.id, start + i * step));
  }
  return nodes.map((node) => {
    const col = depth.get(node.id) ?? maxDepth + 1;
    return {
      ...node,
      data: { ...node.data, activeView: 'base' as const, orientation: 'LR' as Orientation },
      position: {
        x: (col - minCol) * timeSpacing,
        y: (fixedY.get(node.id) ?? 0) - NODE_HEIGHT / 2,
      },
    };
  });
};
