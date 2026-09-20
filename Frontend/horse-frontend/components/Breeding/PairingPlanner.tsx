"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { Horse } from "@/types/horse";
import type { PlannedPair } from "@/utils/analytics";
import { BREEDING_RANGES, expectedFoalRange } from "@/utils/analytics";
import {
  calculateColorFromDna,
  getSurnameFromDna,
  mergeDna,
} from "@/utils/genetics/utils";
import { translateStat } from "@/utils/translateRawStats";
import { getHorseFullName } from "@/utils/horseNames";
import { ChartCard } from "@/components/Charts/Charts";
import * as chartStyles from "@/components/Charts/Charts.css";
import Button from "@/components/Common/Button/Button";

const pairKey = (a: string, b: string) => [a, b].sort().join("|||");

export default function PairingPlanner({
  horses,
  colors,
  pairs,
  benched,
  triedKeys,
  policyBlocksRelatives,
  keeperIds = [],
  onSnapshot,
}: {
  horses: Horse[];
  colors: Record<string, string>;
  pairs: PlannedPair[];
  benched: string | null;
  triedKeys: string[];
  policyBlocksRelatives: boolean;
  keeperIds?: string[];
  onSnapshot?: () => void;
}) {
  const byId = useMemo(() => new Map(horses.map((h) => [h.id, h])), [horses]);
  const tried = useMemo(() => new Set(triedKeys), [triedKeys]);
  const keepers = useMemo(() => new Set(keeperIds), [keeperIds]);

  const rows = useMemo(
    () => pairs.filter((p) => byId.has(p.sireId) && byId.has(p.damId)),
    [pairs, byId],
  );
  const benchedHorse = benched ? byId.get(benched) : undefined;

  return (
    <ChartCard title={`Strict breeding plan (${rows.length} pair${rows.length === 1 ? "" : "s"})`}>
      {onSnapshot && rows.length > 0 && (
        <div>
          <Button
            text="☑ Snapshot plan into checklist"
            onClick={onSnapshot}
          />
        </div>
      )}
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
                const surname = getSurnameFromDna(dna);
                const isTried = tried.has(pairKey(p.sireId, p.damId));
                const related = p.blocked || p.sharedAncestors > 0;
                const keeperNote =
                  keepers.has(p.sireId) || keepers.has(p.damId)
                    ? "🛡️ keeper"
                    : null;
                return (
                  <tr key={pairKey(p.sireId, p.damId)}>
                    <td className={chartStyles.ledgerTd}>{i + 1}</td>
                    <td className={chartStyles.ledgerTd}>
                      <Link
                        href={`/horses/${sire.id}`}
                        className={chartStyles.ledgerLink}
                      >
                        {getHorseFullName(sire)}
                        {keepers.has(sire.id) ? " 🛡️" : ""}
                      </Link>{" "}
                      ×{" "}
                      <Link
                        href={`/horses/${dam.id}`}
                        className={chartStyles.ledgerLink}
                      >
                        {getHorseFullName(dam)}
                        {keepers.has(dam.id) ? " 🛡️" : ""}
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
                      {related && (isTried || keeperNote) && " · "}
                      {keeperNote && (
                        <span title="Top-16 jump/health keeper saved past the speed cut">
                          {keeperNote}
                        </span>
                      )}
                      {keeperNote && isTried && " · "}
                      {isTried && <span title="This pair already has foals">✓ tried</span>}
                      {!related && !isTried && !keeperNote && "—"}
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
      {benchedHorse && (
        <p className={chartStyles.mutedNote}>
          Benched (slowest, no partner):{" "}
          <Link href={`/horses/${benchedHorse.id}`} className={chartStyles.ledgerLink}>
            {getHorseFullName(benchedHorse)}
          </Link>{" "}
          — {translateStat("speed", benchedHorse.speed).toFixed(2)} m/s.
        </p>
      )}
      <p className={chartStyles.mutedNote} style={{ marginBottom: 0 }}>
        Active-herd order: top-63 speed ∪ top-16 jump/health, fastest × 2nd,
        3rd × 4th, … — each Active horse breeds at most once (Deceased,
        Retired, and pastured horses sit out). 🛡️ marks jump/health keepers
        saved past the speed cut. Predicted avg is the
        parents&apos; midpoint — the roll&apos;s expected value. The range is
        midpoint ± spread/2 clamped to the legal range, where spread = |x−y| +
        0.3·(max−min); real foals cluster at the midpoint. Related flags never
        block here{policyBlocksRelatives ? "" : " — the Breeding Rules switch in the sidebar controls hard blocks at save time"}.
      </p>
    </ChartCard>
  );
}
