import * as styles from "./Charts.css";

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

export function Donut({
  segments,
  size = 160,
  thickness = 28,
  centerLabel,
}: {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
}) {
  const total = segments.reduce((t, s) => t + s.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcs = segments.reduce<
    { segment: DonutSegment; frac: number; start: number }[]
  >((acc, s) => {
    const frac = total > 0 ? s.value / total : 0;
    const prev = acc[acc.length - 1];
    const start = prev ? prev.start + prev.frac : 0;
    return [...acc, { segment: s, frac, start }];
  }, []);
  return (
    <div className={styles.donutWrap}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={centerLabel || "Donut chart"}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          stroke="var(--donut-track, #e9dcc0)"
        />
        {arcs.map(({ segment: s, frac, start }) => (
          <circle
            key={s.label}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={s.color}
            strokeWidth={thickness}
            strokeDasharray={`${frac * circumference} ${circumference}`}
            strokeDashoffset={-start * circumference}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ))}
        {centerLabel && (
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={size / 7}
            className={styles.donutLabel}
          >
            {centerLabel}
          </text>
        )}
      </svg>
      <div className={styles.legend}>
        {segments.map((s) => (
          <span key={s.label} className={styles.legendRow}>
            <span
              className={styles.legendSwatch}
              style={{ backgroundColor: s.color }}
            />
            {s.label}: {s.value}
          </span>
        ))}
      </div>
    </div>
  );
}
