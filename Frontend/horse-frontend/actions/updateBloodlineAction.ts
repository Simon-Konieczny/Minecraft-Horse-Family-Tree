"use server";
import { updateBloodline, UpdateBloodlineInput } from "@/lib/bloodlines";
import { revalidatePath } from "next/cache";

export default async function updateBloodlineAction(
  input: UpdateBloodlineInput,
) {
  const result = await updateBloodline(input);
  revalidatePath("/bloodlines");
  revalidatePath("/", "layout");
  return result;
}
