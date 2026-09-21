import * as styles from "./Charts.css";

export interface HistogramBinInput {
  start: number;
  end: number;
  count: number;
  label: string;
}

/**
 * Vertical histogram: x = value ranges along the bottom, y =
 * frequency. Bar labels are true ranges ("12.40–12.59"); counts sit
 * atop each bar. X labels rotate -25° and edge-anchor so first/last
 * never clip; y ticks are integers.
 */
export function VerticalHistogram({
  bins,
  height = 240,
  color = "#b98a2f",
  yLabel = "horses",
}: {
  bins: HistogramBinInput[];
  height?: number;
  color?: string;
  yLabel?: string;
}) {
  if (bins.length === 0) {
    return <p className={styles.statusNote}>Not enough data yet.</p>;
  }
  const width = 600;
  const padLeft = 48;
  const padBottom = 52;
  const padTop = 20;
  const plotW = width - padLeft - 12;
  const plotH = height - padBottom - padTop;
  const max = Math.max(1, ...bins.map((b) => b.count));
  const slot = plotW / bins.length;
  const barW = Math.max(4, slot - 6);
  const x = (i: number) => padLeft + slot * i + slot / 2;
  const y = (v: number) => padTop + plotH * (1 - v / max);
  // Integer y ticks, at most 6 lines.
  const tickStep = Math.max(1, Math.ceil(max / 5));
  const ticks: number[] = [];
  for (let v = 0; v <= max; v += tickStep) ticks.push(v);
  if (ticks[ticks.length - 1] !== max) ticks.push(max);

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Distribution histogram"
    >
      {ticks.map((v) => (
        <g key={v}>
          <line
            x1={padLeft}
            x2={width - 12}
            y1={y(v)}
            y2={y(v)}
            stroke="#e8d5a3"
            strokeWidth={1}
          />
          <text x={padLeft - 8} y={y(v) + 4} textAnchor="end" className={styles.areaLabels}>
            {v}
          </text>
        </g>
      ))}
      <text
        x={14}
        y={padTop + plotH / 2}
        textAnchor="middle"
        className={styles.areaLabels}
        transform={`rotate(-90 14 ${padTop + plotH / 2})`}
      >
        {yLabel}
      </text>
      {bins.map((b, i) => {
        const barH = (b.count / max) * plotH;
        const bx = x(i) - barW / 2;
        const by = padTop + plotH - barH;
        // Thin out labels when crowded: always show first/last.
        const showLabel = bins.length <= 8 || i % 2 === 0 || i === bins.length - 1;
        return (
          <g key={`${b.label}-${i}`}>
            <rect x={bx} y={by} width={barW} height={Math.max(0, barH)} fill={color} rx={3}>
              <title>{`${b.label}: ${b.count} horse${b.count === 1 ? "" : "s"}`}</title>
            </rect>
            {b.count > 0 && (
              <text x={x(i)} y={by - 5} textAnchor="middle" className={styles.areaLabels}>
                {b.count}
              </text>
            )}
            {showLabel && (
              <text
                x={x(i)}
                y={padTop + plotH + 14}
                textAnchor={i === 0 ? "start" : i === bins.length - 1 ? "end" : "middle"}
                className={styles.areaLabels}
                transform={`rotate(-25 ${x(i)} ${padTop + plotH + 14})`}
              >
                {b.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
