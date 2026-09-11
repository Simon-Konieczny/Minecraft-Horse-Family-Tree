"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { bloodlineSlug } from "@/utils/bloodlineValidation";
import { useBloodlines } from "@/components/Bloodlines/BloodlineProvider";
import addBloodlineAction from "@/actions/addBloodlineAction";

/** Default swatch for registry entries bootstrapped from a surname. */
const DEFAULT_HEX = "#888888";

/**
 * Bridges the Family Name input to the bloodline registry (slug-compared).
 * Linked (visible match) -> confirmation chip; hidden match -> neutral
 * note; no match -> one-click register. Never writes implicitly — the
 * register button is the only write path, and DNA is never invented.
 */
export default function FamilyNameBloodlineLink({
  familyName,
}: {
  familyName: string;
}) {
  const bloodlines = useBloodlines();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = (familyName || "").trim();
  if (!trimmed) return null;

  const match = bloodlines.find(
    (b) => bloodlineSlug(b.name) === bloodlineSlug(trimmed),
  );

  const onRegister = async () => {
    setBusy(true);
    setError(null);
    try {
      await addBloodlineAction({ name: trimmed, hexColor: DEFAULT_HEX });
    } catch (err) {
      // A clash means the entry appeared concurrently — either way the
      // refresh below picks up the registry state and flips to linked.
      if (!(err instanceof Error && err.message.includes("already exists"))) {
        setError(err instanceof Error ? err.message : "Could not register bloodline.");
        console.error(err);
        setBusy(false);
        return;
      }
    }
    router.refresh();
    setBusy(false);
  };

  if (match && !match.hidden) {
    return (
      <div style={{ fontSize: 12, opacity: 0.85 }}>
        <span
          style={{
            display: "inline-block",
            width: 10,
            height: 10,
            borderRadius: 3,
            backgroundColor: match.hexColor,
            marginRight: 6,
            verticalAlign: "baseline",
          }}
        />
        Linked to {match.name} bloodline.
      </div>
    );
  }

  if (match?.hidden) {
    return (
      <div style={{ fontSize: 12, opacity: 0.7 }}>
        &ldquo;{trimmed}&rdquo; matches hidden bloodline {match.name} — reveal
        it in the Registry to link.
      </div>
    );
  }

  return (
    <div style={{ fontSize: 12, opacity: 0.85 }}>
      <span>No &ldquo;{trimmed}&rdquo; bloodline yet. </span>
      <button
        type="button"
        onClick={() => void onRegister()}
        disabled={busy}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: busy ? "default" : "pointer",
          textDecoration: "underline",
          fontSize: 12,
          color: "inherit",
          fontWeight: 700,
        }}
      >
        {busy ? "Registering…" : `Register "${trimmed}"`}
      </button>
      <span style={{ opacity: 0.7 }}> — color editable later in the Registry.</span>
      {error && (
        <div role="alert" style={{ marginTop: 4 }}>
          {error}
        </div>
      )}
    </div>
  );
}
