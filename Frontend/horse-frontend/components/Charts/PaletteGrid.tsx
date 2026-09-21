import * as styles from "./Charts.css";

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
