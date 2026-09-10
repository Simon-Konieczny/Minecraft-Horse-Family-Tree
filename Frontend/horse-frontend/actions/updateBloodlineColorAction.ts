"use server";
import { updateBloodlineColor } from "@/lib/bloodlines";
import { revalidatePath } from "next/cache";

export default async function updateBloodlineColorAction(
  name: string,
  hexColor: string,
) {
  await updateBloodlineColor(name, hexColor);
  revalidatePath("/bloodlines");
  revalidatePath("/", "layout");
}
