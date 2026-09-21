"use client";
import { BloodlineMap } from "@/types/horse";
import { getPurityTier } from "@/utils/genetics/utils";
import { FALLBACK_HEX_COLOR } from "@/utils/bloodlineValidation";
import { useBloodlineColors } from "@/components/Bloodlines/BloodlineProvider";
import * as styles from "./BloodlineDisplay.css";

interface BloodlineDisplayProps {
  dna: BloodlineMap;
}

export function BloodlineDisplay({ dna }: BloodlineDisplayProps) {
  const bloodlineColors = useBloodlineColors();
  if (!dna || Object.keys(dna).length === 0) return null;

  // Sort by percentage descending
  const sorted = Object.entries(dna).sort(([, a], [, b]) => b - a);
  const tier = getPurityTier(dna);
  const badgeColor =
    (tier.bloodline && bloodlineColors[tier.bloodline]) || "#64748b";

  return (
    <div className={styles.bloodlineSection}>
      <h3 className={styles.bloodlineHeading}>Genetic Composition</h3>
      <span className={styles.tierBadge} style={{ backgroundColor: badgeColor }}>
        {tier.label}
      </span>
      <div className={styles.bloodlineList}>
        {sorted.map(([name, percent]) => {
          const color = bloodlineColors[name] || FALLBACK_HEX_COLOR;
          const percentageValue = (percent * 100).toFixed(1);
          const width = `${percentageValue}%`;

          return (
            <div key={name} className={styles.bloodlineRow}>
              <div className={styles.bloodlineInfo}>
                <span className={styles.bloodlineName}>{name}</span>
                <span className={styles.bloodlinePercent}>
                  {percentageValue}%
                </span>
              </div>
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressBar}
                  style={{
                    width,
                    backgroundColor: color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
