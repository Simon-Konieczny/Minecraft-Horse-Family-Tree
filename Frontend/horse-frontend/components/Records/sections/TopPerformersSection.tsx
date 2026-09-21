import Link from "next/link";
import {
  ChartCard,
} from "@/components/Charts/Charts";
import * as chartStyles from "@/components/Charts/Charts.css";
import TopPerformers from "@/components/Records/TopPerformers";
import type { RecordsModel } from "../useRecordsModel";

type Props = Pick<
  RecordsModel,
  "filtered" | "fame" | "godRoll" | "nameOf"
>;

export function TopPerformersSection({ filtered, fame, godRoll, nameOf }: Props) {
  return (
    <>
      <div style={{ marginTop: 24 }}>
        <ChartCard title="Top Performers — Top 63 Speed · Top 16 Jump/Health">
          <TopPerformers horses={filtered} />
        </ChartCard>
      </div>

      <div className={chartStyles.chartGrid} style={{ marginTop: 24 }}>
        <ChartCard title="Hall of Fame">
          {fame ? (
            <table className={chartStyles.ledgerTable}>
              <tbody>
                <tr>
                  <td className={chartStyles.ledgerTd}>⚡ Fastest</td>
                  <td className={chartStyles.ledgerTd}>
                    <Link href={`/horses/${fame.speed.horse.id}`} className={chartStyles.ledgerLink}>
                      {nameOf(fame.speed.horse.id)}
                    </Link>{" "}
                    · {fame.speed.speed.toFixed(2)} m/s
                  </td>
                </tr>
                <tr>
                  <td className={chartStyles.ledgerTd}>🐎 Highest jump</td>
                  <td className={chartStyles.ledgerTd}>
                    <Link href={`/horses/${fame.jump.horse.id}`} className={chartStyles.ledgerLink}>
                      {nameOf(fame.jump.horse.id)}
                    </Link>{" "}
                    · {fame.jump.jump.toFixed(2)} blocks
                  </td>
                </tr>
                <tr>
                  <td className={chartStyles.ledgerTd}>❤ Toughest</td>
                  <td className={chartStyles.ledgerTd}>
                    <Link href={`/horses/${fame.health.horse.id}`} className={chartStyles.ledgerLink}>
                      {nameOf(fame.health.horse.id)}
                    </Link>{" "}
                    · {fame.health.health.toFixed(1)} hp
                  </td>
                </tr>
                {fame.prolific && (
                  <tr>
                    <td className={chartStyles.ledgerTd}>👑 Most prolific</td>
                    <td className={chartStyles.ledgerTd}>
                      <Link href={`/horses/${fame.prolific.id}`} className={chartStyles.ledgerLink}>
                        {nameOf(fame.prolific.id)}
                      </Link>{" "}
                      · {fame.prolificCount} foals
                    </td>
                  </tr>
                )}
                {fame.purest && (
                  <tr>
                    <td className={chartStyles.ledgerTd}>🧬 Purest</td>
                    <td className={chartStyles.ledgerTd}>
                      <Link href={`/horses/${fame.purest.horse.id}`} className={chartStyles.ledgerLink}>
                        {nameOf(fame.purest.horse.id)}
                      </Link>{" "}
                      · {(fame.purest.share * 100).toFixed(1)}% {fame.purest.bloodline}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <p className={chartStyles.statusNote}>No horses yet.</p>
          )}
        </ChartCard>
        <ChartCard title="God-Roll Tracker — Distance to Max">
          {filtered.length > 0 ? (
            <table className={chartStyles.ledgerTable}>
              <thead>
                <tr>
                  <th className={chartStyles.ledgerTh}>Stat</th>
                  <th className={chartStyles.ledgerTh}>Closest</th>
                  <th className={chartStyles.ledgerTh}>Gap</th>
                </tr>
              </thead>
              <tbody>
                {godRoll.map((g) => (
                  <tr key={g.field}>
                    <td className={chartStyles.ledgerTd}>{g.field}</td>
                    <td className={chartStyles.ledgerTd}>
                      {g.horse ? (
                        <Link href={`/horses/${g.horse.id}`} className={chartStyles.ledgerLink}>
                          {nameOf(g.horse.id)}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className={chartStyles.ledgerTd}>
                      {g.gap.toFixed(2)} off {g.max.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className={chartStyles.statusNote}>No horses yet.</p>
          )}
        </ChartCard>
      </div>
    </>
  );
}
