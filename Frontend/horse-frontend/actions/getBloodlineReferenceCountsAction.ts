"use server";
import { getBloodlineReferenceCounts } from "@/lib/bloodlines";

export default async function getBloodlineReferenceCountsAction(name: string) {
  return await getBloodlineReferenceCounts(name);
}
