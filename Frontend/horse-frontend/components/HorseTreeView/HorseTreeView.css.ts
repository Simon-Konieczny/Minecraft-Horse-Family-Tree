import { style, globalStyle } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const container = style({
  width: "100%",
  height: "100%",
  backgroundColor: vars.color.parchmentDeep,
  position: "relative",
  border: `10px solid ${vars.color.leather}`,
  boxSizing: "border-box",
});

export const loadingFallback = style({
  height: "100%",
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: vars.color.parchmentDeep,
  color: vars.color.inkSoft,
  fontFamily: vars.font.display,
  fontWeight: 500,
});

globalStyle(".react-flow__background path", {
  stroke: "rgba(43, 33, 24, 0.14) !important",
});

globalStyle(".react-flow__controls button", {
  backgroundColor: vars.color.parchment,
  borderBottom: `1px solid ${vars.color.goldSoft}`,
});

globalStyle(".react-flow__controls button:hover", {
  backgroundColor: vars.color.goldSoft,
});

globalStyle(".react-flow__controls button svg", {
  fill: vars.color.ink,
});

globalStyle(".react-flow__controls", {
  "@media": {
    print: {
      display: "none",
    },
  },
});

globalStyle(".react-flow__minimap", {
  "@media": {
    print: {
      display: "none",
    },
  },
});

export const addHorseButton = style({
  zIndex: 1000,
  position: "absolute",
  left: "10px"
})

export const legend = style({
  position: "absolute",
  left: "16px",
  bottom: "16px",
  zIndex: 100,
  backgroundColor: vars.color.parchment,
  border: `1px solid ${vars.color.goldSoft}`,
  borderRadius: vars.borderRadius.md,
  boxShadow: vars.shadow.md,
  padding: `${vars.spacing.sm} ${vars.spacing.md}`,
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  pointerEvents: "none",
  fontFamily: vars.font.display,
  "@media": {
    print: {
      display: "none",
    },
  },
});

export const legendTitle = style({
  fontSize: vars.fontSize.xs,
  fontWeight: vars.fontWeight.bold,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: vars.color.gold,
});

export const legendRow = style({
  display: "flex",
  alignItems: "center",
  gap: vars.spacing.sm,
  fontSize: vars.fontSize.xs,
  color: vars.color.inkSoft,
});

export const legendSwatch = style({
  width: "14px",
  height: "14px",
  borderRadius: "4px",
  backgroundColor: vars.color.gold,
  border: `1px solid ${vars.color.inkSoft}`,
  flexShrink: 0,
});

export const legendShade = style({
  width: "14px",
  height: "14px",
  borderRadius: "4px",
  backgroundColor: "#2b2b2b",
  border: `1px solid ${vars.color.inkSoft}`,
  flexShrink: 0,
});

export const legendLine = style({
  width: "22px",
  height: 0,
  borderTop: `2px solid ${vars.color.inkSoft}`,
  flexShrink: 0,
});
