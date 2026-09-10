"use server";
import { getBloodlines } from "@/lib/bloodlines";

export default async function getBloodlinesAction() {
  return await getBloodlines();
}
