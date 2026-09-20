import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const buttonRow = style({
  display: "flex",
  justifyContent: "flex-end",
  gap: vars.spacing.md,
  marginTop: vars.spacing.md,
  paddingTop: vars.spacing.md,
  borderTop: `1px solid ${vars.color.border}`,
});