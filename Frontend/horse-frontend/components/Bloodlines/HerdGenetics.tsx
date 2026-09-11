import Link from "next/link";
import type { Horse } from "@/types/horse";
import type { Bloodline } from "@/lib/bloodlines";
import {
  bloodlineShares,
  purityRanking,
  sharesByGeneration,
} from "@/utils/analytics";
import { getHorseFullName } from "@/utils/horseNames";
import { bloodlineSlug } from "@/utils/bloodlineValidation";
import {
  Bars,
  ChartCard,
  Donut,
  PaletteGrid,
  StackedArea,
} from "@/components/Charts/Charts";
import { vars } from "@/styles/theme.css";
import * as chartStyles from "@/components/Charts/Charts.css";

export default function HerdGenetics({
  horses,
  bloodlines,
  colors,
}: {
  horses: Horse[];
  bloodlines: Bloodline[];
  colors: Record<string, string>;
}) {
  const shares = bloodlineShares(horses);
  const purity = purityRanking(horses).slice(0, 10);
  const rarest = [...shares].reverse().slice(0, 5);
  const genShares = sharesByGeneration(horses);

  const counts = new Map<string, number>();
  for (const h of horses) {
    const seen = new Set(
      Object.keys(h.dna || {}).map((k) => bloodlineSlug(k)),
    );
    for (const b of bloodlines) {
      if (seen.has(bloodlineSlug(b.name))) {
        counts.set(b.name, (counts.get(b.name) || 0) + 1);
      }
    }
  }

  const colorFor = (name: string) => colors[name] || "#94a3b8";

  return (
    <section style={{ marginTop: 40 }}>
      <h2 style={{ fontFamily: vars.font.display }}>Herd Genetics</h2>
      <div className={chartStyles.chartGrid}>
        <ChartCard title="DNA Share by Bloodline">
          {shares.length > 0 ? (
            <Donut
              centerLabel={`${horses.length}`}
              segments={shares.map((s) => ({
                label: s.bloodline,
                value: Math.round(s.total * 100) / 100,
                color: colorFor(s.bloodline),
              }))}
            />
          ) : (
            <p className={chartStyles.mutedNote}>No DNA recorded yet.</p>
          )}
        </ChartCard>
        <ChartCard title="Market Share by Generation">
          <StackedArea data={genShares} colors={colors} />
        </ChartCard>
      </div>
      <div className={chartStyles.chartGrid}>
        <ChartCard title="Purity Leaderboard">
          {purity.length > 0 ? (
            <table className={chartStyles.ledgerTable}>
              <thead>
                <tr>
                  <th className={chartStyles.ledgerTh}>#</th>
                  <th className={chartStyles.ledgerTh}>Horse</th>
                  <th className={chartStyles.ledgerTh}>Bloodline</th>
                  <th className={chartStyles.ledgerTh}>Share</th>
                </tr>
              </thead>
              <tbody>
                {purity.map((r, i) => (
                  <tr key={r.horse.id}>
                    <td className={chartStyles.ledgerTd}>{i + 1}</td>
                    <td className={chartStyles.ledgerTd}>
                      <Link
                        href={`/horses/${r.horse.id}`}
                        className={chartStyles.ledgerLink}
                      >
                        {getHorseFullName(r.horse)}
                      </Link>
                    </td>
                    <td className={chartStyles.ledgerTd}>{r.bloodline}</td>
                    <td className={chartStyles.ledgerTd}>
                      {(r.share * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className={chartStyles.mutedNote}>No DNA recorded yet.</p>
          )}
        </ChartCard>
        <ChartCard title="Rarest Bloodlines">
          {rarest.length > 0 ? (
            <Bars
              rows={rarest.map((s) => ({
                label: s.bloodline,
                value: Math.round(s.total * 100) / 100,
                color: colorFor(s.bloodline),
              }))}
            />
          ) : (
            <p className={chartStyles.mutedNote}>No DNA recorded yet.</p>
          )}
        </ChartCard>
      </div>
      <ChartCard title="Bloodline Palette">
        <PaletteGrid
          items={bloodlines.map((b) => ({
            name: b.name,
            hexColor: b.hexColor,
            count: counts.get(b.name) || 0,
            theme: b.theme,
          }))}
        />
      </ChartCard>
    </section>
  );
}
