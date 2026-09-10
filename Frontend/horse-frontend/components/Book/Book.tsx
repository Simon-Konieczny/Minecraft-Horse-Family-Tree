import * as styles from "./Book.css";

export function ChapterHeading({
  numeral,
  title,
  subtitle,
}: {
  numeral: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <header className={styles.chapter}>
      <div className={styles.numeral}>{numeral}</div>
      <h1 className={styles.title}>{title}</h1>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      <hr className={styles.rule} />
    </header>
  );
}

export function Folio({ text }: { text: string }) {
  return <div className={styles.folio}>❦&ensp;{text}&ensp;❦</div>;
}

/** Floating chapter plate for full-bleed pages (e.g. the lineage map). */
export function ChapterPlate({
  numeral,
  title,
}: {
  numeral: string;
  title: string;
}) {
  return (
    <div className={styles.plate}>
      <div className={styles.plateNumeral}>{numeral}</div>
      <div className={styles.plateTitle}>{title}</div>
    </div>
  );
}
