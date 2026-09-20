import { getBloodlines, getBloodlineColors } from "@/lib/bloodlines";
import { getAllHorses } from "@/lib/horses";
import { ChapterHeading, Folio } from "@/components/Book/Book";
import BloodlineManager from "@/components/Bloodlines/BloodlineManager";
import BloodlinesView from "@/components/Bloodlines/BloodlinesView";

export const dynamic = "force-dynamic";

export default async function BloodlinesPage() {
  const [bloodlines, horses, colors] = await Promise.all([
    getBloodlines(),
    getAllHorses(),
    getBloodlineColors(),
  ]);

  return (
    <main style={{ padding: 24, maxWidth: 720 }}>
      <ChapterHeading
        numeral="Chapter III"
        title="Bloodlines Registry"
        subtitle="Bloodlines power DNA colors, family surnames, and purity tiers across the app. Adding a family here (instead of a code change) makes it usable everywhere immediately."
      />
      <BloodlineManager initial={bloodlines} />
      <BloodlinesView horses={horses} bloodlines={bloodlines} colors={colors} />
      <Folio text="Chapter III · Bloodlines Registry" />
    </main>
  );
}
