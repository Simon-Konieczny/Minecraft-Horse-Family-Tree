"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { Horse } from "@/types/horse";
import {
  PEN_SIZE,
  getActiveHerd,
  groupPasturesByBloodline,
} from "@/utils/activeHerd";
import { getHorseFullName } from "@/utils/horseNames";
import { translateStat } from "@/utils/translateRawStats";
import { ChartCard } from "@/components/Charts/Charts";
import * as chartStyles from "@/components/Charts/Charts.css";

/**
 * In-game stable map: 9 active pens by speed tier (7 horses each,
 * Pen 1 = active ranks 1–7 … Pen 9 = 57–63, overflow P10+ for slow
 * jump/health keepers) plus heritage pastures grouped by dominant
 * bloodline. Foals never need a bloodline-pen decision — rank decides.
 */
export default function StableBoard({ horses }: { horses: Horse[] }) {
  const herd = useMemo(() => getActiveHerd(horses), [horses]);
  const pastures = useMemo(
    () => groupPasturesByBloodline(herd.pastured),
    [herd],
  );

  const pens = useMemo(() => {
    const out: Horse[][] = [];
    herd.active.forEach((h, i) => {
      const pen = Math.floor(i / PEN_SIZE);
      if (!out[pen]) out[pen] = [];
      out[pen].push(h);
    });
    return out;
  }, [herd]);

  return (
    <ChartCard title={`Stable map — ${herd.counts.active} active · ${herd.counts.pastured} pastured`}>
      <p className={chartStyles.mutedNote}>
        Active pens sort by speed (7 per pen). 🛡️ = jump/health keeper saved
        past the speed cut. Pastures group by dominant bloodline for heritage.
        When a foal cracks a cut, it displaces the lowest active horse to its
        pasture group.
      </p>
      {pens.map((pen, i) => (
        <div key={i} style={{ marginBottom: 16 }}>
          <h4 style={{ margin: "8px 0" }}>
            Pen {i + 1}{" "}
            <span style={{ opacity: 0.6, fontWeight: 400, fontSize: 12 }}>
              (active #{i * PEN_SIZE + 1}–{i * PEN_SIZE + pen.length}
              {i >= 9 ? " · overflow" : ""} · {pen.length}/{PEN_SIZE})
            </span>
          </h4>
          <table className={chartStyles.ledgerTable}>
            <thead>
              <tr>
                <th className={chartStyles.ledgerTh}>#</th>
                <th className={chartStyles.ledgerTh}>Horse</th>
                <th className={chartStyles.ledgerTh}>Speed</th>
                <th className={chartStyles.ledgerTh}>Note</th>
              </tr>
            </thead>
            <tbody>
              {pen.map((h, j) => {
                const r = herd.reasons.get(h.id);
                const keeper = r && !r.speed && (r.jump || r.health);
                return (
                  <tr key={h.id}>
                    <td className={chartStyles.ledgerTd}>{i * PEN_SIZE + j + 1}</td>
                    <td className={chartStyles.ledgerTd}>
                      <Link href={`/horses/${h.id}`} className={chartStyles.ledgerLink}>
                        {getHorseFullName(h)}
                      </Link>
                    </td>
                    <td className={chartStyles.ledgerTd}>
                      {translateStat("speed", h.speed).toFixed(2)} m/s
                    </td>
                    <td className={chartStyles.ledgerTd}>
                      {keeper ? "🛡️ keeper" : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
      <h4 style={{ margin: "16px 0 8px" }}>
        Heritage pastures{" "}
        <span style={{ opacity: 0.6, fontWeight: 400, fontSize: 12 }}>
          ({herd.counts.pastured} horses)
        </span>
      </h4>
      {pastures.length > 0 ? (
        pastures.map((p) => (
          <p key={p.group} style={{ margin: "4px 0", fontSize: 13 }}>
            <strong>{p.group}</strong> ({p.horses.length}):{" "}
            {p.horses.slice(0, 8).map((h, idx) => (
              <span key={h.id}>
                {idx > 0 && ", "}
                <Link href={`/horses/${h.id}`} className={chartStyles.ledgerLink}>
                  {getHorseFullName(h)}
                </Link>
              </span>
            ))}
            {p.horses.length > 8 && ` +${p.horses.length - 8} more`}
          </p>
        ))
      ) : (
        <p className={chartStyles.mutedNote}>No pastured horses.</p>
      )}
    </ChartCard>
  );
}
