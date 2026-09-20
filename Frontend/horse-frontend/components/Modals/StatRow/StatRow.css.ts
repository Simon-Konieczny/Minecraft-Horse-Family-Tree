import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const statRow = style({
  display: "flex",
  width: "100%",
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  margin: `${vars.spacing.sm} 0`,
});

export const statInput = style({
  width: "120px",
  padding: vars.spacing.sm,
  borderRadius: vars.borderRadius.sm,
  border: `1px solid ${vars.color.border}`,
  fontSize: vars.fontSize.sm,
  fontFamily: vars.font.mono,
  ":focus": {
    outline: "none",
    borderColor: vars.color.primary,
  },
});

export const label = style({
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  fontSize: vars.fontSize.xs,
  fontWeight: vars.fontWeight.extrabold,
  color: vars.color.primary,
});
