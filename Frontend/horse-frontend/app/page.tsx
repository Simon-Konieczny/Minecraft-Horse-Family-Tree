import { getRecentHorses, getStablesStats } from "@/lib/horses";
import * as styles from "./Dashboard.css";
import { translateStat } from "@/utils/translateRawStats";
import { getHorseVariantImage } from "@/utils/variant";
import { getHorseFullName } from "@/utils/horseNames";
import Link from "next/link";
import Image from "next/image";

export default async function DashboardPage() {
  const [horses, stats] = await Promise.all([
    getRecentHorses(10),
    getStablesStats(),
  ]);

  const { total, alive, avgSpeed, avgJump } = stats;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Stables Dashboard</h1>
        <p className={styles.subtitle}>Overview of your horse breeding program</p>
      </header>

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
          <span className={styles.statValue}>{translateStat("speed", avgSpeed).toFixed(2)} m/s</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Avg. Jump</span>
          <span className={styles.statValue}>{translateStat("jump", avgJump).toFixed(2)} blocks</span>
        </div>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Recent Horses</h2>
          <Link href="/horses" style={{ fontSize: '12px', color: '#2d4a3e', fontWeight: 700, textTransform: 'uppercase', textDecoration: 'none' }}>
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
                    <span className={horse.status !== 0 ? styles.badgeAlive : styles.badgeDead}>
                      {horse.status !== 0 ? "Alive" : "Dead"}
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
    </div>
  );
}
