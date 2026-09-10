import { getBloodlines } from "@/lib/bloodlines";

export async function GET() {
  // Shared read source for external consumers (e.g. data scripts):
  // the same registry the app itself uses, no copied dicts.
  const bloodlines = await getBloodlines();
  return Response.json(bloodlines);
}
