"use client";

import Link from "next/link";
import type { Horse } from "@/types/horse";
import { getHorseFullName } from "@/utils/horseNames";
import { translateStat } from "@/utils/translateRawStats";
import * as chartStyles from "@/components/Charts/Charts.css";
import { vars } from "@/styles/theme.css";

type StatField = "speed" | "jump" | "health";

const STATS: { field: StatField; label: string; unit: string }[] = [
  { field: "speed", label: "Speed", unit: "m/s" },
  { field: "jump", label: "Jump", unit: "blocks" },
  { field: "health", label: "Health", unit: "hp" },
];

/**
 * Top-10 tables per stat. Horses arrive pre-filtered by the
 * GenerationScopeBar in the parent view — no local filters here so the
 * whole page always reflects a single scope.
 */
export default function TopPerformers({ horses }: { horses: Horse[] }) {
  if (horses.length === 0) {
    return (
      <p className={chartStyles.mutedNote}>
        No horses match these filters.
      </p>
    );
  }

  return (
    <div>
      {STATS.map(({ field, label, unit }) => {
        const top = [...horses]
          .sort((a, b) => b[field] - a[field])
          .slice(0, 10);
        return (
          <div key={field} style={{ marginBottom: 24 }}>
            <h4
              style={{
                fontFamily: vars.font.display,
                margin: "0 0 8px",
              }}
            >
              Top {label}
            </h4>
            {top.length > 0 && (
              <table className={chartStyles.ledgerTable}>
                <thead>
                  <tr>
                    <th className={chartStyles.ledgerTh}>#</th>
                    <th className={chartStyles.ledgerTh}>Horse</th>
                    <th className={chartStyles.ledgerTh}>Gen</th>
                    <th className={chartStyles.ledgerTh}>{label}</th>
                  </tr>
                </thead>
                <tbody>
                  {top.map((h, i) => (
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
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </div>
  );
}
