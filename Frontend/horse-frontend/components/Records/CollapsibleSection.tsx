"use client";

import { useState } from "react";
import { vars } from "@/styles/theme.css";

/**
 * Expandable chapter grouping for the Records page. Headers carry an
 * item count so collapsed sections still communicate their weight.
 */
export default function CollapsibleSection({
  title,
  count,
  defaultOpen = true,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section style={{ marginTop: 24 }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          background: "none",
          border: "none",
          borderBottom: `2px solid ${vars.color.goldSoft}`,
          padding: "8px 0",
          cursor: "pointer",
          fontFamily: vars.font.display,
          fontSize: vars.fontSize.md,
          fontWeight: vars.fontWeight.bold,
          color: vars.color.ink,
          textAlign: "left",
        }}
      >
        <span aria-hidden>{open ? "▾" : "▸"}</span>
        {title}
        {count !== undefined && (
          <span style={{ opacity: 0.55, fontWeight: 400, fontSize: 13 }}>
            ({count})
          </span>
        )}
      </button>
      {open && <div style={{ marginTop: 16 }}>{children}</div>}
    </section>
  );
}
