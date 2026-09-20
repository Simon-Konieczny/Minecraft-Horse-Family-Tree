"use server";
import { getBreedingSettings } from "@/lib/breedingSettings";

export default async function getBreedingSettingsAction() {
  return await getBreedingSettings();
}
