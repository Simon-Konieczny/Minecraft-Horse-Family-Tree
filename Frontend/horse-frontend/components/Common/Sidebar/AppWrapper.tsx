import { getRecentHorses } from "@/lib/horses";
import { getBreedingSettings } from "@/lib/breedingSettings";
import Sidebar from "./Sidebar";
import * as styles from "./Sidebar.css";

export default async function AppWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [fallbackHorses, breedingSettings] = await Promise.all([
    getRecentHorses(5),
    getBreedingSettings(),
  ]);

  return (
    <div style={{ display: "flex" }}>
      <Sidebar
        fallbackHorses={fallbackHorses}
        initialAllowCloseRelativeBreeding={
          breedingSettings.allowCloseRelativeBreeding
        }
      />
      <main className={styles.contentArea}>{children}</main>
    </div>
  );
}
