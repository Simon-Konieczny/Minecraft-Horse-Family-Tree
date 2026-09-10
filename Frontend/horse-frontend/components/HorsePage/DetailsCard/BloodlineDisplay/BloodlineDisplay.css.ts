import { style } from "@vanilla-extract/css";

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
  border: "2px solid #3b82f6",
  cursor: "pointer",
  ":hover": {
    backgroundColor: "#eff6ff"
  }
});

export const bloodlineSection = style({
  marginTop: "12px",
});

export const bloodlineHeading = style({
  fontSize: "16px",
  fontWeight: 600,
  color: "#475569",
  marginBottom: "16px",
  letterSpacing: "-0.01em",
});

export const tierBadge = style({
  display: "inline-block",
  fontSize: "13px",
  fontWeight: 700,
  color: "#ffffff",
  padding: "4px 12px",
  borderRadius: "999px",
  marginBottom: "16px",
  letterSpacing: "0.01em",
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
  color: "#1e293b",
});

export const bloodlinePercent = style({
  fontSize: "13px",
  fontWeight: 500,
  color: "#64748b",
  fontVariantNumeric: "tabular-nums", // Keeps numbers from jumping around
});

export const progressTrack = style({
  width: "100%",
  height: "8px", 
  backgroundColor: "#f1f5f9", // Lighter, cleaner track
  borderRadius: "10px",
  overflow: "hidden",
});

export const progressBar = style({
  height: "100%",
  borderRadius: "10px",
  transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)", 
});