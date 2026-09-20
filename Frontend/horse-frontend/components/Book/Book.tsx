import Link from "next/link";
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

/** Opening cover: what this book is, where to go, how to begin. */
export function Cover() {
  const chapters = [
    {
      numeral: "I",
      title: "Record horses",
      text: "New Horse button or pasted /summon stats — parents, variants, and all.",
      href: "/horses",
    },
    {
      numeral: "II",
      title: "Trace lineage",
      text: "The family tree, stat-ranked views, and highlights.",
      href: "/horses",
    },
    {
      numeral: "III",
      title: "Keep the blood",
      text: "Registry, purity tiers, family records, and breeding rules.",
      href: "/bloodlines",
    },
  ];
  const steps = [
    "Add two founders",
    "Breed toward faster foals",
    "Read the tree",
  ];
  return (
    <section className={styles.cover}>
      <div className={styles.coverEyebrow}>Chapter I · The Stable</div>
      <h1 className={styles.coverTitle}>The Horse Studbook</h1>
      <hr className={styles.coverRule} />
      <p className={styles.coverIntro}>
        A personal breeding record for a Minecraft horse program — every horse
        recorded with its stats, parents, and DNA, so faster foals are bred on
        purpose, not by accident.
      </p>
      <div className={styles.chapterCards}>
        {chapters.map((c) => (
          <Link key={c.title} href={c.href} className={styles.chapterCard}>
            <span className={styles.chapterCardNumeral}>{c.numeral}</span>
            <div className={styles.chapterCardTitle}>{c.title}</div>
            <p className={styles.chapterCardText}>{c.text}</p>
          </Link>
        ))}
      </div>
      <div className={styles.firstSteps}>
        {steps.map((step, i) => (
          <span key={step} className={styles.firstStep}>
            <span className={styles.firstStepNumber}>{i + 1}</span> {step}
          </span>
        ))}
      </div>
    </section>
  );
}
