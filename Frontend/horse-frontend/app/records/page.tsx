import { getAllHorses } from "@/lib/horses";
import { getBloodlineColors } from "@/lib/bloodlines";
import RecordsView from "@/components/Records/RecordsView";

export const dynamic = "force-dynamic";

export default async function RecordsPage() {
  const [horses, colors] = await Promise.all([
    getAllHorses(),
    getBloodlineColors(),
  ]);

  return <RecordsView horses={horses} colors={colors} />;
}
