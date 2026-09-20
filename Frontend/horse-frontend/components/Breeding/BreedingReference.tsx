import { ChartCard } from "@/components/Charts/Charts";
import * as chartStyles from "@/components/Charts/Charts.css";

/**
 * Vanilla breeding mechanics, recorded here so breeding decisions stay
 * grounded in the game's actual roll (source: Minecraft Wiki, "Bred
 * values"). Static reference — no logic. The Records page's pair-outcome
 * ranges are computed from this same formula (see expectedFoalRange).
 */
export default function BreedingReference() {
  return (
    <ChartCard title="Breeding Reference — How Foal Stats Roll">
      <details>
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>
          Vanilla formula, legal ranges, and color chances
        </summary>
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
          <p className={chartStyles.mutedNote} style={{ margin: 0 }}>
            Run per stat on the parents&apos; <strong>raw</strong> attribute
            values. Rolls cluster at the parent midpoint; the possible range
            below is indicative, not a promise.
          </p>
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            <li>Take the absolute difference of both parents&apos; values.</li>
            <li>Add 30% of the stat&apos;s total legal range.</li>
            <li>Roll three 0–1 randoms, average them, subtract 0.5 (range −0.5…0.5, center-weighted).</li>
            <li>Multiply step 2 by step 3.</li>
            <li>Add the parents&apos; average.</li>
            <li>
              Reflect back into range: above max → <code>2·MAX − value</code>,
              below min → <code>2·MIN − value</code>.
            </li>
          </ol>
          <pre
            style={{
              margin: 0,
              padding: 12,
              overflowX: "auto",
              fontSize: 12,
              borderRadius: 8,
            }}
          >
            {`base = (|x - y| + (MAX - MIN) * 0.3) * ((rand + rand + rand) / 3 - 0.5) + (x + y) / 2
if base > MAX: base = 2 * MAX - base
if base < MIN: base = 2 * MIN - base`}
          </pre>
          <table className={chartStyles.ledgerTable}>
            <thead>
              <tr>
                <th className={chartStyles.ledgerTh}>Stat</th>
                <th className={chartStyles.ledgerTh}>Raw range</th>
                <th className={chartStyles.ledgerTh}>As shown here</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className={chartStyles.ledgerTd}>Speed</td>
                <td className={chartStyles.ledgerTd}>0.1125 – 0.3375</td>
                <td className={chartStyles.ledgerTd}>4.86 – 14.57 m/s (×43.17)</td>
              </tr>
              <tr>
                <td className={chartStyles.ledgerTd}>Jump</td>
                <td className={chartStyles.ledgerTd}>0.4 – 1.0</td>
                <td className={chartStyles.ledgerTd}>1.153 – 5.9197 blocks</td>
              </tr>
              <tr>
                <td className={chartStyles.ledgerTd}>Health</td>
                <td className={chartStyles.ledgerTd}>15 – 30</td>
                <td className={chartStyles.ledgerTd}>7.5 – 15.0 (raw / 2)</td>
              </tr>
            </tbody>
          </table>
          <p className={chartStyles.mutedNote} style={{ margin: 0 }}>
            Coat: 11% random base color, 20% random markings — otherwise the
            foal takes after a parent. Donkey × horse follows the same stat
            roll.
          </p>
        </div>
      </details>
    </ChartCard>
  );
}
