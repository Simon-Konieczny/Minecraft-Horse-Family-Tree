"use server";
import { getAllHorses } from "@/lib/horses";
import { Horse } from "@/types/horse";

export default async function getAllHorsesAction(): Promise<Horse[]> {
  return await getAllHorses();
}
