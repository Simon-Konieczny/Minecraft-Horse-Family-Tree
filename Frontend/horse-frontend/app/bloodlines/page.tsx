import { getBloodlines } from "@/lib/bloodlines";
import { getAllHorses } from "@/lib/horses";
import { buildFamilyRecords } from "@/utils/studbook";
import BloodlineManager from "@/components/Bloodlines/BloodlineManager";
import FamilyRecords from "@/components/Bloodlines/FamilyRecords";

export const dynamic = "force-dynamic";

export default async function BloodlinesPage() {
  const [bloodlines, horses] = await Promise.all([
    getBloodlines(),
    getAllHorses(),
  ]);
  const records = buildFamilyRecords(horses);

  return (
    <main style={{ padding: 24, maxWidth: 720 }}>
      <h1>Manage Bloodlines</h1>
      <p style={{ opacity: 0.7 }}>
        Bloodlines power DNA colors, family surnames, and purity tiers across
        the app. Adding a family here (instead of a code change) makes it
        usable everywhere immediately.
      </p>
      <BloodlineManager initial={bloodlines} />
      <FamilyRecords bloodlines={bloodlines} records={records} />
    </main>
  );
}
