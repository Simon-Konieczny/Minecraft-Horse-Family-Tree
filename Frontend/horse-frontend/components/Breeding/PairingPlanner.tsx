"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Horse } from "@/types/horse";
import type { RankedPair } from "@/utils/analytics";
import { BREEDING_RANGES, expectedFoalRange } from "@/utils/analytics";
import {
  calculateColorFromDna,
  getSurnameFromDna,
  mergeDna,
} from "@/utils/genetics/utils";
import { translateStat, untranslateStat } from "@/utils/translateRawStats";
import { getHorseFullName } from "@/utils/horseNames";
import { ChartCard } from "@/components/Charts/Charts";
import * as chartStyles from "@/components/Charts/Charts.css";

const pairKey = (a: string, b: string) => [a, b].sort().join("|||");

export default function PairingPlanner({
  horses,
  colors,
  initialPairs,
  triedKeys,
  policyBlocksRelatives,
}: {
  horses: Horse[];
  colors: Record<string, string>;
  initialPairs: RankedPair[];
  triedKeys: string[];
  policyBlocksRelatives: boolean;
}) {
  const [limit, setLimit] = useState(25);
  const [hideRelated, setHideRelated] = useState(policyBlocksRelatives);
  const [hideTried, setHideTried] = useState(false);
  const [includeRetired, setIncludeRetired] = useState(true);
  const [minSpeed, setMinSpeed] = useState("");

  const byId = useMemo(() => new Map(horses.map((h) => [h.id, h])), [horses]);
  const tried = useMemo(() => new Set(triedKeys), [triedKeys]);
  const minRaw =
    minSpeed.trim() === "" ? null : untranslateStat("speed", Number(minSpeed));

  const rows = useMemo(() => {
    const min = minRaw !== null && Number.isFinite(minRaw) ? minRaw : null;
    return initialPairs
      .filter((p) => {
        if (hideRelated && (p.blocked || p.sharedAncestors > 0)) return false;
        if (hideTried && tried.has(pairKey(p.sireId, p.damId))) return false;
        if (min !== null && p.midSpeed < min) return false;
        if (!includeRetired) {
          const sire = byId.get(p.sireId);
          const dam = byId.get(p.damId);
          if (sire?.status === "Retired" || dam?.status === "Retired") return false;
        }
        return byId.has(p.sireId) && byId.has(p.damId);
      })
      .slice(0, limit);
  }, [initialPairs, hideRelated, hideTried, tried, minRaw, includeRetired, byId, limit]);

  return (
    <ChartCard title={`Top ${rows.length} pairings by predicted speed`}>
      <div
        style={{
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          alignItems: "end",
          marginBottom: 16,
        }}
      >
        <label style={{ fontSize: 13 }}>
          Show
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            style={{ marginLeft: 6 }}
            aria-label="Number of pairings to show"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label style={{ fontSize: 13 }}>
          Min predicted (m/s)
          <input
            type="number"
            step="0.1"
            min="0"
            value={minSpeed}
            onChange={(e) => setMinSpeed(e.target.value)}
            style={{ marginLeft: 6, width: 80 }}
            aria-label="Minimum predicted speed"
          />
        </label>
        <label style={{ fontSize: 13 }}>
          <input
            type="checkbox"
            checked={hideRelated}
            onChange={(e) => setHideRelated(e.target.checked)}
          />{" "}
          Hide related
        </label>
        <label style={{ fontSize: 13 }}>
          <input
            type="checkbox"
            checked={hideTried}
            onChange={(e) => setHideTried(e.target.checked)}
          />{" "}
          Hide already-tried
        </label>
        <label style={{ fontSize: 13 }}>
          <input
            type="checkbox"
            checked={includeRetired}
            onChange={(e) => setIncludeRetired(e.target.checked)}
          />{" "}
          Include retired
        </label>
      </div>

      {rows.length > 0 ? (
        <div style={{ overflowX: "auto" }}>
          <table className={chartStyles.ledgerTable}>
            <thead>
              <tr>
                <th className={chartStyles.ledgerTh}>#</th>
                <th className={chartStyles.ledgerTh}>Pair</th>
                <th className={chartStyles.ledgerTh}>Predicted avg</th>
                <th className={chartStyles.ledgerTh}>Possible range</th>
                <th className={chartStyles.ledgerTh}>Foal DNA</th>
                <th className={chartStyles.ledgerTh}>Flags</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p, i) => {
                const sire = byId.get(p.sireId)!;
                const dam = byId.get(p.damId)!;
                const range = expectedFoalRange(
                  sire.speed,
                  dam.speed,
                  BREEDING_RANGES.speed.min,
                  BREEDING_RANGES.speed.max,
                );
                const dna = mergeDna(sire.dna || {}, dam.dna || {});
                const color = calculateColorFromDna(dna, colors);
                const surname = getSurnameFromDna(dna, {
                  sireDna: sire.dna,
                  damDna: dam.dna,
                });
                const isTried = tried.has(pairKey(p.sireId, p.damId));
                const related = p.blocked || p.sharedAncestors > 0;
                return (
                  <tr key={pairKey(p.sireId, p.damId)}>
                    <td className={chartStyles.ledgerTd}>{i + 1}</td>
                    <td className={chartStyles.ledgerTd}>
                      <Link
                        href={`/horses/${sire.id}`}
                        className={chartStyles.ledgerLink}
                      >
                        {getHorseFullName(sire)}
                      </Link>{" "}
                      ×{" "}
                      <Link
                        href={`/horses/${dam.id}`}
                        className={chartStyles.ledgerLink}
                      >
                        {getHorseFullName(dam)}
                      </Link>
                    </td>
                    <td className={chartStyles.ledgerTd}>
                      {translateStat("speed", p.midSpeed).toFixed(2)} m/s
                    </td>
                    <td
                      className={chartStyles.ledgerTd}
                      title="Possible range per the vanilla breeding roll; real foals cluster at the midpoint."
                    >
                      {translateStat("speed", range.lo).toFixed(2)}–
                      {translateStat("speed", range.hi).toFixed(2)} m/s
                    </td>
                    <td className={chartStyles.ledgerTd}>
                      <span
                        style={{
                          display: "inline-block",
                          width: 10,
                          height: 10,
                          borderRadius: 3,
                          backgroundColor: color,
                          marginRight: 6,
                        }}
                      />
                      {surname}
                    </td>
                    <td className={chartStyles.ledgerTd}>
                      {related && (
                        <span title={`${p.sharedAncestors} shared ancestor(s) within 3 generations`}>
                          🧬 related
                        </span>
                      )}
                      {related && isTried && " · "}
                      {isTried && <span title="This pair already has foals">✓ tried</span>}
                      {!related && !isTried && "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className={chartStyles.mutedNote}>
          No eligible pairs — record at least two living horses with speed stats.
        </p>
      )}
      <p className={chartStyles.mutedNote} style={{ marginBottom: 0 }}>
        Predicted avg is the parents&apos; midpoint; the range follows the
        vanilla roll. Related flags never block — the Breeding Rules switch in
        the sidebar controls hard blocks at save time.
      </p>
    </ChartCard>
  );
}
