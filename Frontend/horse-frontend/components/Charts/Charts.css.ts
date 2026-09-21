import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const card = style({
  backgroundColor: vars.color.secondary,
  border: `1px solid ${vars.color.goldSoft}`,
  borderTop: `4px solid ${vars.color.gold}`,
  borderRadius: vars.borderRadius.lg,
  boxShadow: vars.shadow.md,
  padding: vars.spacing.lg,
  display: "flex",
  flexDirection: "column",
  gap: vars.spacing.md,
  "@media": {
    "screen and (max-width: 640px)": {
      padding: vars.spacing.md,
    },
  },
});

export const cardTitle = style({
  fontFamily: vars.font.display,
  fontSize: vars.fontSize.md,
  fontWeight: vars.fontWeight.bold,
  color: vars.color.ink,
  margin: 0,
});

export const donutWrap = style({
  display: "flex",
  alignItems: "center",
  gap: vars.spacing.lg,
  flexWrap: "wrap",
});

export const donutLabel = style({
  fontFamily: vars.font.display,
  fontWeight: vars.fontWeight.bold,
  fill: vars.color.ink,
});

export const legend = style({
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  fontSize: vars.fontSize.sm,
  color: vars.color.inkSoft,
});

export const legendRow = style({
  display: "flex",
  alignItems: "center",
  gap: vars.spacing.sm,
});

export const legendSwatch = style({
  width: "12px",
  height: "12px",
  borderRadius: "3px",
  border: `1px solid ${vars.color.inkSoft}`,
  flexShrink: 0,
});

export const barRow = style({
  display: "grid",
  gridTemplateColumns: "110px 1fr 48px",
  alignItems: "center",
  gap: vars.spacing.sm,
  fontSize: vars.fontSize.sm,
  color: vars.color.ink,
  "@media": {
    "screen and (max-width: 480px)": {
      gridTemplateColumns: "84px 1fr 40px",
    },
  },
});

export const barLabel = style({
  fontFamily: vars.font.display,
  fontWeight: vars.fontWeight.semibold,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const barTrack = style({
  height: "14px",
  backgroundColor: vars.color.parchmentDeep,
  borderRadius: vars.borderRadius.full,
  overflow: "hidden",
});

export const barValue = style({
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
  color: vars.color.inkSoft,
});

export const areaLabels = style({
  fontSize: "11px",
  fill: vars.color.inkSoft,
  fontFamily: vars.font.display,
});

export const paletteGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
  gap: vars.spacing.md,
});

export const paletteCard = style({
  border: `1px solid ${vars.color.goldSoft}`,
  borderRadius: vars.borderRadius.md,
  overflow: "hidden",
  backgroundColor: vars.color.parchment,
});

export const paletteSwatch = style({
  height: "56px",
});

export const paletteBody = style({
  padding: `${vars.spacing.sm} ${vars.spacing.md}`,
});

export const paletteName = style({
  fontFamily: vars.font.display,
  fontWeight: vars.fontWeight.bold,
  fontSize: vars.fontSize.sm,
  color: vars.color.ink,
});

export const paletteMeta = style({
  fontSize: vars.fontSize.xs,
  color: vars.color.inkSoft,
});

export const mutedNote = style({
  fontSize: vars.fontSize.sm,
  color: vars.color.inkSoft,
  fontStyle: "italic",
  fontFamily: vars.font.display,
});

export const chartGrid = style({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: vars.spacing.lg,
  marginBottom: vars.spacing.lg,
  "@media": {
    "screen and (max-width: 900px)": {
      gridTemplateColumns: "1fr",
    },
  },
});

export const ledgerTable = style({
  width: "100%",
  borderCollapse: "collapse",
  fontSize: vars.fontSize.sm,
  color: vars.color.ink,
});

export const ledgerTh = style({
  textAlign: "left",
  padding: `${vars.spacing.sm} ${vars.spacing.md}`,
  fontFamily: vars.font.display,
  fontSize: vars.fontSize.xs,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: vars.color.inkSoft,
  borderBottom: `2px solid ${vars.color.goldSoft}`,
});

export const ledgerTd = style({
  padding: `${vars.spacing.sm} ${vars.spacing.md}`,
  borderBottom: `1px solid ${vars.color.goldSoft}`,
  fontVariantNumeric: "tabular-nums",
});

