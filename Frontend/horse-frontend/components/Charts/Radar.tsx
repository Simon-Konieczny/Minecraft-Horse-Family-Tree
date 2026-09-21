import * as styles from "./Charts.css";

export interface RadarAxis {
  label: string;
  /** This horse's stat (translated units). */
  value: number;
  /** Herd min/max in the same units — normalization is herd-relative. */
  min: number;
  max: number;
  /** Formatted value for labels/tooltips, e.g. "14.32 m/s". */
  display: string;
}

/**
 * Spider chart of one horse's stats, each axis normalized against the
 * herd's min/max for that stat (herd-relative: the polygon shows where
 * this horse sits within the herd, not an absolute scale).
 */
export function Radar({
  axes,
  size = 240,
  color = "#b98a2f",
}: {
  axes: RadarAxis[];
  size?: number;
  color?: string;
}) {
  if (axes.length === 0) {
    return <p className={styles.statusNote}>Not enough data yet.</p>;
  }
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 44;
  const angle = (i: number) => (Math.PI * 2 * i) / axes.length - Math.PI / 2;
  const frac = (a: RadarAxis) => {
    const span = a.max - a.min;
    if (!(span > 0)) return 0.5;
    return Math.min(1, Math.max(0, (a.value - a.min) / span));
  };
  const point = (i: number, f: number): [number, number] => [
    cx + radius * f * Math.cos(angle(i)),
    cy + radius * f * Math.sin(angle(i)),
  ];
  const ring = (f: number) =>
    axes.map((_, i) => point(i, f).join(",")).join(" ");
  const polygon = axes.map((a, i) => point(i, frac(a)).join(",")).join(" ");

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="Stat radar chart"
      style={{ maxWidth: size }}
    >
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon
          key={f}
          points={ring(f)}
          fill="none"
          stroke="#e8d5a3"
          strokeWidth={1}
        />
      ))}
      {axes.map((_, i) => (
        <line
          key={i}
          x1={cx}
          y1={cy}
          x2={point(i, 1)[0]}
          y2={point(i, 1)[1]}
          stroke="#e8d5a3"
          strokeWidth={1}
        />
      ))}
      <polygon points={polygon} fill={color} opacity={0.3} stroke={color} strokeWidth={2} />
      {axes.map((a, i) => {
        const [vx, vy] = point(i, frac(a));
        const [lx, ly] = point(i, 1.28);
        return (
          <g key={a.label}>
            <circle cx={vx} cy={vy} r={4} fill={color}>
              <title>{`${a.label}: ${a.display} (herd ${a.min.toFixed(1)}–${a.max.toFixed(1)})`}</title>
            </circle>
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="central"
              className={styles.areaLabels}
            >
              {a.label} {a.display}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
