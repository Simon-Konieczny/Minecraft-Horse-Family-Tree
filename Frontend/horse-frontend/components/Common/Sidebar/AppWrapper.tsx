import { getRecentHorses } from "@/lib/horses";
import { getBreedingSettings } from "@/lib/breedingSettings";
import { getBloodlines } from "@/lib/bloodlines";
import Sidebar from "./Sidebar";
import { BloodlineProvider } from "@/components/Bloodlines/BloodlineProvider";
import * as styles from "./Sidebar.css";

export default async function AppWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [fallbackHorses, breedingSettings, bloodlines] = await Promise.all([
    getRecentHorses(5),
    getBreedingSettings(),
    getBloodlines(),
  ]);

  return (
    <BloodlineProvider bloodlines={bloodlines}>
      <div style={{ display: "flex" }}>
        <Sidebar
          fallbackHorses={fallbackHorses}
          initialAllowCloseRelativeBreeding={
            breedingSettings.allowCloseRelativeBreeding
          }
        />
        <main className={styles.contentArea}>{children}</main>
      </div>
    </BloodlineProvider>
  );
}
