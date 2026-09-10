"use server";
import { createHorseData } from "@/components/Modals/HorseCreateModal/HorseCreateModal";
import { createHorse, getAllHorses, getHorseById } from "@/lib/horses";
import { createHorseRequest } from "@/types/horse";
import { processNewHorseGenetics } from "@/utils/genetics/service";
import { validatePairing, validateParents } from "@/utils/lineage";
import { breedingSettings } from "@/utils/breedingSettings";
import { revalidatePath } from "next/cache";
import { ObjectId } from "mongodb";

export default async function createHorseAction(formData: createHorseData) {
  const name = formData.name?.trim();
  if (!name) {
    throw new Error("Horse name is required.");
  }

  const parentId1 = formData.parentId1 || "";
  const parentId2 = formData.parentId2 || "";
  //chnage this to allow for selection of bloodline for origin horses

  // A new node has no id yet so it cannot loop the tree, but validate
  // anyway as defense-in-depth for future import paths.
  const allHorses = await getAllHorses();
  validateParents(allHorses, null, parentId1, parentId2);
  // No-op while close-relative breeding is allowed (the default).
  validatePairing(allHorses, parentId1, parentId2, breedingSettings);

  // Empty strings mean "origin horse" — skip the lookup instead of
  // constructing an invalid ObjectId (which only produced log noise).
  const [parent1, parent2] = await Promise.all([
    ObjectId.isValid(parentId1) ? getHorseById(parentId1) : undefined,
    ObjectId.isValid(parentId2) ? getHorseById(parentId2) : undefined,
  ]);

  const { dna, hexColor, generation } = processNewHorseGenetics(
    parent1,
    parent2,
  );

  const data: createHorseRequest = {
    name,
    parentId1: formData.parentId1 as string,
    parentId2: formData.parentId2 as string,
    status: formData.status,
    speed: formData.speed,
    health: formData.health,
    jump: formData.jump,
    variant: formData.variant,
    dna: dna,
    hexColor: hexColor,
    generation: generation,
  };
  // Throws on failure so the client shows an error instead of silently
  // navigating away while nothing was written.
  const result = await createHorse(data);

  revalidatePath("/horses");
  revalidatePath("/");

  return { id: result, name: data.name };
}
