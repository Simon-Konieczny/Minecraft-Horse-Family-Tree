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

export const cover = style({
  textAlign: "center",
  padding: `${vars.spacing.xl} ${vars.spacing.lg}`,
  marginBottom: vars.spacing.xl,
});

export const coverEyebrow = style({
  fontFamily: vars.font.display,
  fontSize: vars.fontSize.sm,
  fontWeight: vars.fontWeight.bold,
  letterSpacing: "0.32em",
  textTransform: "uppercase",
  color: vars.color.gold,
  marginBottom: vars.spacing.sm,
});

export const coverTitle = style({
  fontFamily: vars.font.display,
  fontSize: vars.fontSize.display,
  fontWeight: vars.fontWeight.bold,
  color: vars.color.ink,
  margin: 0,
});

export const coverRule = style({
  border: "none",
  borderTop: `2px solid ${vars.color.goldSoft}`,
  width: "120px",
  margin: `${vars.spacing.md} auto`,
});

export const coverIntro = style({
  fontFamily: vars.font.display,
  fontStyle: "italic",
  fontSize: vars.fontSize.md,
  color: vars.color.inkSoft,
  maxWidth: "560px",
  margin: "0 auto",
});

export const chapterCards = style({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: vars.spacing.md,
  marginTop: vars.spacing.xl,
  textAlign: "left",
});

export const chapterCard = style({
  display: "block",
  backgroundColor: vars.color.secondary,
  border: `1px solid ${vars.color.goldSoft}`,
  borderTop: `4px solid ${vars.color.gold}`,
  borderRadius: vars.borderRadius.md,
  padding: vars.spacing.md,
  textDecoration: "none",
  boxShadow: vars.shadow.sm,
  transition: "transform 0.15s ease, boxShadow 0.15s ease",
  ":hover": {
    transform: "translateY(-2px)",
    boxShadow: vars.shadow.md,
  },
});

export const chapterCardNumeral = style({
  fontFamily: vars.font.display,
  fontSize: vars.fontSize.xs,
  fontWeight: vars.fontWeight.bold,
  letterSpacing: "0.22em",
  color: vars.color.gold,
});

export const chapterCardTitle = style({
  fontFamily: vars.font.display,
  fontSize: vars.fontSize.md,
  fontWeight: vars.fontWeight.bold,
  color: vars.color.ink,
  margin: `${vars.spacing.xs} 0`,
});

export const chapterCardText = style({
  fontSize: vars.fontSize.sm,
  color: vars.color.inkSoft,
  margin: 0,
});

export const firstSteps = style({
  display: "flex",
  justifyContent: "center",
  gap: vars.spacing.lg,
  flexWrap: "wrap",
  marginTop: vars.spacing.lg,
  fontSize: vars.fontSize.sm,
  color: vars.color.inkSoft,
});

export const firstStep = style({
  display: "flex",
  alignItems: "center",
  gap: vars.spacing.sm,
});

export const firstStepNumber = style({
  fontFamily: vars.font.display,
  fontWeight: vars.fontWeight.bold,
  color: vars.color.parchment,
  backgroundColor: vars.color.leather,
  borderRadius: vars.borderRadius.full,
  width: "24px",
  height: "24px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: vars.fontSize.xs,
  flexShrink: 0,
});
