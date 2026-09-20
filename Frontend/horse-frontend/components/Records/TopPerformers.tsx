"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { Horse } from "@/types/horse";
import { getHorseFullName } from "@/utils/horseNames";
import { translateStat } from "@/utils/translateRawStats";
import * as chartStyles from "@/components/Charts/Charts.css";
import { vars } from "@/styles/theme.css";
import {
  ACTIVE_HEALTH_COUNT,
  ACTIVE_JUMP_COUNT,
  ACTIVE_SPEED_COUNT,
  getActiveHerd,
} from "@/utils/activeHerd";

type StatField = "speed" | "jump" | "health";

const STATS: { field: StatField; label: string; unit: string; limit: number }[] = [
  { field: "speed", label: "Speed", unit: "m/s", limit: ACTIVE_SPEED_COUNT },
  { field: "jump", label: "Jump", unit: "blocks", limit: ACTIVE_JUMP_COUNT },
  { field: "health", label: "Health", unit: "hp", limit: ACTIVE_HEALTH_COUNT },
];

/**
 * Active-herd leaderboards: Top-63 speed + Top-16 jump/health. Horses
 * arrive pre-filtered by the GenerationScopeBar in the parent view —
 * no local filters here so the whole page always reflects a single
 * scope. 🟢 = active (breeds), ⚪ = pastured, 🛡️ = jump/health keeper
 * saved past the speed cut.
 */
export default function TopPerformers({ horses }: { horses: Horse[] }) {
  const herd = useMemo(() => getActiveHerd(horses), [horses]);
  if (horses.length === 0) {
    return (
      <p className={chartStyles.mutedNote}>
        No horses match these filters.
      </p>
    );
  }

  return (
    <div>
      <p className={chartStyles.mutedNote}>
        Active {herd.counts.active} · Pastured {herd.counts.pastured} — the
        speed table is the 63-horse breeding pool, jump/health tables are the
        16-horse keeper cuts that can never auto-retire a horse.
      </p>
      {STATS.map(({ field, label, unit, limit }) => {
        const top = [...horses]
          .sort((a, b) => b[field] - a[field] || a.id.localeCompare(b.id))
          .slice(0, limit);
        return (
          <div key={field} style={{ marginBottom: 24 }}>
            <h4
              style={{
                fontFamily: vars.font.display,
                margin: "0 0 8px",
              }}
            >
              Top {limit} {label}
            </h4>
            {top.length > 0 && (
              <div style={limit > 16 ? { maxHeight: 420, overflowY: "auto" } : undefined}>
              <table className={chartStyles.ledgerTable}>
                <thead>
                  <tr>
                    <th className={chartStyles.ledgerTh}>#</th>
                    <th className={chartStyles.ledgerTh}>Horse</th>
                    <th className={chartStyles.ledgerTh}>Gen</th>
                    <th className={chartStyles.ledgerTh}>{label}</th>
                    <th className={chartStyles.ledgerTh}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {top.map((h, i) => {
                    const r = herd.reasons.get(h.id);
                    const isActive = !!r;
                    const keeper = r && !r.speed && (r.jump || r.health);
                    return (
                    <tr key={h.id}>
                      <td className={chartStyles.ledgerTd}>{i + 1}</td>
                      <td className={chartStyles.ledgerTd}>
                        <Link
                          href={`/horses/${h.id}`}
                          className={chartStyles.ledgerLink}
                        >
                          {getHorseFullName(h)}
                        </Link>
                      </td>
                      <td className={chartStyles.ledgerTd}>{h.generation || 0}</td>
                      <td className={chartStyles.ledgerTd}>
                        {translateStat(field, h[field]).toFixed(field === "health" ? 1 : 2)}{" "}
                        {unit}
                      </td>
                      <td
                        className={chartStyles.ledgerTd}
                        title={
                          keeper
                            ? "Jump/health keeper — stays active past the speed cut"
                            : isActive
                              ? "Active — in the breeding pool"
                              : "Pastured — outside all three cuts"
                        }
                      >
                        {keeper ? "🛡️ keeper" : isActive ? "🟢 active" : "⚪ pasture"}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
