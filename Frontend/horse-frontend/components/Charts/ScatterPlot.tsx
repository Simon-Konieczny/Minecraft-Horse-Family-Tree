import * as styles from "./Charts.css";

export interface ScatterPoint {
  x: number;
  y: number;
  color: string;
  label: string;
}

/** Scatter plot with native hover titles (e.g. speed vs jump). */
export function ScatterPlot({
  points,
  height = 240,
  xLabel,
  yLabel,
  xDecimals = 2,
  yDecimals = 2,
  avgX = null,
  avgY = null,
}: {
  points: ScatterPoint[];
  height?: number;
  xLabel: string;
  yLabel: string;
  xDecimals?: number;
  yDecimals?: number;
  /** Mean reference lines (dashed gold) with legend chips. */
  avgX?: number | null;
  avgY?: number | null;
}) {
  if (points.length === 0) {
    return <p className={styles.statusNote}>Not enough data yet.</p>;
  }
  const width = 600;
  const padLeft = 60;
  const padBottom = 44;
  const padTop = 14;
  const plotW = width - padLeft - 8;
  const plotH = height - padBottom - padTop;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const xSpan = xMax - xMin > 0 ? xMax - xMin : 1;
  const ySpan = yMax - yMin > 0 ? yMax - yMin : 1;
  const x = (v: number) =>
    padLeft + ((v - xMin + xSpan * 0.08) / (xSpan * 1.16)) * plotW;
  const y = (v: number) =>
    padTop + plotH * (1 - (v - yMin + ySpan * 0.08) / (ySpan * 1.16));

  return (
    <div>
    {(avgX !== null || avgY !== null) && (
      <p className={styles.mutedNote} style={{ margin: "0 0 4px" }}>
        {avgX !== null && `avg speed ${avgX.toFixed(xDecimals)} m/s`}
        {avgX !== null && avgY !== null && " · "}
        {avgY !== null && `avg jump ${avgY.toFixed(yDecimals)} blocks`}
        {" "}— dashed lines split the herd into quadrants.
      </p>
    )}
    <svg
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${yLabel} versus ${xLabel}`}
    >
      {[yMin, (yMin + yMax) / 2, yMax].map((v) => (
        <g key={v}>
          <line x1={padLeft} x2={width - 8} y1={y(v)} y2={y(v)} stroke="#e8d5a3" strokeWidth={1} />
          <text x={padLeft - 8} y={y(v) + 4} textAnchor="end" className={styles.areaLabels}>
            {v.toFixed(yDecimals)}
          </text>
        </g>
      ))}
      {[xMin, (xMin + xMax) / 2, xMax].map((v) => (
        <text
          key={v}
          x={x(v)}
          y={height - 22}
          textAnchor={v === xMin ? "start" : v === xMax ? "end" : "middle"}
          className={styles.areaLabels}
        >
          {v.toFixed(xDecimals)}
        </text>
      ))}
      {avgX !== null && Number.isFinite(avgX) && (
        <line
          x1={x(avgX)}
          x2={x(avgX)}
          y1={padTop}
          y2={padTop + plotH}
          stroke="#b98a2f"
          strokeWidth={1.5}
          strokeDasharray="6 4"
        />
      )}
      {avgY !== null && Number.isFinite(avgY) && (
        <line
          x1={padLeft}
          x2={width - 8}
          y1={y(avgY)}
          y2={y(avgY)}
          stroke="#b98a2f"
          strokeWidth={1.5}
          strokeDasharray="6 4"
        />
      )}
      {points.map((p, i) => (
        <circle key={`${p.label}-${i}`} cx={x(p.x)} cy={y(p.y)} r={4} fill={p.color} opacity={0.85}>
          <title>{p.label}</title>
        </circle>
      ))}
      <text x={padLeft + plotW / 2} y={height - 6} textAnchor="middle" className={styles.areaLabels}>
        {xLabel}
      </text>
      <text
        x={12}
        y={padTop + plotH / 2}
        textAnchor="middle"
        className={styles.areaLabels}
        transform={`rotate(-90 12 ${padTop + plotH / 2})`}
      >
        {yLabel}
      </text>
    </svg>
    </div>
  );
}
