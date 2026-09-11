export const dynamic = "force-dynamic";
import HorsePage from "@/components/HorsePage/HorsePage";
import { getAllHorses, getHorseById } from "@/lib/horses";
import { getBloodlineColors } from "@/lib/bloodlines";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function getHorsePage({ params }: PageProps) {
  const { id } = await params;

  const [horse, horses, colors] = await Promise.all([
    getHorseById(id),
    getAllHorses(),
    getBloodlineColors(),
  ]);

  if (!horse || !horses) {
    notFound();
  }

  return <HorsePage horse={horse} horses={horses} colors={colors} />;
}
