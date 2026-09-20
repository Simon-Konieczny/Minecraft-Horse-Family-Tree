"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Horse } from "@/types/horse";
import { BREEDING_RANGES, expectedFoalRange } from "@/utils/analytics";
import { translateStat } from "@/utils/translateRawStats";
import { getHorseFullName } from "@/utils/horseNames";
import {
  breedingPairKey,
  breedingRunProgress,
  type BreedingRun,
} from "@/utils/breedingRuns";
import { ChartCard } from "@/components/Charts/Charts";
import * as chartStyles from "@/components/Charts/Charts.css";
import Button from "@/components/Common/Button/Button";

interface BreedingChecklistProps {
  horses: Horse[];
  triedKeys: string[];
  runs: BreedingRun[];
  activeRunId: string | null;
  livePairKeys: string[];
  onSelectRun: (id: string | null) => void;
  onTogglePair: (runId: string, pairKey: string) => void;
  onRemovePair: (runId: string, pairKey: string) => void;
  onClearTicks: (runId: string) => void;
  onRenameRun: (runId: string, label: string) => void;
  onDeleteRun: (runId: string) => void;
  onDeleteAllRuns: () => void;
}

export default function BreedingChecklist({
  horses,
  triedKeys,
  runs,
  activeRunId,
  livePairKeys,
  onSelectRun,
  onTogglePair,
  onRemovePair,
  onClearTicks,
  onRenameRun,
  onDeleteRun,
  onDeleteAllRuns,
}: BreedingChecklistProps) {
  const byId = useMemo(() => new Map(horses.map((h) => [h.id, h])), [horses]);
  const tried = useMemo(() => new Set(triedKeys), [triedKeys]);
  const live = useMemo(() => new Set(livePairKeys), [livePairKeys]);
  const [confirmingDeleteAll, setConfirmingDeleteAll] = useState(false);

  const activeRun = runs.find((r) => r.id === activeRunId) ?? null;

  if (runs.length === 0) {
    return (
      <ChartCard title="Breeding checklist (0 runs)">
        <p className={chartStyles.mutedNote} style={{ marginBottom: 0 }}>
          No checklist yet — press “Snapshot plan into checklist” above to freeze
          the current pairs, then tick each pair off as you breed in-game.
        </p>
      </ChartCard>
    );
  }

  const progress = activeRun ? breedingRunProgress(activeRun) : { done: 0, total: 0 };
  const staleCount = activeRun
    ? activeRun.pairs.filter((p) => !live.has(breedingPairKey(p.sireId, p.damId))).length
    : 0;
  const newCount = activeRun
    ? livePairKeys.filter(
        (k) => !activeRun.pairs.some((p) => breedingPairKey(p.sireId, p.damId) === k),
      ).length
    : 0;
  const benchedHorse = activeRun?.benchedId ? byId.get(activeRun.benchedId) : undefined;

  return (
    <ChartCard
      title={`Breeding checklist (${progress.done}/${progress.total} bred)`}
    >
      <div className={chartStyles.filterRow} style={{ marginBottom: 0 }}>
        <label className={chartStyles.filterLabel}>
          Active run
          <select
            className={chartStyles.formSelect}
            value={activeRun?.id ?? ""}
            onChange={(e) => {
              setConfirmingDeleteAll(false);
              onSelectRun(e.target.value || null);
            }}
            aria-label="Select breeding run"
          >
            {runs.map((r) => {
              const p = breedingRunProgress(r);
              return (
                <option key={r.id} value={r.id}>
                  {r.label} ({p.done}/{p.total})
                </option>
              );
            })}
          </select>
        </label>
        {confirmingDeleteAll ? (
          <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className={chartStyles.mutedNote}>Delete all {runs.length} runs?</span>
            <Button
              text="Confirm"
              variant="danger"
              onClick={() => {
                onDeleteAllRuns();
                setConfirmingDeleteAll(false);
              }}
            />
            <Button text="Keep" onClick={() => setConfirmingDeleteAll(false)} />
          </span>
        ) : (
          <Button
            text="Delete all runs"
            variant="danger"
            onClick={() => setConfirmingDeleteAll(true)}
          />
        )}
      </div>

      {activeRun && (
        <>
          <div className={chartStyles.filterRow} style={{ marginBottom: 0 }}>
            <label className={chartStyles.filterLabel} style={{ flex: 1, minWidth: 200 }}>
              Run label
              <input
                className={chartStyles.formSelect}
                value={activeRun.label}
                onChange={(e) => onRenameRun(activeRun.id, e.target.value)}
                aria-label="Run label"
                maxLength={80}
              />
            </label>
          </div>

          <div
            role="progressbar"
            aria-valuenow={progress.done}
            aria-valuemin={0}
            aria-valuemax={Math.max(1, progress.total)}
            aria-label="Breeding progress"
            title={`${progress.done} of ${progress.total} bred`}
            style={{
              height: 10,
              borderRadius: 9999,
              backgroundColor: "#e9dcc0",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: progress.total > 0 ? `${(progress.done / progress.total) * 100}%` : "0%",
                backgroundColor: "#b98a2f",
                transition: "width 0.2s ease",
              }}
            />
          </div>

          {(staleCount > 0 || newCount > 0) && (
            <p className={chartStyles.mutedNote} style={{ marginBottom: 0 }}>
              Plan changed since snapshot — {staleCount} checklist pair{staleCount === 1 ? " is" : "s are"} no
              longer in the live plan, {newCount} new pair{newCount === 1 ? " is" : "s are"} available
              above. Snapshot again for the next generation when ready.
            </p>
          )}

          {activeRun.pairs.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table className={chartStyles.ledgerTable}>
                <thead>
                  <tr>
                    <th className={chartStyles.ledgerTh}>Bred?</th>
                    <th className={chartStyles.ledgerTh}>Pair</th>
                    <th className={chartStyles.ledgerTh}>Predicted avg</th>
                    <th className={chartStyles.ledgerTh}>Hints</th>
                    <th className={chartStyles.ledgerTh}>
                      <span className="sr-only">Remove</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activeRun.pairs.map((p) => {
                    const key = breedingPairKey(p.sireId, p.damId);
                    const sire = byId.get(p.sireId);
                    const dam = byId.get(p.damId);
                    const checked = activeRun.done[key] === true;
                    const isTried = tried.has(key);
                    const missing = !sire || !dam;
                    const range =
                      sire && dam
                        ? expectedFoalRange(
                            sire.speed,
                            dam.speed,
                            BREEDING_RANGES.speed.min,
                            BREEDING_RANGES.speed.max,
                          )
                        : null;
                    return (
                      <tr key={key} style={checked ? { opacity: 0.6 } : undefined}>
                        <td className={chartStyles.ledgerTd}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => onTogglePair(activeRun.id, key)}
                            aria-label={
                              sire && dam
                                ? `Mark ${getHorseFullName(sire)} and ${getHorseFullName(dam)} as bred`
                                : "Mark pair as bred"
                            }
                          />
                        </td>
                        <td className={chartStyles.ledgerTd}>
                          {sire && dam ? (
                            <>
                              <Link href={`/horses/${sire.id}`} className={chartStyles.ledgerLink}>
                                {getHorseFullName(sire)}
                              </Link>{" "}
                              ×{" "}
                              <Link href={`/horses/${dam.id}`} className={chartStyles.ledgerLink}>
                                {getHorseFullName(dam)}
                              </Link>
                            </>
                          ) : (
                            <span title="A horse in this pair is no longer in the herd">
                              Unavailable pair (horse removed)
                            </span>
                          )}
                        </td>
                        <td className={chartStyles.ledgerTd}>
                          {range
                            ? `${translateStat("speed", range.midpoint).toFixed(2)} m/s`
                            : "—"}
                        </td>
                        <td className={chartStyles.ledgerTd}>
                          {isTried ? (
                            <span title="This pair already has foals">✓ tried</span>
                          ) : missing ? (
                            "—"
                          ) : (
                            <span title="No foals recorded for this pair yet">pending</span>
                          )}
                        </td>
                        <td className={chartStyles.ledgerTd}>
                          <button
                            type="button"
                            onClick={() => onRemovePair(activeRun.id, key)}
                            aria-label="Remove pair from checklist"
                            title="Remove pair from checklist"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              fontSize: 14,
                              padding: "2px 6px",
                            }}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={chartStyles.mutedNote}>
              All pairs removed — delete this run below and snapshot again, or pick another run.
            </p>
          )}

          {benchedHorse && (
            <p className={chartStyles.mutedNote}>
              Benched at snapshot (not tickable):{" "}
              <Link href={`/horses/${benchedHorse.id}`} className={chartStyles.ledgerLink}>
                {getHorseFullName(benchedHorse)}
              </Link>
              .
            </p>
          )}

          <div className={chartStyles.filterRow} style={{ marginBottom: 0 }}>
            <Button text="Clear ticks" onClick={() => onClearTicks(activeRun.id)} />
            <Button
              text="Delete this run"
              variant="danger"
              onClick={() => onDeleteRun(activeRun.id)}
            />
          </div>
        </>
      )}
    </ChartCard>
  );
}
