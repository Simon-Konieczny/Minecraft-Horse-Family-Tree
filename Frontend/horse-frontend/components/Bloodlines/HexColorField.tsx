"use client";

import { useState } from "react";
import { normalizeHexInput } from "../../utils/bloodlineValidation";
import * as styles from "./BloodlineManager.css";

/**
 * Color picker swatch synced with a typed-hex text field, so exact
 * values (e.g. #7A4E2F) can be pasted as well as picked. The parent
 * state only ever receives valid #rrggbb strings; invalid drafts are
 * held locally with a hint and revert to the last valid value on blur.
 */
export default function HexColorField({
  value,
  onChange,
  disabled,
  id,
}: {
  value: string;
  onChange: (hex: string) => void;
  disabled?: boolean;
  id: string;
}) {
  // Draft initializes from the parent value; the parent remounts this
  // field (via key) when switching entries, so no effect sync is needed.
  const [draft, setDraft] = useState(value);
  const [touched, setTouched] = useState(false);

  const normalized = normalizeHexInput(draft);
  const showHint = touched && normalized === null;

  return (
    <span>
      <span className={styles.hexRow}>
        <input
          type="color"
          value={value}
          className={styles.colorInput}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          disabled={disabled}
          aria-label="Pick color"
        />
        <input
          id={id}
          value={draft}
          className={styles.hexInput}
          onChange={(e) => {
            const next = e.target.value;
            setDraft(next);
            setTouched(true);
            const valid = normalizeHexInput(next);
            if (valid !== null) onChange(valid);
          }}
          onBlur={() => {
            setDraft(value);
            setTouched(false);
          }}
          placeholder="#7A4E2F"
          maxLength={7}
          spellCheck={false}
          autoComplete="off"
          disabled={disabled}
          aria-label="Hex color"
          aria-invalid={showHint}
        />
      </span>
      {showHint && (
        <span className={styles.hexHint} role="note">
          Use #rrggbb format.
        </span>
      )}
    </span>
  );
}
