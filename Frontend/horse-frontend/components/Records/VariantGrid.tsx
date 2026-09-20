"use client";

import Image from "next/image";
import { getHorseVariantImage, getVariantName } from "@/utils/variant";
import * as chartStyles from "@/components/Charts/Charts.css";

/**
 * Read-only variant census: reuses the create/edit tile visuals
 * (horse image + name) with a count + frequency bar per variant.
 * Renders in canonical create/edit (color-major) order passed by the
 * caller; zero-count combos render dimmed with a Missing badge so
 * gaps are scannable.
 */
export default function VariantGrid({
  counts,
  total,
}: {
  counts: { variant: number; count: number }[];
  total: number;
}) {
  // Preserve caller order (canonical color-major); scale bars by max.
  const max = Math.max(1, ...counts.map((c) => c.count));
  if (counts.length === 0 || total <= 0) {
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
      {counts.map(({ variant, count }) => {
        const missing = count <= 0;
        return (
        <div
          key={variant}
          title={
            missing
              ? `${getVariantName(variant)} — missing in scope`
              : `${getVariantName(variant)} — ${count} of ${total} horses`
          }
          style={{
            border: missing ? "1px dashed #d8c49a" : "1px solid #e8d5a3",
            borderRadius: 8,
            padding: 8,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            opacity: missing ? 0.55 : 1,
            height: "100%",
          }}
        >
          <Image
            src={getHorseVariantImage(variant)}
            alt={getVariantName(variant)}
            width={64}
            height={64}
            style={missing ? { filter: "grayscale(60%)" } : undefined}
          />
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              textAlign: "center",
              lineHeight: 1.3,
              minHeight: "2.6em",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {getVariantName(variant)}
          </span>
          <span
            style={{
              minHeight: 22,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {missing ? (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 0.4,
                  textTransform: "uppercase",
                  border: "1px solid #d8c49a",
                  borderRadius: 9999,
                  padding: "1px 8px",
                }}
              >
                Missing
              </span>
            ) : (
              <span
                aria-hidden
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  border: "1px solid transparent",
                  borderRadius: 9999,
                  padding: "1px 8px",
                  visibility: "hidden",
                }}
              >
                Missing
              </span>
            )}
          </span>
          <span
            style={{
              marginTop: "auto",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
            }}
          >
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
          </span>
        </div>
        );
      })}
    </div>
  );
}
