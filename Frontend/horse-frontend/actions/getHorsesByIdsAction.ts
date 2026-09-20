"use server";
import { getHorsesByIds } from "@/lib/horses";
import { Horse } from "@/types/horse";

export default async function getHorsesByIdsAction(ids: string[]): Promise<Horse[]> {
  return await getHorsesByIds(ids);
}
