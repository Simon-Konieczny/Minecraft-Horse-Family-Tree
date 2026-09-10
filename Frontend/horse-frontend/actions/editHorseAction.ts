"use server";

import { bulkUpdateGenerations, editHorse, getAllHorses, getHorseById } from "@/lib/horses";
import { Horse, editHorseRequest } from "@/types/horse";
import { processNewHorseGenetics } from "@/utils/genetics/service";
import { getDescendantIds, validatePairing, validateParents } from "@/utils/lineage";
import { breedingSettings } from "@/utils/breedingSettings";
import { revalidatePath } from 'next/cache';

export default async function editHorseAction(horse: Horse, formData: Horse) {
  const allHorses = await getAllHorses();

  // Block loops before writing: a horse can never be parented to itself
  // or to one of its own descendants.
  validateParents(allHorses, horse.id, formData.parentId1, formData.parentId2);
  // No-op while close-relative breeding is allowed (the default).
  validatePairing(allHorses, formData.parentId1, formData.parentId2, breedingSettings);

  const parentId1 = formData.parentId1;
  const parentId2 = formData.parentId2;
  let parent1, parent2;

  if (parentId1 && parentId2) {
    [parent1, parent2] = await Promise.all([
      getHorseById(parentId1),
      getHorseById(parentId2),
    ]);}

    const { dna, hexColor, generation } = processNewHorseGenetics(
      parent1,
      parent2,
    );


  const data: editHorseRequest = {
    name: horse.name,
    parentId1: formData.parentId1,
    parentId2: formData.parentId2,
    status: formData.status,
    speed: formData.speed,
    health: formData.health,
    jump: formData.jump,
    variant: formData.variant,
    dna: dna,
    hexColor: hexColor,
    generation: generation,
  };
  await editHorse(horse.id, data);

  // Keep the tree coherent: descendants of a re-parented horse must sit
  // below it, so recompute their generations top-down.
  await recomputeDescendantGenerations(allHorses, horse.id, generation);

  revalidatePath(`/horses/${horse.id}`);
}

async function recomputeDescendantGenerations(
  allHorses: Horse[],
  rootId: string,
  rootGeneration: number,
): Promise<void> {
  const byId = new Map(allHorses.map((h) => [h.id, { ...h }]));
  const root = byId.get(rootId);
  if (!root) return;
  root.generation = rootGeneration;

  const descendantIds = getDescendantIds(allHorses, rootId);

  // BFS from the root visits parents before children, so each child's
  // generation is derived from already-updated parents.
  const queue: string[] = [rootId];
  const seen = new Set<string>([rootId]);
  const updates: { id: string; generation: number }[] = [];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    for (const child of byId.values()) {
      if (child.parentId1 !== currentId && child.parentId2 !== currentId) continue;
      if (!descendantIds.has(child.id) && child.id !== rootId) continue;
      const parentGens: number[] = [];
      for (const p of [child.parentId1, child.parentId2]) {
        const parent = p ? byId.get(p) : undefined;
        if (parent) parentGens.push(parent.generation);
      }
      const newGen = parentGens.length > 0 ? Math.max(...parentGens) + 1 : child.generation;
      if (newGen !== child.generation) {
        child.generation = newGen;
        updates.push({ id: child.id, generation: newGen });
      }
      if (!seen.has(child.id)) {
        seen.add(child.id);
        queue.push(child.id);
      }
    }
  }

  await bulkUpdateGenerations(updates);
}
