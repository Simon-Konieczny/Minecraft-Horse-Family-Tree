"use server";
import { setBloodlineVisibility } from "@/lib/bloodlines";
import { revalidatePath } from "next/cache";

export default async function toggleBloodlineVisibilityAction(
  name: string,
  hidden: boolean,
) {
  await setBloodlineVisibility(name, hidden);
  revalidatePath("/bloodlines");
  revalidatePath("/", "layout");
}
