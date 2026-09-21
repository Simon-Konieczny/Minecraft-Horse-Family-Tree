"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { vars } from "@/styles/theme.css";
import { FALLBACK_HEX_COLOR } from "@/utils/bloodlineValidation";
import { getVariantName, ALL_VARIANTS } from "@/utils/variant";
import {
  Bars,
  ChartCard,
} from "@/components/Charts/Charts";
import * as chartStyles from "@/components/Charts/Charts.css";
import CollapsibleSection from "@/components/Records/CollapsibleSection";
import VariantGrid from "@/components/Records/VariantGrid";
import { DeadAliveCard } from "@/components/Records/InsightSections";
import type { RecordsModel } from "../useRecordsModel";

type Props = Pick<
  RecordsModel,
  | "filtered"
  | "fullVariants"
  | "presentCount"
  | "rarest"
  | "colors"
  | "pyramid"
  | "lineage"
  | "filteredIds"
  | "deadAlive"
  | "nameOf"
  // Raw crosstab inputs; mode state + derived tables live here.
  | "crosstab"
  | "crosstabShares"
>;

export function CensusSection({
  filtered,
  fullVariants,
  presentCount,
  rarest,
  colors,
  pyramid,
  lineage,
  filteredIds,
  deadAlive,
  nameOf,
  crosstab,
  crosstabShares,
}: Props) {
  const [crosstabMode, setCrosstabMode] = useState<"split" | "dominant">("split");
  const crosstabSource: { variant: number; bloodline: string; display: string; title: string; raw: number }[] =
    crosstabMode === "split"
      ? crosstabShares.map((c) => ({
          variant: c.variant,
          bloodline: c.bloodline,
          display: c.share.toFixed(1),
          title: `${c.horses} horse${c.horses === 1 ? "" : "s"} touch this cell (DNA-split share ${c.share.toFixed(1)})`,
          raw: c.share,
        }))
      : crosstab.map((c) => ({
          variant: c.variant,
          bloodline: c.bloodline,
          display: `${c.count}`,
          title: `${c.count} horse${c.count === 1 ? "" : "s"} with this dominant bloodline`,
          raw: c.count,
        }));
  const crosstabBloodlines = [
    ...new Set(crosstabSource.map((c) => c.bloodline)),
  ].sort();
  const crosstabMax = Math.max(0, ...crosstabSource.map((c) => c.raw));
  const crosstabByVariant = new Map<number, Map<string, (typeof crosstabSource)[number]>>();
  for (const c of crosstabSource) {
    let row = crosstabByVariant.get(c.variant);
    if (!row) {
      row = new Map();
      crosstabByVariant.set(c.variant, row);
    }
    row.set(c.bloodline, c);
  }
  // Full 35 rows in canonical order; columns stay scoped to in-scope
  // bloodlines. Missing rows render all-blank so gaps are visible.
  const crosstabRows = useMemo(
    () =>
      ALL_VARIANTS.map((variant) => ({
        variant,
        row: crosstabByVariant.get(variant),
      })),
    // crosstabByVariant derives from crosstabSource; rebuild rows when it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [crosstabSource],
  );

  return (
    <CollapsibleSection title="Census" count={filtered.length} defaultOpen={false}>
      <div style={{ marginTop: 24 }}>
        <ChartCard title="Variant Distribution">
          <p className={chartStyles.mutedNote} style={{ margin: 0 }}>
            Which coats the herd wears — same pictures and order as the
            create/edit form (White + its patterns first). {presentCount} of
            35 combinations present in scope
            {rarest.length > 0 && (
              <>
                {" "}— rarest:{" "}
                {rarest.map((v) => `${getVariantName(v.variant)} (${v.count})`).join(", ")}
              </>
            )}
            .
          </p>
          <VariantGrid counts={fullVariants} total={filtered.length} />
        </ChartCard>
      </div>

      <div style={{ marginTop: 24 }}>
        <ChartCard title="Variant × Bloodline">
          <p className={chartStyles.mutedNote} style={{ margin: 0 }}>
            {crosstabMode === "split"
              ? "DNA-split shares: a 50/50 hybrid adds 0.5 to each bloodline, so mixed horses are never misattributed. All 35 coats in create/edit order — blank rows are missing in scope. Hover a cell for the horse count."
              : "Dominant-only counts: each horse sits in a single column by its top bloodline. All 35 coats in create/edit order — blank rows are missing in scope."}{" "}
            <button
              type="button"
              onClick={() => setCrosstabMode(crosstabMode === "split" ? "dominant" : "split")}
              style={{ textDecoration: "underline", cursor: "pointer", background: "none", border: "none", padding: 0, font: "inherit", color: "inherit" }}
            >
              Show {crosstabMode === "split" ? "dominant-only" : "DNA-split"} instead
            </button>
          </p>
          {filtered.length > 0 && crosstabBloodlines.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table className={chartStyles.ledgerTable} style={{ minWidth: Math.max(400, crosstabBloodlines.length * 90) }}>
                <thead>
                  <tr>
                    <th className={chartStyles.ledgerTh} style={{ position: "sticky", left: 0 }}>Variant</th>
                    {crosstabBloodlines.map((b) => (
                      <th key={b} className={chartStyles.ledgerTh}>
                        <span
                          style={{
                            display: "inline-block",
                            width: 10,
                            height: 10,
                            borderRadius: 3,
                            backgroundColor: colors[b] || FALLBACK_HEX_COLOR,
                            marginRight: 6,
                          }}
                        />
                        {b}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {crosstabRows.map(({ variant, row }) => (
                    <tr key={variant} style={row ? undefined : { opacity: 0.55 }}>
                      <td className={chartStyles.ledgerTd} style={{ position: "sticky", left: 0 }}>
                        {getVariantName(variant)}
                      </td>
                      {crosstabBloodlines.map((b) => {
                        const cell = row?.get(b);
                        const intensity = crosstabMax > 0 && cell ? cell.raw / crosstabMax : 0;
                        return (
                          <td
                            key={b}
                            className={chartStyles.ledgerTd}
                            title={cell?.title}
                            style={cell ? { backgroundColor: `rgba(185,138,47,${(intensity * 0.35).toFixed(2)})`, fontWeight: 700 } : undefined}
                          >
                            {cell ? cell.display : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={chartStyles.mutedNote}>No variants recorded yet.</p>
          )}
        </ChartCard>
      </div>

      <div style={{ marginTop: 24 }}>
        <ChartCard title="Generation Pyramid — living horses per generation">
          <p className={chartStyles.mutedNote} style={{ margin: 0 }}>
            Top-heavy means an aging herd; a wide base means a healthy foal
            pipeline coming up behind the active stable.
          </p>
          <Bars
            rows={pyramid.map((g) => ({
              label: `Gen ${g.generation}`,
              value: g.count,
            }))}
          />
        </ChartCard>
      </div>

      <div style={{ marginTop: 24 }}>
        <ChartCard title="Longest Lineage">
          {lineage.depth > 0 ? (
            <p style={{ margin: 0 }}>
              <strong style={{ fontFamily: vars.font.display, fontSize: 20 }}>
                {lineage.depth} generation{lineage.depth === 1 ? "" : "s"}
              </strong>
              <br />
              {lineage.chainIds.map((id, i) => {
                const inScope = filteredIds.has(id);
                return (
                  <span key={`${id}-${i}`}>
                    {i > 0 && " → "}
                    <Link
                      href={`/horses/${id}`}
                      className={chartStyles.ledgerLink}
                      style={
                        inScope
                          ? undefined
                          : { opacity: 0.45 }
                      }
                      title={inScope ? undefined : "Outside selected generations"}
                    >
                      {nameOf(id)}
                    </Link>
                  </span>
                );
              })}
            </p>
          ) : (
            <p className={chartStyles.mutedNote}>No horses yet.</p>
          )}
        </ChartCard>
      </div>

      <div style={{ marginTop: 24 }}>
        <DeadAliveCard split={deadAlive} />
      </div>
    </CollapsibleSection>
  );
}
