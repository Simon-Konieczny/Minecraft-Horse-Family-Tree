import * as styles from "./Charts.css";

export function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.card}>
      <h3 className={styles.cardTitle}>{title}</h3>
      {children}
    </section>
  );
}

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

export interface BarRow {
  label: string;
  value: number;
  color?: string;
  displayValue?: string;
}

export function Bars({
  rows,
  barColor,
}: {
  rows: BarRow[];
  barColor?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {rows.map((r) => (
        <div key={r.label} className={styles.barRow}>
          <span className={styles.barLabel}>{r.label}</span>
          <span className={styles.barTrack}>
            <span
              style={{
                display: "block",
                height: "100%",
                width: `${(r.value / max) * 100}%`,
                backgroundColor: r.color || barColor || "#b98a2f",
                borderRadius: "9999px",
              }}
            />
          </span>
          <span className={styles.barValue}>{r.displayValue ?? r.value}</span>
        </div>
      ))}
    </div>
  );
}

export interface AreaPoint {
  generation: number;
  shares: Record<string, number>;
}

/**
 * 100% stacked area of bloodline shares across generations.
 * Needs at least 2 generations; otherwise renders an explanatory note.
 */
export function StackedArea({
  data,
  colors,
  height = 220,
}: {
  data: AreaPoint[];
  colors: Record<string, string>;
  height?: number;
}) {
  const names = [...new Set(data.flatMap((d) => Object.keys(d.shares)))].sort(
    (a, b) =>
      data.reduce((t, d) => t + (d.shares[b] || 0), 0) -
      data.reduce((t, d) => t + (d.shares[a] || 0), 0),
  );
  if (data.length < 2 || names.length === 0) {
    return (
      <p className={styles.mutedNote}>
        Market share appears once horses span at least two generations.
      </p>
    );
  }

  const width = 600;
  const padLeft = 8;
  const padBottom = 24;
  const plotW = width - padLeft * 2;
  const plotH = height - padBottom;
  const x = (i: number) =>
    padLeft + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  const totals = data.map((d) =>
    Math.max(
      1e-9,
      Object.values(d.shares).reduce((t, v) => t + v, 0),
    ),
  );
  // Cumulative top edge per bloodline per generation.
  const tops: number[][] = names.map((_, ni) =>
    data.map((d, gi) => {
      let cum = 0;
      for (let k = 0; k <= ni; k++) cum += d.shares[names[k]] || 0;
      return cum / totals[gi];
    }),
  );
  const y = (frac: number) => plotH * (1 - Math.min(1, Math.max(0, frac)));
  const pathFor = (ni: number): string => {
    const top = tops[ni].map((f, gi) => `${x(gi)},${y(f)}`).join(" L");
    const bottomPath =
      ni === 0
        ? [`${x(data.length - 1)},${y(0)}`, `${x(0)},${y(0)}`].join(" L")
        : tops[ni - 1]
            .map((f, gi) => ({ gi, f }))
            .reverse()
            .map(({ gi, f }) => `${x(gi)},${y(f)}`)
            .join(" L");
    return `M${top} L${bottomPath} Z`;
  };

  return (
    <div>
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Bloodline market share by generation"
      >
        {names.map((name, ni) => (
          <path
            key={name}
            d={pathFor(ni)}
            fill={colors[name] || "#94a3b8"}
            opacity={0.85}
            stroke="#f4ecd9"
            strokeWidth={1}
          />
        ))}
        {data.map((d, gi) => (
          <text
            key={d.generation}
            x={x(gi)}
            y={height - 8}
            textAnchor="middle"
            className={styles.areaLabels}
          >
            Gen {d.generation}
          </text>
        ))}
      </svg>
      <div className={styles.legend}>
        {names.map((name) => (
          <span key={name} className={styles.legendRow}>
            <span
              className={styles.legendSwatch}
              style={{ backgroundColor: colors[name] || "#94a3b8" }}
            />
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}

export interface PaletteItem {
  name: string;
  hexColor: string;
  count: number;
  theme?: string;
}

export function PaletteGrid({ items }: { items: PaletteItem[] }) {
  if (items.length === 0) {
    return <p className={styles.mutedNote}>No bloodlines yet.</p>;
  }
  return (
    <div className={styles.paletteGrid}>
      {items.map((item) => (
        <div key={item.name} className={styles.paletteCard}>
          <div
            className={styles.paletteSwatch}
            style={{ backgroundColor: item.hexColor }}
          />
          <div className={styles.paletteBody}>
            <div className={styles.paletteName}>{item.name}</div>
            <div className={styles.paletteMeta}>
              {item.count} horse{item.count === 1 ? "" : "s"}
              {item.theme ? ` · ${item.theme}` : ""}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

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
}: {
  points: TrendPoint[];
  height?: number;
  color?: string;
  unit?: string;
}) {
  if (points.length === 0) {
    return <p className={styles.mutedNote}>Not enough data yet.</p>;
  }
  const width = 600;
  const padLeft = 44;
  const padBottom = 24;
  const padTop = 12;
  const plotW = width - padLeft - 8;
  const plotH = height - padBottom - padTop;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
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
            <text x={padLeft - 6} y={y(v) + 4} textAnchor="end" className={styles.areaLabels}>
              {v.toFixed(1)}
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
      {points.map((p, i) => (
        <circle key={p.label} cx={x(i)} cy={y(p.value)} r={4} fill={color}>
          <title>{`${p.label}: ${p.value.toFixed(2)}${unit ? ` ${unit}` : ""}`}</title>
        </circle>
      ))}
      {points.map((p, i) => (
        <text
          key={p.label}
          x={x(i)}
          y={height - 8}
          textAnchor="middle"
          className={styles.areaLabels}
        >
          {p.label}
        </text>
      ))}
    </svg>
  );
}

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
    return <p className={styles.mutedNote}>Not enough data yet.</p>;
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
}: {
  points: ScatterPoint[];
  height?: number;
  xLabel: string;
  yLabel: string;
}) {
  if (points.length === 0) {
    return <p className={styles.mutedNote}>Not enough data yet.</p>;
  }
  const width = 600;
  const padLeft = 44;
  const padBottom = 28;
  const padTop = 12;
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
    <svg
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${yLabel} versus ${xLabel}`}
    >
      {[yMin, (yMin + yMax) / 2, yMax].map((v) => (
        <g key={v}>
          <line x1={padLeft} x2={width - 8} y1={y(v)} y2={y(v)} stroke="#e8d5a3" strokeWidth={1} />
          <text x={padLeft - 6} y={y(v) + 4} textAnchor="end" className={styles.areaLabels}>
            {v.toFixed(1)}
          </text>
        </g>
      ))}
      {[xMin, (xMin + xMax) / 2, xMax].map((v) => (
        <text key={v} x={x(v)} y={height - 8} textAnchor="middle" className={styles.areaLabels}>
          {v.toFixed(1)}
        </text>
      ))}
      {points.map((p, i) => (
        <circle key={`${p.label}-${i}`} cx={x(p.x)} cy={y(p.y)} r={5} fill={p.color} opacity={0.85}>
          <title>{p.label}</title>
        </circle>
      ))}
      <text x={padLeft - 34} y={padTop + 8} textAnchor="middle" className={styles.areaLabels}>
        {yLabel}
      </text>
      <text x={padLeft + plotW} y={height - 8} textAnchor="end" className={styles.areaLabels}>
        {xLabel}
      </text>
    </svg>
  );
}
