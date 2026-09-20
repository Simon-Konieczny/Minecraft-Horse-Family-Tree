import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const container = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.spacing.md,
});

export const field = style({
  width: "100%",
});

export const fields = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.spacing.md,
});

export const nameField = style({
  width: "120px",
  padding: vars.spacing.sm,
  borderRadius: vars.borderRadius.sm,
  border: `1px solid ${vars.color.border}`,
  fontSize: vars.fontSize.sm,
  fontFamily: vars.font.main,
  ":focus": {
    outline: "none",
    borderColor: vars.color.primary,
  },
});

export const nameRow = style({
  display: "flex",
  width: "100%",
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  margin: `${vars.spacing.xs} 0`,
});

export const label = style({
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  fontSize: vars.fontSize.xs,
  fontWeight: vars.fontWeight.extrabold,
  color: vars.color.primary,
});
