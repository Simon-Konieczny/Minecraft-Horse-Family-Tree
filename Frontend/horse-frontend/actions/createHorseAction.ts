"use server";
import { createHorseData } from "@/components/Modals/HorseCreateModal/HorseCreateModal";
import { createHorse, getAllHorses, getHorseById } from "@/lib/horses";
import { createHorseRequest } from "@/types/horse";
import { processNewHorseGenetics } from "@/utils/genetics/service";
import { getSurnameFromDna, resolveOriginBlood } from "@/utils/genetics/utils";
import { getHorseFullName } from "@/utils/horseNames";
import { validatePairing, validateParents } from "@/utils/lineage";
import { getBreedingSettings } from "@/lib/breedingSettings";
import { getBloodlineColors } from "@/lib/bloodlines";
import { revalidatePath } from "next/cache";
import { ObjectId } from "mongodb";

export default async function createHorseAction(formData: createHorseData) {
  const firstName = formData.firstName?.trim();
  if (!firstName) {
    throw new Error("Horse first name is required.");
  }

  const parentId1 = formData.parentId1 || "";
  const parentId2 = formData.parentId2 || "";
  //chnage this to allow for selection of bloodline for origin horses

  // A new node has no id yet so it cannot loop the tree, but validate
  // anyway as defense-in-depth for future import paths.
  const allHorses = await getAllHorses();
  validateParents(allHorses, null, parentId1, parentId2);
  // No-op while close-relative breeding is allowed (the default —
  // switchable in the sidebar under Breeding Rules).
  validatePairing(allHorses, parentId1, parentId2, await getBreedingSettings());

  // Empty strings mean "origin horse" — skip the lookup instead of
  // constructing an invalid ObjectId (which only produced log noise).
  const [parent1, parent2] = await Promise.all([
    ObjectId.isValid(parentId1) ? getHorseById(parentId1) : undefined,
    ObjectId.isValid(parentId2) ? getHorseById(parentId2) : undefined,
  ]);

  const colors = await getBloodlineColors();

  // Founder bloodline precedence: explicit picker pick -> matching
  // surname -> Unknown. Only consulted on the origin path (parentless
  // horses); two-parent foals always inherit via mergeDna.
  const explicitPick = (formData.originBloodline || "").trim();
  if (explicitPick && !resolveOriginBlood(explicitPick, colors)) {
    throw new Error(`Unknown bloodline "${explicitPick}".`);
  }
  const typedFamily = formData.familyName?.trim() || "";
  const originBlood =
    resolveOriginBlood(explicitPick, colors) ||
    resolveOriginBlood(typedFamily, colors) ||
    undefined;

  const { dna, hexColor, generation } = processNewHorseGenetics(
    parent1,
    parent2,
    originBlood,
    colors,
  );

  // Family name is overwritable: a typed value wins, otherwise derive it
  // from the foal's DNA (equal weights order alphabetically).
  const familyName =
    typedFamily || getSurnameFromDna(dna);

  const data: createHorseRequest = {
    firstName,
    familyName,
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

  return { id: result, name: getHorseFullName(data) };
}
