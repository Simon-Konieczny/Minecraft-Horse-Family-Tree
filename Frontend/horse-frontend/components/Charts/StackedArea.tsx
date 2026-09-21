import * as styles from "./Charts.css";
import { FALLBACK_HEX_COLOR } from "@/utils/bloodlineValidation";

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
            fill={colors[name] || FALLBACK_HEX_COLOR}
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
              style={{ backgroundColor: colors[name] || FALLBACK_HEX_COLOR }}
            />
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}
