"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Bloodline } from "@/lib/bloodlines";
import addBloodlineAction from "@/actions/addBloodlineAction";
import updateBloodlineColorAction from "@/actions/updateBloodlineColorAction";
import deleteBloodlineAction from "@/actions/deleteBloodlineAction";
import { vars } from "@/styles/theme.css";
import * as styles from "./BloodlineManager.css";

export default function BloodlineManager({
  initial,
}: {
  initial: Bloodline[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [hexColor, setHexColor] = useState("#888888");
  const [theme, setTheme] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const onAdd = () =>
    run(async () => {
      await addBloodlineAction({ name: name.trim(), hexColor, theme: theme.trim() });
      setName("");
      setTheme("");
    });

  return (
    <div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", color: vars.color.inkSoft, fontFamily: vars.font.display, borderBottom: `2px solid ${vars.color.goldSoft}` }}>
            <th>Swatch</th>
            <th>Name</th>
            <th>Theme</th>
            <th>Color</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {initial.map((b) => (
            <tr key={b.name} style={{ borderBottom: `1px solid ${vars.color.goldSoft}` }}>
              <td>
                <span
                  style={{
                    display: "inline-block",
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    backgroundColor: b.hexColor,
                    border: `1px solid ${vars.color.border}`,
                  }}
                />
              </td>
              <td style={{ fontWeight: 600 }}>{b.name}</td>
              <td style={{ opacity: 0.7 }}>{b.theme || "—"}</td>
              <td>
                <input
                  type="color"
                  value={b.hexColor}
                  disabled={busy}
                  className={styles.colorInput}
                  onChange={(e) =>
                    run(() => updateBloodlineColorAction(b.name, e.target.value))
                  }
                  title={`Recolor ${b.name}`}
                />
              </td>
              <td>
                <button
                  disabled={busy}
                  className={styles.deleteButton}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Delete bloodline "${b.name}"? Blocked while any horse references it.`,
                      )
                    ) {
                      void run(() => deleteBloodlineAction(b.name));
                    }
                  }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {initial.length === 0 && (
            <tr>
              <td colSpan={5} style={{ opacity: 0.5 }}>
                No bloodlines yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <h2 style={{ marginTop: 32, fontFamily: vars.font.display, color: vars.color.ink }}>Add Bloodline</h2>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
        <label className={styles.formLabel}>
          Name
          <input
            value={name}
            className={styles.input}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Stormmane"
            disabled={busy}
          />
        </label>
        <label className={styles.formLabel}>
          Color
          <input
            type="color"
            value={hexColor}
            className={styles.colorInput}
            onChange={(e) => setHexColor(e.target.value)}
            disabled={busy}
          />
        </label>
        <label className={styles.formLabel}>
          Theme (optional)
          <input
            value={theme}
            className={styles.input}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="e.g. storm / night sky"
            disabled={busy}
          />
        </label>
        <button className={styles.addButton} disabled={busy || !name.trim()} onClick={() => void onAdd()}>
          Add
        </button>
      </div>

      {error && (
        <div role="alert" style={{ marginTop: 16, color: vars.color.danger }}>
          {error}
        </div>
      )}
    </div>
  );
}
