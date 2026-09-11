import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const menuWrapper = style({
  position: "absolute",
  top: "16px",
  right: "16px",
  zIndex: 100,
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  backgroundColor: vars.color.parchment,
  padding: vars.spacing.md,
  borderRadius: vars.borderRadius.lg,
  boxShadow: vars.shadow.lg,
  border: `1px solid ${vars.color.goldSoft}`,
  transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease",
  width: "264px",
  "@media": {
    print: {
      display: "none",
    },
  },
});

export const menuClosed = style({
  transform: "translateX(calc(100% + 20px))",
  opacity: 0,
  pointerEvents: "none",
});

export const toggleButton = style({
  position: "absolute",
  top: "16px",
  right: "16px",
  zIndex: 90,
  backgroundColor: vars.color.parchment,
  border: `1px solid ${vars.color.goldSoft}`,
  borderRadius: vars.borderRadius.md,
  padding: "8px 16px",
  cursor: "pointer",
  boxShadow: vars.shadow.md,
  fontSize: "12px",
  fontWeight: 700,
  fontFamily: vars.font.display,
  color: vars.color.ink,
  transition: "all 0.2s",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  ":hover": {
    backgroundColor: vars.color.goldSoft,
    transform: "translateY(-1px)",
  },
  "@media": {
    print: {
      display: "none",
    },
  },
});

export const closeButton = style({
  alignSelf: "flex-end",
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: "18px",
  color: vars.color.textMuted,
  padding: "4px",
  lineHeight: 1,
  ":hover": {
    color: vars.color.textMain,
  },
});

export const menuHeader = style({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: vars.spacing.sm,
  borderBottom: `1px solid ${vars.color.goldSoft}`,
  paddingBottom: vars.spacing.sm,
});

export const menuLabel = style({
  fontSize: "10px",
  fontWeight: 800,
  color: vars.color.gold,
  textTransform: "uppercase",
  letterSpacing: "0.18em",
  marginBottom: vars.spacing.xs,
  fontFamily: vars.font.display,
});

const buttonBase = style({
  width: "100%",
  padding: "10px",
  borderRadius: vars.borderRadius.md,
  fontSize: "12px",
  fontWeight: 700,
  transition: "all 0.15s ease",
  cursor: "pointer",
  border: `1px solid ${vars.color.goldSoft}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  backgroundColor: vars.color.parchment,
  color: vars.color.ink,
  ":hover": {
    backgroundColor: vars.color.parchmentDeep,
    borderColor: vars.color.gold,
  }
});

export const resetButton = style([
  buttonBase,
  {
    marginTop: vars.spacing.md,
    backgroundColor: vars.color.ink,
    color: vars.color.parchment,
    borderColor: vars.color.ink,
    ":hover": { backgroundColor: "#000000" },
  },
]);

// ---- Menu sections (shared rhythm) ----

export const section = style({
  marginTop: vars.spacing.md,
});

export const sectionBody = style({
  display: "flex",
  flexDirection: "column",
  gap: "8px",
});

export const sectionCaption = style({
  fontSize: vars.fontSize.xs,
  color: vars.color.inkSoft,
  margin: 0,
  lineHeight: 1.4,
});

// ---- Segmented layout-mode control (2x2 radio group) ----

export const segmentGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "6px",
});

const segmentBase = style({
  width: "100%",
  boxSizing: "border-box",
  margin: 0,
  padding: "7px 4px",
  borderRadius: vars.borderRadius.md,
  fontSize: "11px",
  fontWeight: 700,
  fontFamily: vars.font.display,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  transition: "all 0.15s ease",
  cursor: "pointer",
  border: `1px solid ${vars.color.goldSoft}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
  backgroundColor: vars.color.parchment,
  color: vars.color.ink,
  ":hover": {
    backgroundColor: vars.color.parchmentDeep,
    borderColor: vars.color.gold,
  }
});

export const segmentActive = style([
  segmentBase,
  {
    backgroundColor: vars.color.leather,
    color: vars.color.parchment,
    borderColor: vars.color.leather,
  },
]);

export const segmentInactive = style([
  segmentBase,
]);

// ---- Filter controls ----

export const searchInput = style({
  width: "100%",
  boxSizing: "border-box",
  padding: "6px 8px",
  fontSize: vars.fontSize.sm,
  fontFamily: vars.font.main,
  color: vars.color.ink,
  backgroundColor: vars.color.parchment,
  border: `1px solid ${vars.color.goldSoft}`,
  borderRadius: vars.borderRadius.sm,
  ":focus": {
    outline: "none",
    borderColor: vars.color.gold,
  },
  selectors: {
    "&::placeholder": {
      color: vars.color.textMuted,
    },
  },
});

export const numberInput = style({
  width: 64,
  boxSizing: "border-box",
  padding: "6px 8px",
  fontSize: vars.fontSize.sm,
  fontFamily: vars.font.main,
  color: vars.color.ink,
  backgroundColor: vars.color.parchment,
  border: `1px solid ${vars.color.goldSoft}`,
  borderRadius: vars.borderRadius.sm,
  ":focus": {
    outline: "none",
    borderColor: vars.color.gold,
  },
});

export const checkRow = style({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  fontSize: vars.fontSize.sm,
  color: vars.color.ink,
  padding: "2px 0",
});

export const checkBox = style({
  accentColor: vars.color.leather,
});

export const checkDot = style({
  display: "inline-block",
  width: "12px",
  height: "12px",
  borderRadius: "3px",
  flexShrink: 0,
});

export const countRow = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
});

export const countPill = style({
  fontSize: vars.fontSize.xs,
  color: vars.color.inkSoft,
});

export const resetTextButton = style({
  background: "none",
  border: "none",
  padding: "2px 4px",
  cursor: "pointer",
  fontSize: vars.fontSize.xs,
  fontWeight: 700,
  fontFamily: vars.font.display,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: vars.color.gold,
  textDecoration: "underline",
  ":hover": {
    color: vars.color.leather,
  },
});

export const densitySlider = style({
  width: "100%",
  accentColor: vars.color.leather,
});

export const sliderLabels = style({
  display: "flex",
  justifyContent: "space-between",
  fontSize: 11,
  opacity: 0.7,
  color: vars.color.inkSoft,
});

export const scrollList = style({
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  maxHeight: 148,
  overflowY: "auto",
});
