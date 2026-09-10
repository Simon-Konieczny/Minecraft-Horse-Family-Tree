"use server";
import { deleteBloodline } from "@/lib/bloodlines";
import { revalidatePath } from "next/cache";

export default async function deleteBloodlineAction(name: string) {
  await deleteBloodline(name);
  revalidatePath("/bloodlines");
  revalidatePath("/", "layout");
}
