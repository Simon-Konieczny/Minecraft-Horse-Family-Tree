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

export const grid = style({
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: "4px",
  backgroundColor: vars.color.secondary,
  padding: "8px",
  borderRadius: vars.borderRadius.md,
  border: `1px solid ${vars.color.border}`,
  maxHeight: "200px",
  overflowY: "auto",
});

export const option = style({
  aspectRatio: "1/1",
  padding: "4px",
  border: "1px solid transparent",
  borderRadius: vars.borderRadius.sm,
  backgroundColor: "transparent",
  cursor: "pointer",
  transition: "all 0.1s",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  ":hover": {
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    borderColor: vars.color.border,
  },
});

export const optionActive = style([
  option,
  {
    backgroundColor: vars.color.white,
    borderColor: vars.color.primary,
    boxShadow: vars.shadow.sm,
  },
]);

export const imageContainer = style({
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
});

export const selectedName = style({
  fontSize: "12px",
  fontWeight: 600,
  color: vars.color.primary,
  textAlign: "center",
  fontStyle: "italic",
});
