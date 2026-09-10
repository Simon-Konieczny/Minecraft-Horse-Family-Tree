"use server";
import { setBreedingSettings } from "@/lib/breedingSettings";
import { revalidatePath } from "next/cache";

export default async function updateBreedingSettingsAction(
  allowCloseRelativeBreeding: boolean,
) {
  const result = await setBreedingSettings({ allowCloseRelativeBreeding });
  revalidatePath("/", "layout");
  return result;
}
