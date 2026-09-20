import { Horse } from "@/types/horse";
// Relative import: vitest has no "@" alias configured, and this is a
// runtime (value) import (same reason as in genetics/utils.ts).
import { getHorseFullName } from "./horseNames";

export interface ParentIds {
  parentId1?: string | null;
  parentId2?: string | null;
}

/**
 * Returns the ids of every horse that descends from `horseId`
 * (children, grandchildren, ...). Uses a visited set so it terminates
 * even on already-corrupt cyclic data.
 */
export function getDescendantIds(
  horses: (Pick<Horse, "id"> & ParentIds)[],
  horseId: string,
): Set<string> {
  const childrenOf = new Map<string, string[]>();
  for (const h of horses) {
    for (const p of [h.parentId1, h.parentId2]) {
      if (p) {
        const list = childrenOf.get(p);
        if (list) list.push(h.id);
        else childrenOf.set(p, [h.id]);
      }
    }
  }

  const descendants = new Set<string>();
  const queue: string[] = [...(childrenOf.get(horseId) ?? [])];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === horseId || descendants.has(current)) continue;
    descendants.add(current);
    queue.push(...(childrenOf.get(current) ?? []));
  }
  return descendants;
}

/**
 * Returns the ids of every ancestor of `horseId` up to `maxDepth`
 * generations back (depth 1 = direct parents). The horse itself is NOT
 * included. Uses a visited set so it terminates even on already-corrupt
 * cyclic data.
 */
export function getAncestorIds(
  horses: (Pick<Horse, "id"> & ParentIds)[],
  horseId: string,
  maxDepth: number = 3,
): Set<string> {
  const byId = new Map(horses.map((h) => [h.id, h]));
  const ancestors = new Set<string>();
  let frontier: string[] = [horseId];
  for (let depth = 0; depth < maxDepth && frontier.length > 0; depth++) {
    const next: string[] = [];
    for (const current of frontier) {
      const horse = byId.get(current);
      if (!horse) continue;
      for (const p of [horse.parentId1, horse.parentId2]) {
        if (p && p !== horseId && !ancestors.has(p)) {
          ancestors.add(p);
          next.push(p);
        }
      }
    }
    frontier = next;
  }
  return ancestors;
}

export interface PairingOptions {
  /** Default true: close-relative pairings are allowed (fastest-horse-first). */
  allowCloseRelativeBreeding?: boolean;
  /** How many generations back the inbreeding buffer looks. Default 3. */
  inbreedingGenerations?: number;
  /** Shared ancestors within the buffer that trigger rejection. Default 1 (any overlap). */
  inbreedingAncestorThreshold?: number;
}

/**
 * Validates a breeding pairing (two co-parents of a foal). Pairing two
 * existing horses can never loop the tree, so this is purely about
 * inbreeding policy — and a no-op unless close-relative breeding is
 * switched off via options. Loop protection (self-parent / descendant
 * as parent) lives in `validateParents` and stays hard-blocked regardless.
 */
export function validatePairing(
  horses: (Pick<Horse, "id" | "firstName" | "familyName"> & ParentIds)[],
  parentId1?: string | null,
  parentId2?: string | null,
  options: PairingOptions = {},
): void {
  const {
    allowCloseRelativeBreeding = true,
    inbreedingGenerations = 3,
    inbreedingAncestorThreshold = 1,
  } = options;
  if (allowCloseRelativeBreeding) return;
  if (!parentId1 || !parentId2) return; // origin foal: nothing to check

  const byId = new Map(horses.map((h) => [h.id, h]));
  const nameOf = (id: string) => {
    const h = byId.get(id);
    return h ? getHorseFullName(h) : id;
  };
  const a = byId.get(parentId1);
  const b = byId.get(parentId2);

  // Direct parent-child: one horse is a direct parent of the other.
  if (a && (a.parentId1 === parentId2 || a.parentId2 === parentId2)) {
    throw new Error(
      `"${nameOf(parentId1)}" is the child of "${nameOf(parentId2)}" — parent-child breeding is switched off.`,
    );
  }
  if (b && (b.parentId1 === parentId1 || b.parentId2 === parentId1)) {
    throw new Error(
      `"${nameOf(parentId2)}" is the child of "${nameOf(parentId1)}" — parent-child breeding is switched off.`,
    );
  }

  // Full siblings: both parents recorded and identical (order-insensitive).
  const parentsOf = (h: ParentIds) =>
    [h.parentId1, h.parentId2].filter((p): p is string => !!p).sort();
  if (a && b) {
    const pa = parentsOf(a);
    const pb = parentsOf(b);
    if (
      pa.length === 2 &&
      pb.length === 2 &&
      pa[0] === pb[0] &&
      pa[1] === pb[1]
    ) {
      throw new Error(
        `"${nameOf(parentId1)}" and "${nameOf(parentId2)}" are full siblings — sibling breeding is switched off.`,
      );
    }
  }

  // N-generation buffer: ancestor sets (plus each horse itself, so a
  // grandparent-grandchild pairing also overlaps) sharing at least
  // `inbreedingAncestorThreshold` ancestors is rejected.
  const setA = getAncestorIds(horses, parentId1, inbreedingGenerations);
  setA.add(parentId1);
  const setB = getAncestorIds(horses, parentId2, inbreedingGenerations);
  setB.add(parentId2);
  let shared = 0;
  for (const id of setA) {
    if (setB.has(id)) shared++;
  }
  if (shared >= Math.max(1, inbreedingAncestorThreshold)) {
    throw new Error(
      `"${nameOf(parentId1)}" and "${nameOf(parentId2)}" share ${shared} ancestor${shared === 1 ? "" : "s"} within ${inbreedingGenerations} generation${inbreedingGenerations === 1 ? "" : "s"} — close-relative breeding is switched off.`,
    );
  }
}

/**
 * Throws if assigning `parentId1`/`parentId2` to the horse would corrupt
 * the tree. Two rules: parents come in pairs (exactly one recorded parent
 * is rejected — a legacy single-parent path no longer exists), and the
 * tree can never loop (self-parent / descendant as parent).
 * Pass `horseId` as null when creating a horse (a new node has no id yet
 * and cannot be its own ancestor).
 */
export function validateParents(
  horses: (Pick<Horse, "id" | "firstName" | "familyName"> & ParentIds)[],
  horseId: string | null,
  parentId1?: string | null,
  parentId2?: string | null,
): void {
  if ((!!parentId1 && !parentId2) || (!parentId1 && !!parentId2)) {
    throw new Error(
      "Record two parents, or none for a founder — a single recorded parent is not allowed.",
    );
  }
  const byId = new Map(horses.map((h) => [h.id, h]));
  const nameOf = (id: string) => {
    const h = byId.get(id);
    return h ? getHorseFullName(h) : id;
  };

  for (const parentId of [parentId1, parentId2]) {
    if (!parentId) continue;
    if (horseId && parentId === horseId) {
      throw new Error(
        `"${nameOf(horseId)}" cannot be its own parent. The tree cannot loop back on itself.`,
      );
    }
    if (horseId && getDescendantIds(horses, horseId).has(parentId)) {
      throw new Error(
        `"${nameOf(parentId)}" is a descendant of "${nameOf(horseId)}" and cannot be its parent. That would loop the family tree.`,
      );
    }
  }
}
