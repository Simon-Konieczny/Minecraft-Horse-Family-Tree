"use client";

import Image from "next/image";
import { getHorseVariantImage, getVariantName } from "@/utils/variant";
import * as chartStyles from "@/components/Charts/Charts.css";

/**
 * Read-only variant census: reuses the create/edit tile visuals
 * (horse image + name) with a count + frequency bar per observed
 * variant. Unobserved combos hide behind a toggle.
 */
export default function VariantGrid({
  counts,
  total,
}: {
  counts: { variant: number; count: number }[];
  total: number;
}) {
  const sorted = [...counts].sort((a, b) => b.count - a.count);
  const max = Math.max(1, ...sorted.map((c) => c.count));
  if (sorted.length === 0) {
    return <p className={chartStyles.mutedNote}>No variants recorded yet.</p>;
  }
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
        gap: 12,
      }}
    >
      {sorted.map(({ variant, count }) => (
        <div
          key={variant}
          title={`${getVariantName(variant)} — ${count} of ${total} horses`}
          style={{
            border: "1px solid #e8d5a3",
            borderRadius: 8,
            padding: 8,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Image
            src={getHorseVariantImage(variant)}
            alt={getVariantName(variant)}
            width={64}
            height={64}
          />
          <span style={{ fontSize: 12, fontWeight: 700, textAlign: "center" }}>
            {getVariantName(variant)}
          </span>
          <span style={{ fontSize: 12, opacity: 0.75 }}>
            {count} ({((count / Math.max(1, total)) * 100).toFixed(0)}%)
          </span>
          <span
            style={{
              display: "block",
              height: 6,
              width: "100%",
              backgroundColor: "#e9dcc0",
              borderRadius: 9999,
              overflow: "hidden",
            }}
          >
            <span
              style={{
                display: "block",
                height: "100%",
                width: `${(count / max) * 100}%`,
                backgroundColor: "#b98a2f",
                borderRadius: 9999,
              }}
            />
          </span>
        </div>
      ))}
    </div>
  );
}
