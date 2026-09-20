"use server";
import { addBloodline, Bloodline } from "@/lib/bloodlines";
import { revalidatePath } from "next/cache";

export default async function addBloodlineAction(input: Bloodline) {
  const result = await addBloodline(input);
  revalidatePath("/bloodlines");
  revalidatePath("/", "layout");
  return result;
}
