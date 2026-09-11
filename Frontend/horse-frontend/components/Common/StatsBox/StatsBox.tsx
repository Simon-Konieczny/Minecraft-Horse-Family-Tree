import { HorseStats, parseHorseStats } from "@/utils/parseHorseStats";
import { useState } from "react";
import * as styles from "./StatsBox.css"

interface StatsBoxProps {
    onStatsParsed: (stats: HorseStats) => void;
}

export default function StatsBox({ onStatsParsed }: StatsBoxProps){
    const [localStats, setLocalStats] = useState<HorseStats | null>(null);
    const [error, setError] = useState(false);
    
    const handleStatsPaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        if (!val) {
          setLocalStats(null);
          setError(false);
          return;
        }

        const parsed = parseHorseStats(val);

        if (parsed) {
            setLocalStats(parsed);
            onStatsParsed(parsed);
            setError(false);
        } else {
            setError(true);
            setLocalStats(null);
        }
    };
      
    return(
        <div className={styles.container}>
            <label className={styles.label}>Paste /summon command</label>
            <textarea
              placeholder="Paste horse NBT or /summon command..."
              onChange={handleStatsPaste}
              rows={4}
              className={styles.textArea}
            />
            
            {error && (
              <p className={styles.errorText}>
                ⚠️ Could not parse stats. Make sure it&apos;s a valid Minecraft command.
              </p>
            )}

            {localStats && (
              <div className={styles.parsedStats}>
                {(localStats.firstName || localStats.familyName) && (
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Name</span>
                    <span className={styles.statValue}>
                      {[localStats.firstName, localStats.familyName]
                        .filter(Boolean)
                        .join(" ")}
                    </span>
                  </div>
                )}
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Speed</span>
                  <span className={styles.statValue}>{localStats.speed.toFixed(6)}</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Health</span>
                  <span className={styles.statValue}>{localStats.health.toFixed(1)}</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Jump</span>
                  <span className={styles.statValue}>{localStats.jump.toFixed(6)}</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Variant ID</span>
                  <span className={styles.statValue}>{localStats.variant}</span>
                </div>
              </div>
            )}
        </div>
    )
}