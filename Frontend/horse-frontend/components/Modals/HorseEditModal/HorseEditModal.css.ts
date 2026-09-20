import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const modal = style({
  backgroundColor: vars.color.white,
  color: vars.color.textMain,
  padding: vars.spacing.xl,
  borderRadius: vars.borderRadius.lg,
  width: "440px",
  maxWidth: "95%",
  boxShadow: vars.shadow.lg,
  display: "flex",
  flexDirection: "column",
  gap: vars.spacing.lg,
  maxHeight: "90vh",
  overflowY: "auto",
});

export const statRow = style({
  display: "flex",
  width: "100%",
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  gap: vars.spacing.md,
});

export const buttonRow = style({
  display: "flex",
  justifyContent: "flex-end",
  gap: vars.spacing.md,
  marginTop: vars.spacing.md,
  paddingTop: vars.spacing.md,
  borderTop: `1px solid ${vars.color.border}`,
});
