import { Horse } from "@/types/horse";
import * as styles from "./HorsePageHeader.css";
import { getHorseVariantImage, getVariantName } from "@/utils/variant";
import { getHorseFullName } from "@/utils/horseNames";
import { getPurityTier } from "@/utils/genetics/utils";
import Image from "next/image";

export default function HorsePageHeader({ horse, horseColor }: { horse: Horse; horseColor: string }) {
  const horseImage = getHorseVariantImage(horse.variant);
  const variantName = getVariantName(horse.variant);
  const tier = getPurityTier(horse.dna);
  
  return (
    <header className={styles.header}>
      <div className={styles.imageContainer}>
        <Image 
          src={horseImage} 
          alt={getHorseFullName(horse)} 
          width={100} 
          height={100} 
          className={styles.variantImage}
        />
      </div>
      <div className={styles.titles}>
        <span
          className={horse.status === 0 ? styles.statusDead : styles.statusAlive}
        >
          {horse.status === 0 ? "Deceased" : "Living"}
        </span>
        <h1 className={styles.heading} style={{ color: horseColor }}>
          {getHorseFullName(horse)}
        </h1>
        <p className={styles.subHeading}>{variantName} Variant • Generation {horse.generation || 0} • {tier.label}</p>
      </div>
    </header>
  );
}
