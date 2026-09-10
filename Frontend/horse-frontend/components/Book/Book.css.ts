import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const chapter = style({
  marginBottom: vars.spacing.xl,
});

export const numeral = style({
  fontFamily: vars.font.display,
  fontSize: vars.fontSize.md,
  fontWeight: vars.fontWeight.bold,
  letterSpacing: "0.28em",
  textTransform: "uppercase",
  color: vars.color.gold,
  marginBottom: vars.spacing.xs,
});

export const title = style({
  fontFamily: vars.font.display,
  fontSize: vars.fontSize.display,
  fontWeight: vars.fontWeight.bold,
  color: vars.color.ink,
  letterSpacing: "-0.01em",
  margin: 0,
});

export const subtitle = style({
  fontSize: vars.fontSize.md,
  color: vars.color.inkSoft,
  marginTop: vars.spacing.xs,
  fontStyle: "italic",
  fontFamily: vars.font.display,
});

export const rule = style({
  marginTop: vars.spacing.md,
  border: "none",
  borderTop: `2px solid ${vars.color.goldSoft}`,
  maxWidth: "100%",
});

export const folio = style({
  marginTop: vars.spacing.xl,
  paddingTop: vars.spacing.md,
  borderTop: `1px solid ${vars.color.goldSoft}`,
  textAlign: "center",
  fontFamily: vars.font.display,
  fontSize: vars.fontSize.xs,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: vars.color.inkSoft,
});

export const plate = style({
  position: "absolute",
  top: vars.spacing.md,
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 10,
  backgroundColor: vars.color.parchment,
  border: `1px solid ${vars.color.goldSoft}`,
  borderRadius: vars.borderRadius.md,
  boxShadow: vars.shadow.md,
  padding: `${vars.spacing.xs} ${vars.spacing.lg}`,
  textAlign: "center",
  pointerEvents: "none",
});

export const plateNumeral = style({
  fontFamily: vars.font.display,
  fontSize: vars.fontSize.xs,
  fontWeight: vars.fontWeight.bold,
  letterSpacing: "0.28em",
  color: vars.color.gold,
});

export const plateTitle = style({
  fontFamily: vars.font.display,
  fontSize: vars.fontSize.lg,
  fontWeight: vars.fontWeight.bold,
  color: vars.color.ink,
});
