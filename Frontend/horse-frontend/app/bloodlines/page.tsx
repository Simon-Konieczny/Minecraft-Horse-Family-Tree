import { getBloodlines, getBloodlineColors } from "@/lib/bloodlines";
import { getAllHorses } from "@/lib/horses";
import { buildFamilyRecords } from "@/utils/studbook";
import { ChapterHeading, Folio } from "@/components/Book/Book";
import BloodlineManager from "@/components/Bloodlines/BloodlineManager";
import FamilyRecords from "@/components/Bloodlines/FamilyRecords";
import HerdGenetics from "@/components/Bloodlines/HerdGenetics";

export const dynamic = "force-dynamic";

export default async function BloodlinesPage() {
  const [bloodlines, horses, colors] = await Promise.all([
    getBloodlines(),
    getAllHorses(),
    getBloodlineColors(),
  ]);
  const records = buildFamilyRecords(horses);

  return (
    <main style={{ padding: 24, maxWidth: 720 }}>
      <ChapterHeading
        numeral="Chapter III"
        title="Bloodlines Registry"
        subtitle="Bloodlines power DNA colors, family surnames, and purity tiers across the app. Adding a family here (instead of a code change) makes it usable everywhere immediately."
      />
      <BloodlineManager initial={bloodlines} />
      <FamilyRecords bloodlines={bloodlines} records={records} />
      <HerdGenetics horses={horses} bloodlines={bloodlines} colors={colors} />
      <Folio text="Chapter III · Bloodlines Registry" />
    </main>
  );
}
