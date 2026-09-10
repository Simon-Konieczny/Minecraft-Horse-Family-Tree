import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const heading = style({
  margin: 10,
  fontSize: 24,
});

export const container = style({
  margin: 10,
  font: "inherit",
});

export const backButton = style({
  margin: 8,
  paddingLeft: 16,
  paddingRight: 16,
  borderRadius: "8px",
  border: `2px solid ${vars.color.gold}`,
  color: vars.color.ink,
  cursor: "pointer",
  ":hover": {
    backgroundColor: vars.color.parchmentDeep
  }
});

export const bloodlineSection = style({
  marginTop: "12px",
});

export const bloodlineHeading = style({
  fontSize: "16px",
  fontWeight: 600,
  fontFamily: vars.font.display,
  color: vars.color.inkSoft,
  marginBottom: "16px",
  letterSpacing: "-0.01em",
});

export const tierBadge = style({
  display: "inline-block",
  fontSize: "13px",
  fontWeight: 700,
  fontFamily: vars.font.display,
  letterSpacing: "0.04em",
  color: "#ffffff",
  padding: "6px 18px",
  borderRadius: "999px",
  border: "2px solid rgba(255, 255, 255, 0.65)",
  boxShadow: "0 2px 6px rgba(43, 33, 24, 0.35)",
  marginBottom: "16px",
});

export const bloodlineList = style({
  display: "flex",
  flexDirection: "column",
  gap: "16px",
});

export const bloodlineRow = style({
  display: "flex",
  flexDirection: "column",
  gap: "6px",
});

export const bloodlineInfo = style({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
});

export const bloodlineName = style({
  fontSize: "14px",
  fontWeight: 600,
  color: vars.color.ink,
});

export const bloodlinePercent = style({
  fontSize: "13px",
  fontWeight: 500,
  color: vars.color.inkSoft,
  fontVariantNumeric: "tabular-nums", // Keeps numbers from jumping around
});

export const progressTrack = style({
  width: "100%",
  height: "8px", 
  backgroundColor: vars.color.parchmentDeep, // Lighter, cleaner track
  borderRadius: "10px",
  overflow: "hidden",
});

export const progressBar = style({
  height: "100%",
  borderRadius: "10px",
  transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)", 
});