import * as styles from "./Charts.css";

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