export const ledgerLink = style({
  color: vars.color.ink,
  fontWeight: vars.fontWeight.semibold,
  textDecoration: "none",
  ":hover": {
    color: vars.color.gold,
    textDecoration: "underline",
  },
});

export const formSelect = style({
  backgroundColor: vars.color.parchment,
  color: vars.color.ink,
  border: `1px solid ${vars.color.goldSoft}`,
  borderRadius: vars.borderRadius.sm,
  padding: "8px 12px",
  fontSize: vars.fontSize.sm,
  fontFamily: vars.font.main,
});

/** Subordinate action button for filter rows (distinct from selects). */
export const resetButton = style({
  backgroundColor: "transparent",
  color: vars.color.inkSoft,
  border: `1px solid ${vars.color.goldSoft}`,
  borderRadius: vars.borderRadius.sm,
  padding: "8px 12px",
  fontSize: vars.fontSize.sm,
  fontFamily: vars.font.main,
  cursor: "pointer",
  selectors: {
    "&:disabled": {
      opacity: 0.5,
      cursor: "default",
    },
  },
  ":focus-visible": {
    outline: `2px solid ${vars.color.gold}`,
    outlineOffset: 1,
  },
});

/** Records page shell: centers content with responsive padding. */
export const recordsMain = style({
  padding: vars.spacing.lg,
  maxWidth: 960,
  "@media": {
    "screen and (max-width: 640px)": {
      padding: vars.spacing.md,
    },
  },
});

/** Sticky records mini-nav: anchor chips + expand/collapse controls. */
export const miniNav = style({
  position: "sticky",
  top: 0,
  zIndex: 10,
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: vars.spacing.sm,
  padding: `${vars.spacing.sm} 0`,
  backgroundColor: vars.color.parchment,
  borderBottom: `1px solid ${vars.color.goldSoft}`,
  marginBottom: vars.spacing.md,
});

export const miniNavChip = style({
  background: "none",
  border: `1px solid ${vars.color.goldSoft}`,
  borderRadius: vars.borderRadius.full,
  padding: "2px 10px",
  font: "inherit",
  fontSize: vars.fontSize.sm,
  color: vars.color.inkSoft,
  cursor: "pointer",
  whiteSpace: "nowrap",
  selectors: {
    "&[data-open='false']": {
      opacity: 0.55,
    },
  },
  ":hover": {
    color: vars.color.ink,
    borderColor: vars.color.gold,
  },
  ":focus-visible": {
    outline: `2px solid ${vars.color.gold}`,
    outlineOffset: 1,
  },
});

export const miniNavAction = style({
  background: "none",
  border: "none",
  padding: "2px 4px",
  font: "inherit",
  fontSize: vars.fontSize.sm,
  color: vars.color.inkSoft,
  cursor: "pointer",
  textDecoration: "underline",
  ":hover": {
    color: vars.color.ink,
  },
});

export const filterRow = style({
  display: "flex",
  gap: vars.spacing.md,
  flexWrap: "wrap",
  alignItems: "end",
  marginBottom: vars.spacing.md,
});

export const filterLabel = style({
  fontFamily: vars.font.display,
  fontSize: vars.fontSize.xs,
  fontWeight: vars.fontWeight.bold,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: vars.color.inkSoft,
  display: "flex",
  flexDirection: "column",
  gap: "4px",
});

/** Segmented two-option toggle (e.g. crosstab DNA-split vs dominant). */
export const segmented = style({
  display: "inline-flex",
  border: `1px solid ${vars.color.goldSoft}`,
  borderRadius: vars.borderRadius.full,
  overflow: "hidden",
});

export const segmentButton = style({
  background: "none",
  border: "none",
  padding: "4px 12px",
  font: "inherit",
  fontSize: vars.fontSize.sm,
  color: vars.color.inkSoft,
  cursor: "pointer",
  selectors: {
    "&[data-active='true']": {
      backgroundColor: vars.color.gold,
      color: vars.color.white,
      fontWeight: vars.fontWeight.bold,
    },
  },
  ":focus-visible": {
    outline: `2px solid ${vars.color.gold}`,
    outlineOffset: -2,
  },
});

/** Non-italic status message (empty states) — distinct from mutedNote help copy. */
export const statusNote = style({
  fontSize: vars.fontSize.sm,
  color: vars.color.inkSoft,
  fontFamily: vars.font.main,
});
