import React from 'react';
import * as styles from './Switch.css';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  labelLeft?: boolean;
  /** Light variant for dark backgrounds (e.g. the sidebar). */
  light?: boolean;
}

export default function Switch({ checked, onChange, label, labelLeft = true, light = false }: SwitchProps) {
  return (
    <div className={`${styles.switchWrapper} ${!labelLeft ? styles.reverse : ""}`}>
      {/* 1. The label text (e.g., "Toggle Theme") */}
      {label && <span className={light ? styles.labelLight : styles.label}>{label}</span>}

      {/* 2. The container for the actual toggle mechanism */}
      <label className={styles.switchContainer}>
        <input
          type="checkbox"
          className={styles.input} // Added this to match the new CSS class
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        {/* 3. The visual slider that slides back and forth */}
        <span className={light ? styles.sliderLight : styles.slider}></span>
      </label>
    </div>
  );
}
