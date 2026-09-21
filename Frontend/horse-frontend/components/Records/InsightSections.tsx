"use client";

import Link from "next/link";
import type {
  BloodlineCrossCell,
  BubbleWatch,
  FounderLegacy,
  GenerationRecord,
  InbredSplit,
  AliveDeadSplit,
  ParentReliability,
  VariantUnlockHint,
} from "@/utils/herdInsights";
import { getVariantName } from "@/utils/variant";
import { FALLBACK_HEX_COLOR } from "@/utils/bloodlineValidation";
import { ChartCard, TrendLine } from "@/components/Charts/Charts";
import * as chartStyles from "@/components/Charts/Charts.css";

const FIELD_META = {
  speed: { label: "Speed", unit: "m/s", decimals: 2 },
  jump: { label: "Jump", unit: "blocks", decimals: 2 },
  health: { label: "Health", unit: "hp", decimals: 1 },
} as const;

function HorseLink({ id, nameOf }: { id: string; nameOf: (id: string) => string }) {
  return (
    <Link href={`/horses/${id}`} className={chartStyles.ledgerLink}>
      {nameOf(id)}
    </Link>
  );
}

/** Horses clustered around the active-herd cuts — one foal moves them across. */
export function BubbleWatchCard({
  bubble,
  nameOf,
}: {
  bubble: BubbleWatch;
  nameOf: (id: string) => string;
}) {
  const rows = (["speed", "jump", "health"] as const).flatMap((field) =>
    bubble[field].map((r) => ({ ...r, field })),
  );
  if (rows.length === 0) {
    return (
      <ChartCard title="Bubble Watch">
        <p className={chartStyles.mutedNote}>Not enough ranked horses yet.</p>
      </ChartCard>
    );
  }
  return (
    <ChartCard title={`Bubble Watch — ${rows.length} horses near a cut`}>
      <p className={chartStyles.mutedNote} style={{ margin: 0 }}>
        + inside the cut by this much, − outside by this much. These horses
        decide your next in-game moves.
      </p>
      <div style={{ maxHeight: 320, overflowY: "auto" }}>
        <table className={chartStyles.ledgerTable}>
          <thead>
            <tr>
              <th className={chartStyles.ledgerTh}>Horse</th>
              <th className={chartStyles.ledgerTh}>Cut</th>
              <th className={chartStyles.ledgerTh}>#</th>
              <th className={chartStyles.ledgerTh}>Δ to cut</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const meta = FIELD_META[r.field];
              return (
                <tr key={`${r.field}-${r.id}`}>
                  <td className={chartStyles.ledgerTd}>
                    <HorseLink id={r.id} nameOf={nameOf} />
                  </td>
                  <td className={chartStyles.ledgerTd}>{meta.label}</td>
                  <td className={chartStyles.ledgerTd}>{r.rank}</td>
                  <td
                    className={chartStyles.ledgerTd}
                    style={{
                      color: r.inside ? "#2d4a3e" : "#8f2d22",
                      fontWeight: 700,
                    }}
                  >
                    {(r.delta >= 0 ? "+" : "") + r.delta.toFixed(meta.decimals)} {meta.unit}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}

/** Living horses outside every cut — who leaves the active stable next. */
export function CullListCard({
  pastured,
  nameOf,
  pastureGroupOf,
  speedOf,
}: {
  pastured: { id: string }[];
  nameOf: (id: string) => string;
  pastureGroupOf: (id: string) => string;
  speedOf: (id: string) => number | null;
}) {
  const ranked = [...pastured]
    .sort((a, b) => (speedOf(b.id) ?? -Infinity) - (speedOf(a.id) ?? -Infinity))
    .slice(0, 12);
  return (
    <ChartCard title={`Pasture Candidates — ${pastured.length} outside all cuts`}>
      <p className={chartStyles.mutedNote} style={{ margin: 0 }}>
        Fastest-out first, with the heritage pasture group each belongs in.
      </p>
      {ranked.length > 0 ? (
        <table className={chartStyles.ledgerTable}>
          <thead>
            <tr>
              <th className={chartStyles.ledgerTh}>Horse</th>
              <th className={chartStyles.ledgerTh}>Pasture</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((h) => (
              <tr key={h.id}>
                <td className={chartStyles.ledgerTd}>
                  <HorseLink id={h.id} nameOf={nameOf} />
                </td>
                <td className={chartStyles.ledgerTd}>{pastureGroupOf(h.id)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className={chartStyles.mutedNote}>Nobody — the whole living herd is active.</p>
      )}
    </ChartCard>
  );
}

function SignedDelta({ value, decimals, unit }: { value: number | null; decimals: number; unit: string }) {
  if (value === null) return <span>—</span>;
  return (
    <span style={{ color: value > 0 ? "#2d4a3e" : value < 0 ? "#8f2d22" : "inherit", fontWeight: 700 }}>
      {(value >= 0 ? "+" : "") + value.toFixed(decimals)} {unit}
    </span>
  );
}

/** Fast horse vs fast producer: foal averages against own stats. */
export function ReliabilityCard({
  rows,
  nameOf,
}: {
  rows: ParentReliability[];
  nameOf: (id: string) => string;
}) {
  const top = rows.slice(0, 10);
  if (top.length === 0) {
    return (
      <ChartCard title="Parent Reliability">
        <p className={chartStyles.mutedNote}>No foals with recorded parents yet.</p>
      </ChartCard>
    );
  }
  return (
    <ChartCard title={`Parent Reliability — top ${top.length} of ${rows.length} producers`}>
      <p className={chartStyles.mutedNote} style={{ margin: 0 }}>
        Foal average minus the parent&apos;s own stats. Positive means the
        parent upgrades its partners.
      </p>
      <div style={{ overflowX: "auto" }}>
        <table className={chartStyles.ledgerTable}>
          <thead>
            <tr>
              <th className={chartStyles.ledgerTh}>Parent</th>
              <th className={chartStyles.ledgerTh}>Foals</th>
              <th className={chartStyles.ledgerTh}>Δ Speed</th>
              <th className={chartStyles.ledgerTh}>Δ Jump</th>
              <th className={chartStyles.ledgerTh}>Δ Health</th>
              <th className={chartStyles.ledgerTh}>Best foal</th>
            </tr>
          </thead>
          <tbody>
            {top.map((r) => (
              <tr key={r.parentId}>
                <td className={chartStyles.ledgerTd}>
                  <HorseLink id={r.parentId} nameOf={nameOf} />
                </td>
                <td className={chartStyles.ledgerTd}>{r.foals}</td>
                <td className={chartStyles.ledgerTd}>
                  <SignedDelta value={r.delta.speed} decimals={2} unit="m/s" />
                </td>
                <td className={chartStyles.ledgerTd}>
                  <SignedDelta value={r.delta.jump} decimals={2} unit="blocks" />
                </td>
                <td className={chartStyles.ledgerTd}>
                  <SignedDelta value={r.delta.health} decimals={1} unit="hp" />
                </td>
                <td className={chartStyles.ledgerTd}>
                  <HorseLink id={r.bestFoalId} nameOf={nameOf} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}

/** Bloodline crosses never tried — with active pairs ready to try them. */
export function UntriedCrossesCard({
  cells,
  colors,
}: {
  cells: BloodlineCrossCell[];
  colors: Record<string, string>;
}) {
  const untried = cells.filter((c) => c.triedFoals === 0);
  const actionable = untried.filter((c) => c.activePairs > 0);
  const shown = [...actionable, ...cells.filter((c) => c.triedFoals > 0)].slice(0, 12);
  const dot = (b: string) => (
    <span
      style={{
        display: "inline-block",
        width: 10,
        height: 10,
        borderRadius: 3,
        backgroundColor: colors[b] || FALLBACK_HEX_COLOR,
        marginRight: 4,
      }}
    />
  );
  return (
    <ChartCard title={`Untried Crosses — ${untried.length} of ${cells.length} never bred`}>
      <p className={chartStyles.mutedNote} style={{ margin: 0 }}>
        {actionable.length > 0
          ? `${actionable.length} untried ${actionable.length === 1 ? "cross has" : "crosses have"} an active pair ready — breed these next.`
          : "No untried cross has an active pair right now."}
      </p>
      {shown.length > 0 ? (
        <table className={chartStyles.ledgerTable}>
          <thead>
            <tr>
              <th className={chartStyles.ledgerTh}>Cross</th>
              <th className={chartStyles.ledgerTh}>Foals</th>
              <th className={chartStyles.ledgerTh}>Active pairs</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((c) => (
              <tr key={`${c.b1}|||${c.b2}`}>
                <td className={chartStyles.ledgerTd}>
                  {dot(c.b1)}{c.b1} × {dot(c.b2)}{c.b2}
                </td>
                <td
                  className={chartStyles.ledgerTd}
                  style={{ fontWeight: c.triedFoals === 0 ? 700 : 400, color: c.triedFoals === 0 ? "#8f2d22" : "inherit" }}
                >
                  {c.triedFoals === 0 ? "never tried" : c.triedFoals}
                </td>
                <td className={chartStyles.ledgerTd}>{c.activePairs > 0 ? c.activePairs : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className={chartStyles.mutedNote}>No bloodline crosses to show yet.</p>
      )}
    </ChartCard>
  );
}

/** Missing coats and the parent pairs able to unlock them. */
export function VariantUnlockCard({ hints }: { hints: VariantUnlockHint[] }) {
  const unlockable = hints.filter((h) => h.examplePairs.length > 0);
  const shown = hints.slice(0, 8);
  return (
    <ChartCard title={`Coat Unlocks — ${unlockable.length} of ${hints.length} missing within reach`}>
      <p className={chartStyles.mutedNote} style={{ margin: 0 }}>
        Foals take color and pattern from either parent, so a missing coat
        needs its color in one parent and its pattern in either.
      </p>
      {shown.length > 0 ? (
        <table className={chartStyles.ledgerTable}>
          <thead>
            <tr>
              <th className={chartStyles.ledgerTh}>Missing coat</th>
              <th className={chartStyles.ledgerTh}>Breed to unlock</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((h) => (
              <tr key={h.missingVariant}>
                <td className={chartStyles.ledgerTd}>{getVariantName(h.missingVariant)}</td>
                <td className={chartStyles.ledgerTd}>
                  {h.examplePairs.length > 0
                    ? h.examplePairs.map(([a, b]) => `${getVariantName(a)} × ${getVariantName(b)}`).join(" · ")
                    : "no active pair carries this combo"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className={chartStyles.mutedNote}>Every coat combination is present. 🏆</p>
      )}
    </ChartCard>
  );
}

/** Which founders built the modern herd. */
export function FounderCard({
  rows,
  nameOf,
}: {
  rows: FounderLegacy[];
  nameOf: (id: string) => string;
}) {
  const top = rows.slice(0, 10);
  if (top.length === 0) {
    return (
      <ChartCard title="Founder Legacy">
        <p className={chartStyles.mutedNote}>No founders in scope yet.</p>
      </ChartCard>
    );
  }
  return (
    <ChartCard title="Founder Legacy — who built the herd">
      <table className={chartStyles.ledgerTable}>
        <thead>
          <tr>
            <th className={chartStyles.ledgerTh}>Founder</th>
            <th className={chartStyles.ledgerTh}>Living descendants</th>
            <th className={chartStyles.ledgerTh}>In active herd</th>
          </tr>
        </thead>
        <tbody>
          {top.map((r) => (
            <tr key={r.founderId}>
              <td className={chartStyles.ledgerTd}>
                <HorseLink id={r.founderId} nameOf={nameOf} />
              </td>
              <td className={chartStyles.ledgerTd}>{r.livingDescendants}</td>
              <td className={chartStyles.ledgerTd} style={{ fontWeight: 700 }}>
                {r.activeDescendants}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ChartCard>
  );
}

/** Purifying toward one line or fragmenting into hybrids? */
export function PurityCard({ points }: { points: { label: string; value: number }[] }) {
  return (
    <ChartCard title="Purity Trend — avg dominant share by gen">
      <p className={chartStyles.mutedNote} style={{ margin: 0 }}>
        Rising means the herd is purifying toward single lines; falling means
        hybrids are taking over. In percent of DNA.
      </p>
      <TrendLine points={points} unit="%" decimals={1} />
    </ChartCard>
  );
}

/** Best holder per stat per generation — record history without dates. */
export function RecordGenCard({
  rows,
  nameOf,
}: {
  rows: GenerationRecord[];
  nameOf: (id: string) => string;
}) {
  if (rows.length === 0) {
    return (
      <ChartCard title="Records by Generation">
        <p className={chartStyles.mutedNote}>No horses yet.</p>
      </ChartCard>
    );
  }
  return (
    <ChartCard title="Records by Generation">
      <div style={{ maxHeight: 320, overflowY: "auto" }}>
        <table className={chartStyles.ledgerTable}>
          <thead>
            <tr>
              <th className={chartStyles.ledgerTh}>Gen</th>
              <th className={chartStyles.ledgerTh}>⚡ Speed</th>
              <th className={chartStyles.ledgerTh}>🐎 Jump</th>
              <th className={chartStyles.ledgerTh}>❤ Health</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.generation}>
                <td className={chartStyles.ledgerTd}>{r.generation}</td>
                <td className={chartStyles.ledgerTd}>
                  {r.speed ? <><HorseLink id={r.speed.id} nameOf={nameOf} /> · {r.speed.value.toFixed(2)}</> : "—"}
                </td>
                <td className={chartStyles.ledgerTd}>
                  {r.jump ? <><HorseLink id={r.jump.id} nameOf={nameOf} /> · {r.jump.value.toFixed(2)}</> : "—"}
                </td>
                <td className={chartStyles.ledgerTd}>
                  {r.health ? <><HorseLink id={r.health.id} nameOf={nameOf} /> · {r.health.value.toFixed(1)}</> : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}

/** Do related pairings cost or pay? */
export function InbreedSplitCard({ split }: { split: InbredSplit }) {
  const row = (key: string, label: string, n: number, v: number, base: number, decimals: number, unit: string) => {
    const d = n > 0 && base > 0 ? v - base : null;
    return (
      <tr key={key}>
        <td className={chartStyles.ledgerTd}>{label}</td>
        <td className={chartStyles.ledgerTd}>{n}</td>
        <td className={chartStyles.ledgerTd}>
          {n > 0 ? `${v.toFixed(decimals)} ${unit}` : "—"}
          {d !== null && (
            <span style={{ color: d > 0 ? "#2d4a3e" : d < 0 ? "#8f2d22" : "inherit", fontWeight: 700 }}>
              {" "}{(d >= 0 ? "+" : "") + d.toFixed(decimals)}
            </span>
          )}
        </td>
      </tr>
    );
  };
  return (
    <ChartCard title="Inbreeding vs Performance">
      <p className={chartStyles.mutedNote} style={{ margin: 0 }}>
        Average stats of inbred foals against clean foals (deltas vs clean).
      </p>
      <table className={chartStyles.ledgerTable}>
        <thead>
          <tr>
            <th className={chartStyles.ledgerTh}>Group</th>
            <th className={chartStyles.ledgerTh}>Foals</th>
            <th className={chartStyles.ledgerTh}>Speed / Jump / Health</th>
          </tr>
        </thead>
        <tbody>
          {row("inbred-speed", "🧬 Inbred", split.inbred.n, split.inbred.speed, split.clean.speed, 2, "m/s")}
          {row("clean-speed", "🌱 Clean", split.clean.n, split.clean.speed, split.clean.speed, 2, "m/s")}
          {row("inbred-jump", "🧬 Inbred", split.inbred.n, split.inbred.jump, split.clean.jump, 2, "blocks")}
          {row("clean-jump", "🌱 Clean", split.clean.n, split.clean.jump, split.clean.jump, 2, "blocks")}
          {row("inbred-health", "🧬 Inbred", split.inbred.n, split.inbred.health, split.clean.health, 1, "hp")}
          {row("clean-health", "🌱 Clean", split.clean.n, split.clean.health, split.clean.health, 1, "hp")}
        </tbody>
      </table>
    </ChartCard>
  );
}

/** Total progress since day one: living averages vs deceased history. */
export function DeadAliveCard({ split }: { split: AliveDeadSplit }) {
  const row = (label: string, v: number, base: number, decimals: number, unit: string, n: number) => (
    <tr key={label}>
      <td className={chartStyles.ledgerTd}>{label}</td>
      <td className={chartStyles.ledgerTd}>{n}</td>
      <td className={chartStyles.ledgerTd}>
        {v.toFixed(decimals)} {unit}{" "}
        <span style={{ color: v - base > 0 ? "#2d4a3e" : v - base < 0 ? "#8f2d22" : "inherit", fontWeight: 700 }}>
          {(v - base >= 0 ? "+" : "") + (v - base).toFixed(decimals)}
        </span>
      </td>
    </tr>
  );
  return (
    <ChartCard title="Living vs Deceased — total progress">
      <p className={chartStyles.mutedNote} style={{ margin: 0 }}>
        Living averages against all deceased history (deltas vs deceased).
      </p>
      <table className={chartStyles.ledgerTable}>
        <thead>
          <tr>
            <th className={chartStyles.ledgerTh}>Stat</th>
            <th className={chartStyles.ledgerTh}>Horses</th>
            <th className={chartStyles.ledgerTh}>Living avg (Δ vs deceased)</th>
          </tr>
        </thead>
        <tbody>
          {row("⚡ Speed", split.living.speed, split.deceased.speed, 2, "m/s", split.living.n)}
          {row("🐎 Jump", split.living.jump, split.deceased.jump, 2, "blocks", split.living.n)}
          {row("❤ Health", split.living.health, split.deceased.health, 1, "hp", split.living.n)}
        </tbody>
      </table>
    </ChartCard>
  );
}
