export interface FounderLegacy {
  founderId: string;
  livingDescendants: number;
  activeDescendants: number;
}

/**
 * Per generation-0 founder: living descendants + how many made the
 * active herd. Walks parent links; cycle-safe via visited set.
 */
export function founderLegacy(
  horses: { id: string; parentId1?: string | null; parentId2?: string | null; generation?: number; status?: string }[],
  activeIds: Set<string>,
): FounderLegacy[] {
  const children = new Map<string, string[]>();
  for (const h of horses) {
    for (const p of [h.parentId1, h.parentId2]) {
      if (!p) continue;
      const list = children.get(p);
      if (list) list.push(h.id);
      else children.set(p, [h.id]);
    }
  }
  const living = new Set(
    horses.filter((h) => h.status !== "Deceased").map((h) => h.id),
  );
  const founders = horses.filter((h) => (h.generation || 0) === 0);
  return founders
    .map((f) => {
      const seen = new Set<string>([f.id]);
      const queue = [f.id];
      let live = 0;
      let active = 0;
      while (queue.length > 0) {
        const cur = queue.pop() as string;
        for (const child of children.get(cur) ?? []) {
          if (seen.has(child)) continue;
          seen.add(child);
          queue.push(child);
          if (living.has(child)) live++;
          if (activeIds.has(child)) active++;
        }
      }
      return { founderId: f.id, livingDescendants: live, activeDescendants: active };
    })
    .sort((a, b) => b.activeDescendants - a.activeDescendants || b.livingDescendants - a.livingDescendants);
}
