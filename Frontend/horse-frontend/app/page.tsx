import { getRecentHorses, getStablesStats, getAllHorses } from "@/lib/horses";
import { generationCounts } from "@/utils/analytics";
import { Bars, ChartCard, Donut } from "@/components/Charts/Charts";
import * as styles from "./Dashboard.css";
import { translateStat } from "@/utils/translateRawStats";
import { getHorseVariantImage } from "@/utils/variant";
import { getHorseFullName } from "@/utils/horseNames";
import { Cover, Folio } from "@/components/Book/Book";
import { vars } from "@/styles/theme.css";
import Link from "next/link";
import Image from "next/image";

export default async function DashboardPage() {
  const [horses, stats, allHorses] = await Promise.all([
    getRecentHorses(10),
    getStablesStats(),
    getAllHorses(),
  ]);

  const { total, alive, byStatus, speed, jump } = stats;
  const generations = generationCounts(allHorses);

  return (
    <div className={styles.container}>
      <Cover />

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total Horses</span>
          <span className={styles.statValue}>{total}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Alive</span>
          <span className={styles.statValue}>{alive}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Avg. Speed</span>
          <span className={styles.statValue}>{translateStat("speed", speed.avg).toFixed(2)} m/s</span>
          <span className={styles.statRange}>
            {translateStat("speed", speed.min).toFixed(2)} – {translateStat("speed", speed.max).toFixed(2)}
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Avg. Jump</span>
          <span className={styles.statValue}>{translateStat("jump", jump.avg).toFixed(2)} blocks</span>
          <span className={styles.statRange}>
            {translateStat("jump", jump.min).toFixed(2)} – {translateStat("jump", jump.max).toFixed(2)}
          </span>
        </div>
      </div>

      <div className={styles.chartsGrid}>
        <ChartCard title="Horses by Status">
          <Donut
            centerLabel={`${total}`}
            segments={[
              { label: "Alive", value: byStatus.Alive, color: "#2d4a3e" },
              { label: "Retired", value: byStatus.Retired, color: "#b98a2f" },
              { label: "Deceased", value: byStatus.Deceased, color: "#8f2d22" },
            ]}
          />
        </ChartCard>
        <ChartCard title="Horses per Generation">
          <Bars
            rows={generations.map((g) => ({
              label: `Gen ${g.generation}`,
              value: g.count,
            }))}
          />
        </ChartCard>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Recent Horses</h2>
            <Link href="/horses" style={{ fontSize: '12px', color: vars.color.primary, fontWeight: 700, textTransform: 'uppercase', textDecoration: 'none' }}>
            View Tree →
          </Link>
        </div>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}></th>
                <th className={styles.th}>Name</th>
                <th className={styles.th}>Status</th>
                <th className={styles.th}>Speed</th>
                <th className={styles.th}>Jump</th>
                <th className={styles.th}>Health</th>
                <th className={styles.th}>Gen</th>
              </tr>
            </thead>
            <tbody>
              {horses.slice(0, 10).map((horse) => (
                <tr key={horse.id} className={styles.tr}>
                  <td className={styles.td} style={{ width: '48px', paddingRight: 0 }}>
                    <div className={styles.smallImageContainer}>
                      <Image 
                        src={getHorseVariantImage(horse.variant)} 
                        alt={getHorseFullName(horse)} 
                        width={32} 
                        height={32} 
                        className={styles.smallHorseImage}
                      />
                    </div>
                  </td>
                  <td className={styles.td}>
                    <Link href={`/horses/${horse.id}`} style={{ textDecoration: 'none', color: 'inherit', fontWeight: 600 }}>
                      {getHorseFullName(horse)}
                    </Link>
                  </td>
                  <td className={styles.td}>
                    <span className={horse.status === "Deceased" ? styles.badgeDead : styles.badgeAlive}>
                      {horse.status}
                    </span>
                  </td>
                  <td className={styles.td}>{translateStat("speed", horse.speed).toFixed(2)}</td>
                  <td className={styles.td}>{translateStat("jump", horse.jump).toFixed(2)}</td>
                  <td className={styles.td}>{translateStat("health", horse.health).toFixed(1)}</td>
                  <td className={styles.td}>{horse.generation || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <Folio text="Chapter I · The Stable" />
    </div>
  );
}
