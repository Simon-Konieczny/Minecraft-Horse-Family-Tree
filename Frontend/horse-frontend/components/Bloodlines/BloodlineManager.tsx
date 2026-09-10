"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Bloodline } from "@/lib/bloodlines";
import addBloodlineAction from "@/actions/addBloodlineAction";
import updateBloodlineColorAction from "@/actions/updateBloodlineColorAction";
import deleteBloodlineAction from "@/actions/deleteBloodlineAction";

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
          <tr style={{ textAlign: "left", opacity: 0.6 }}>
            <th>Swatch</th>
            <th>Name</th>
            <th>Theme</th>
            <th>Color</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {initial.map((b) => (
            <tr key={b.name} style={{ borderTop: "1px solid #eee" }}>
              <td>
                <span
                  style={{
                    display: "inline-block",
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    backgroundColor: b.hexColor,
                    border: "1px solid #ccc",
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
                  onChange={(e) =>
                    run(() => updateBloodlineColorAction(b.name, e.target.value))
                  }
                  title={`Recolor ${b.name}`}
                />
              </td>
              <td>
                <button
                  disabled={busy}
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

      <h2 style={{ marginTop: 32 }}>Add Bloodline</h2>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
        <label>
          Name
          <br />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Stormmane"
            disabled={busy}
          />
        </label>
        <label>
          Color
          <br />
          <input
            type="color"
            value={hexColor}
            onChange={(e) => setHexColor(e.target.value)}
            disabled={busy}
          />
        </label>
        <label>
          Theme (optional)
          <br />
          <input
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="e.g. storm / night sky"
            disabled={busy}
          />
        </label>
        <button disabled={busy || !name.trim()} onClick={() => void onAdd()}>
          Add
        </button>
      </div>

      {error && (
        <div role="alert" style={{ marginTop: 16, color: "#b91c1c" }}>
          {error}
        </div>
      )}
    </div>
  );
}
