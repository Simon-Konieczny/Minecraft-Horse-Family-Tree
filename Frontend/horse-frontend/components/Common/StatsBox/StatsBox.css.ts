import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const container = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.spacing.sm,
  marginTop: vars.spacing.md,
});

export const label = style({
  fontSize: "12px",
  fontWeight: 700,
  textTransform: "uppercase",
  color: vars.color.textMuted,
});

export const textArea = style({
  width: "100%",
  padding: vars.spacing.md,
  borderRadius: vars.borderRadius.md,
  border: `2px solid ${vars.color.goldSoft}`,
  backgroundColor: vars.color.parchment,
  fontSize: "13px",
  fontFamily: vars.font.mono,
  color: vars.color.ink,
  resize: "vertical",
  transition: "all 0.2s",
  ":focus": {
    outline: "none",
    borderColor: vars.color.gold,
    backgroundColor: vars.color.secondary,
    boxShadow: vars.shadow.sm,
  },
});

export const errorText = style({
  fontSize: "12px",
  color: vars.color.danger,
  fontWeight: 600,
  marginTop: "4px",
});

export const parsedStats = style({
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "8px",
  marginTop: "8px",
  padding: vars.spacing.md,
  backgroundColor: vars.color.parchmentDeep,
  borderRadius: vars.borderRadius.md,
  border: `1px solid ${vars.color.goldSoft}`,
});

export const statItem = style({
  display: "flex",
  flexDirection: "column",
  gap: "2px",
});

export const statLabel = style({
  fontSize: "10px",
  fontWeight: 700,
  color: vars.color.inkSoft,
  textTransform: "uppercase",
  fontFamily: vars.font.display,
  letterSpacing: "0.08em",
});

export const statValue = style({
  fontSize: "14px",
  fontWeight: 800,
  color: vars.color.ink,
  fontFamily: vars.font.display,
});