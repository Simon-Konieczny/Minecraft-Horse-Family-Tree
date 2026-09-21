import {
  ChartCard,
  TrendLine,
} from "@/components/Charts/Charts";
import * as chartStyles from "@/components/Charts/Charts.css";
import { vars } from "@/styles/theme.css";
import { RecordGenCard } from "@/components/Records/InsightSections";
import { STATS, type RecordsModel } from "../useRecordsModel";

type Props = Pick<
  RecordsModel,
  "trends" | "bestByGen" | "variancePts" | "deltas" | "recByGen" | "nameOf"
>;

export function ProgressionSection({
  trends,
  bestByGen,
  variancePts,
  deltas,
  recByGen,
  nameOf,
}: Props) {
  return (
    <>
      <div className={chartStyles.chartGrid}>
        {trends.map((t) => (
          <ChartCard key={t.label} title={`Avg ${t.label} by Generation`}>
            <p className={chartStyles.mutedNote} style={{ margin: 0 }}>
              Solid line = herd average, dashed gray = best of the generation (the ceiling).
            </p>
            <TrendLine
              points={t.points}
              unit={t.unit}
              decimals={t.decimals}
              compare={{ points: bestByGen.get(t.field) ?? [], label: `Best ${t.label} per generation` }}
            />
          </ChartCard>
        ))}
      </div>

      <div className={chartStyles.chartGrid}>
        {trends.map((t) => (
          <ChartCard key={`${t.label}-spread`} title={`${t.label} Spread (std-dev) by Generation`}>
            <p className={chartStyles.mutedNote} style={{ margin: 0 }}>
              Shrinking spread means the line is stabilizing; a jump means fresh blood entered.
            </p>
            <TrendLine points={variancePts.get(t.field) ?? []} unit={t.unit} decimals={t.decimals} />
          </ChartCard>
        ))}
      </div>

      <ChartCard title="Generation Deltas — Avg Improvement">
        {deltas.length > 0 ? (
          <table className={chartStyles.ledgerTable}>
            <thead>
              <tr>
                <th className={chartStyles.ledgerTh}>Gen</th>
                {STATS.map((s) => (
                  <th key={s.field} className={chartStyles.ledgerTh}>
                    Δ {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deltas.map((d) => (
                <tr key={d.gen}>
                  <td className={chartStyles.ledgerTd}>{d.gen}</td>
                  {d.values.map((v, i) => (
                    <td
                      key={STATS[i].field}
                      className={chartStyles.ledgerTd}
                      style={{
                        color:
                          v === null || v === 0
                            ? "inherit"
                            : v > 0
                              ? vars.color.primary
                              : vars.color.wax,
                        fontWeight: 700,
                      }}
                    >
                      {v === null
                        ? "—"
                        : `${(v >= 0 ? "+" : "") + v.toFixed(STATS[i].decimals)}`}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className={chartStyles.statusNote}>
            Needs horses across at least two generations.
          </p>
        )}
      </ChartCard>

      <RecordGenCard rows={recByGen} nameOf={nameOf} />
    </>
  );
}
