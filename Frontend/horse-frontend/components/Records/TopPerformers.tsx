"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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

export default function TopPerformers({ horses }: { horses: Horse[] }) {
  const [status, setStatus] = useState("All");
  const [generation, setGeneration] = useState("All");

  const generations = useMemo(
    () =>
      [...new Set(horses.map((h) => h.generation || 0))].sort((a, b) => a - b),
    [horses],
  );

  const filtered = useMemo(
    () =>
      horses.filter(
        (h) =>
          (status === "All" || h.status === status) &&
          (generation === "All" || (h.generation || 0) === Number(generation)),
      ),
    [horses, status, generation],
  );

  return (
    <div>
      <div className={chartStyles.filterRow}>
        <label className={chartStyles.filterLabel}>
          Status
          <select
            className={chartStyles.formSelect}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {["All", "Alive", "Deceased", "Retired"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className={chartStyles.filterLabel}>
          Generation
          <select
            className={chartStyles.formSelect}
            value={generation}
            onChange={(e) => setGeneration(e.target.value)}
          >
            <option value="All">All</option>
            {generations.map((g) => (
              <option key={g} value={g}>
                Gen {g}
              </option>
            ))}
          </select>
        </label>
      </div>
      {filtered.length === 0 ? (
        <p className={chartStyles.mutedNote}>
          No horses match these filters.
        </p>
      ) : (
      STATS.map(({ field, label, unit }) => {
        const top = [...filtered]
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
      }))}
    </div>
  );
}
