"use server";

import { bulkUpdateGenerations, editHorse, getAllHorses, getHorseById } from "@/lib/horses";
import { Horse, EditHorseRequest } from "@/types/horse";
import { processNewHorseGenetics } from "@/utils/genetics/service";
import { resolveOriginBlood } from "@/utils/genetics/utils";
import { getDescendantIds, validatePairing, validateParents } from "@/utils/lineage";
import { getBreedingSettings } from "@/lib/breedingSettings";
import { getBloodlineColors } from "@/lib/bloodlines";
import { revalidatePath } from 'next/cache';

export default async function editHorseAction(
  horse: Horse,
  formData: Horse,
  originBloodline?: string,
) {
  const allHorses = await getAllHorses();

  // Block loops before writing: a horse can never be parented to itself
  // or to one of its own descendants.
  validateParents(allHorses, horse.id, formData.parentId1, formData.parentId2);
  // No-op while close-relative breeding is allowed (the default —
  // switchable in the sidebar under Breeding Rules).
  validatePairing(allHorses, formData.parentId1, formData.parentId2, await getBreedingSettings());

  const parentId1 = formData.parentId1;
  const parentId2 = formData.parentId2;
  let parent1, parent2;

  if (parentId1 && parentId2) {
    [parent1, parent2] = await Promise.all([
      getHorseById(parentId1),
      getHorseById(parentId2),
    ]);}

    const { dna, hexColor, generation } = await resolveEditGenetics(
    allHorses,
    horse,
    parent1,
    parent2,
    parentId1,
    parentId2,
    formData.familyName,
    originBloodline,
  );


  const data: EditHorseRequest = {
    firstName: formData.firstName,
    familyName: formData.familyName,
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

async function resolveEditGenetics(
  allHorses: Horse[],
  horse: Horse,
  parent1: Horse | undefined,
  parent2: Horse | undefined,
  parentId1: string | undefined,
  parentId2: string | undefined,
  familyName: string,
  originBloodline?: string,
) {
  const colors = await getBloodlineColors();
  // Both-or-neither is enforced by validateParents above: a single
  // recorded parent never reaches here, so parentless means founder.
  if (parentId1 && parentId2) {
    return processNewHorseGenetics(parent1, parent2, undefined, colors);
  }
  const pick = (originBloodline || "").trim();
  if (pick) {
    const resolved = resolveOriginBlood(pick, colors);
    if (!resolved) throw new Error(`Unknown bloodline "${pick}".`);
    return processNewHorseGenetics(parent1, parent2, resolved, colors);
  }
  if (getDescendantIds(allHorses, horse.id).size === 0) {
    // Childless founder: a matching surname seeds DNA on re-save, so
    // previously Unknown horses self-repair without touching the picker.
    return processNewHorseGenetics(
      parent1,
      parent2,
      resolveOriginBlood(familyName, colors),
      colors,
    );
  }
  // Has descendants and no explicit correction: preserve stored genetics
  // so foal maps don't go stale (edits only recompute generations).
  return {
    dna: horse.dna,
    hexColor: horse.hexColor || "#000000",
    generation: horse.generation,
  };
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
