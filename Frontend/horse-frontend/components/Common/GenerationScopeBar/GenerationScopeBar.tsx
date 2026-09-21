"use client";

import * as chartStyles from "@/components/Charts/Charts.css";

export const SCOPE_STATUSES = ["All", "Alive", "Deceased", "Retired"] as const;

export interface GenerationScopeValue {
  from: number;
  to: number;
  status: string;
}

/**
 * Shared generation-range + status filter bar.
 * Scope is always an inclusive generation range: set From to the earliest
 * generation for cumulative history up to To.
 */
export default function GenerationScopeBar({
  generations,
  value,
  inScopeCount,
  totalCount,
  onChange,
  onReset,
}: {
  generations: number[];
  value: GenerationScopeValue;
  inScopeCount: number;
  totalCount: number;
  onChange: (next: GenerationScopeValue) => void;
  onReset: () => void;
}) {
  const earliest = generations.length > 0 ? generations[0] : 0;
  const latest = generations.length > 0 ? generations[generations.length - 1] : 0;
  const isDefault =
    value.from === earliest && value.to === latest && value.status === "All";

  return (
    <div>
      <div className={chartStyles.filterRow}>
        <label className={chartStyles.filterLabel}>
          From Gen
          <select
            className={chartStyles.formSelect}
            value={value.from}
            onChange={(e) =>
              onChange({ ...value, from: Number(e.target.value) })
            }
          >
            {generations.map((g) => (
              <option key={g} value={g}>
                Gen {g}
              </option>
            ))}
          </select>
        </label>
        <label className={chartStyles.filterLabel}>
          To Gen
          <select
            className={chartStyles.formSelect}
            value={value.to}
            onChange={(e) =>
              onChange({ ...value, to: Number(e.target.value) })
            }
          >
            {generations.map((g) => (
              <option key={g} value={g}>
                Gen {g}
              </option>
            ))}
          </select>
        </label>
        <label className={chartStyles.filterLabel}>
          Status
          <select
            className={chartStyles.formSelect}
            value={value.status}
            onChange={(e) => onChange({ ...value, status: e.target.value })}
          >
            {SCOPE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={chartStyles.resetButton}
          onClick={onReset}
          disabled={isDefault}
        >
          Reset
        </button>
      </div>
      <p className={chartStyles.mutedNote}>
        {inScopeCount} of {totalCount} horses · Gen {value.from}–{value.to}
        {value.status !== "All" ? ` · ${value.status}` : ""}
        {value.from === earliest
          ? " · cumulative history"
          : " · tip: set From to earliest for cumulative history"}
      </p>
    </div>
  );
}
