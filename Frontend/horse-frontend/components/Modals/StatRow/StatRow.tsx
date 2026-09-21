import * as styles from "./StatRow.css";

interface StatRowProps {
  text: string;
  fieldName: "speed" | "health" | "jump";
  displayStats: { speed: string; health: string; jump: string };
  handleTextChange: (field: string, textValue: string) => void;
  error?: string | null;
}

export default function StatRow({
  text,
  fieldName,
  displayStats,
  handleTextChange,
  error,
}: StatRowProps) {
  return (
    <div className={styles.statRow}>
      <label className={styles.label}>{text}</label>
      <input
        className={styles.statInput}
        type="text"
        value={displayStats[fieldName]}
        onChange={(e) => handleTextChange(fieldName, e.target.value)}
      />
      {error && (
        <span style={{ color: "#8f2d22", fontSize: 12 }}>{error}</span>
      )}
    </div>
  );
}
