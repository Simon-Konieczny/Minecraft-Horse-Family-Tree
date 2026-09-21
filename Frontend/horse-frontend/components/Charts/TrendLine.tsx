import * as styles from "./Charts.css";
import { FALLBACK_HEX_COLOR } from "@/utils/bloodlineValidation";

export interface TrendPoint {
  label: string;
  value: number;
}

/** Single-series line + area over ordered points (e.g. avg stat by generation). */
export function TrendLine({
  points,
  height = 200,
  color = "#b98a2f",
  unit = "",
  decimals = 1,
  compare = null,
}: {
  points: TrendPoint[];
  height?: number;
  color?: string;
  unit?: string;
  decimals?: number;
  /** Optional dashed overlay series (e.g. per-generation best vs average). */
  compare?: { points: TrendPoint[]; label: string } | null;
}) {
  if (points.length === 0) {
    return <p className={styles.mutedNote}>Not enough data yet.</p>;
  }
  const width = 600;
  const padLeft = 64;
  const padBottom = 36;
  const padTop = 12;
  const plotW = width - padLeft - 8;
  const plotH = height - padBottom - padTop;
  const values = points.map((p) => p.value);
  const compareValues = compare?.points.map((p) => p.value) ?? [];
  const min = Math.min(...values, ...compareValues);
  const max = Math.max(...values, ...compareValues);
  const span = max - min > 0 ? max - min : 1;
  const x = (i: number) =>
    padLeft + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const y = (v: number) => padTop + plotH * (1 - (v - min) / span);
  const base = y(min);
  const line = points.map((p, i) => `${x(i)},${y(p.value)}`).join(" L");

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Trend chart"
    >
      {[0, 0.5, 1].map((f) => {
        const v = min + span * f;
        return (
          <g key={f}>
            <line
              x1={padLeft}
              x2={width - 8}
              y1={y(v)}
              y2={y(v)}
              stroke="#e8d5a3"
              strokeWidth={1}
            />
            <text x={padLeft - 8} y={y(v) + 4} textAnchor="end" className={styles.areaLabels}>
              {v.toFixed(decimals)}
              {unit ? ` ${unit}` : ""}
            </text>
          </g>
        );
      })}
      <path
        d={`M${line} L${x(points.length - 1)},${base} L${x(0)},${base} Z`}
        fill={color}
        opacity={0.18}
        stroke="none"
      />
      <path d={`M${line}`} fill="none" stroke={color} strokeWidth={2.5} />
      {compare && compare.points.length > 0 && (
        <path
          d={`M${compare.points.map((p, i) => `${x(i)},${y(p.value)}`).join(" L")}`}
          fill="none"
          stroke={FALLBACK_HEX_COLOR}
          strokeWidth={2}
          strokeDasharray="6 4"
        >
          <title>{compare.label}</title>
        </path>
      )}
      {points.map((p, i) => (
        <circle key={p.label} cx={x(i)} cy={y(p.value)} r={4} fill={color}>
          <title>{`${p.label}: ${p.value.toFixed(2)}${unit ? ` ${unit}` : ""}`}</title>
        </circle>
      ))}
      {points.map((p, i) => (
        <text
          key={p.label}
          x={x(i)}
          y={height - 10}
          textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
          className={styles.areaLabels}
        >
          {p.label}
        </text>
      ))}
    </svg>
  );
}
