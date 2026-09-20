import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const nodeContainer = style({
  padding: `${vars.spacing.sm} ${vars.spacing.md}`,
  boxShadow: vars.shadow.md,
  borderRadius: vars.borderRadius.md,
  backgroundColor: vars.color.white,
  border: `1px solid ${vars.color.border}`,
  minWidth: "180px",
  transition: "all 0.2s ease-in-out",
  ":hover": {
    transform: "translateY(-4px)",
    boxShadow: vars.shadow.lg,
  },
});

export const contentWrapper = style({
  display: "flex",
  alignItems: "center",
  gap: vars.spacing.md,
});

export const imageContainer = style({
  width: "48px",
  height: "48px",
  borderRadius: vars.borderRadius.sm,
  backgroundColor: vars.color.secondary,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  flexShrink: 0,
});

export const horseImage = style({
  objectFit: "contain",
});

export const textDetails = style({
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  // Flex children default to min-width: auto and refuse to shrink below
  // their nowrap content — without this the name spills past the node
  // border and the inner ellipsis never engages.
  minWidth: 0,
  flex: 1,
  overflow: "hidden",
});

export const horseName = style({
  fontSize: vars.fontSize.md,
  fontWeight: vars.fontWeight.extrabold,
  color: vars.color.textMain,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const familyName = style({
  fontSize: vars.fontSize.xs,
  fontWeight: vars.fontWeight.bold,
  color: vars.color.textMuted,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const statText = style({
  display: "flex",
  alignItems: "center",
  gap: "4px",
  fontSize: vars.fontSize.xs,
});

export const statLabel = style({
  fontSize: "10px",
  color: vars.color.textMuted,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
});

export const statValue = style({
  fontSize: "11px",
  color: vars.color.primary,
  fontWeight: 800,
});

// Target the React Flow handles specifically
export const handleStyle = style({
  width: "8px !important",
  height: "8px !important",
  backgroundColor: `${vars.color.primary} !important`,
  border: `2px solid ${vars.color.white} !important`,
});