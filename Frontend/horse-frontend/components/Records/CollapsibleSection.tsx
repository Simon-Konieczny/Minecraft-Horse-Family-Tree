"use client";

import { useState } from "react";
import { vars } from "@/styles/theme.css";

/**
 * Expandable chapter grouping for the Records page. Headers carry an
 * item count so collapsed sections still communicate their weight.
 * Controlled when `open`/`onToggle` are provided (mini-nav +
 * expand/collapse-all); uncontrolled otherwise.
 */
export default function CollapsibleSection({
  title,
  count,
  defaultOpen = true,
  open: controlledOpen,
  onToggle,
  id,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  open?: boolean;
  onToggle?: () => void;
  id?: string;
  children: React.ReactNode;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = controlledOpen ?? uncontrolledOpen;
  const toggle = onToggle ?? (() => setUncontrolledOpen((v) => !v));
  return (
    <section id={id} style={{ marginTop: 24, scrollMarginTop: 96 }}>
      <button
        type="button"
        onClick={toggle}
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
