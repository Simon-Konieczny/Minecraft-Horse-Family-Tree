import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const input = style({
  backgroundColor: vars.color.parchment,
  color: vars.color.ink,
  border: `1px solid ${vars.color.goldSoft}`,
  borderRadius: vars.borderRadius.sm,
  padding: "8px 12px",
  fontSize: vars.fontSize.sm,
  fontFamily: vars.font.main,
  ":focus": {
    outline: `2px solid ${vars.color.gold}`,
    outlineOffset: "1px",
  },
});

export const colorInput = style({
  width: "48px",
  height: "36px",
  padding: 0,
  border: `1px solid ${vars.color.goldSoft}`,
  borderRadius: vars.borderRadius.sm,
  backgroundColor: vars.color.parchment,
  cursor: "pointer",
});

const actionButton = style({
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontSize: "11px",
  fontWeight: 800,
  padding: "8px 16px",
  borderRadius: vars.borderRadius.sm,
  cursor: "pointer",
  transition: "all 0.15s ease",
  ":disabled": {
    opacity: 0.4,
    cursor: "not-allowed",
  },
});

export const addButton = style([
  actionButton,
  {
    color: vars.color.parchment,
    backgroundColor: vars.color.ink,
    border: `2px solid ${vars.color.ink}`,
    ":hover": {
      backgroundColor: vars.color.leather,
      borderColor: vars.color.leather,
    },
  },
]);

export const deleteButton = style([
  actionButton,
  {
    color: vars.color.wax,
    backgroundColor: "transparent",
    border: `1px solid ${vars.color.wax}`,
    ":hover": {
      backgroundColor: vars.color.wax,
      color: vars.color.parchment,
    },
  },
]);

export const formLabel = style({
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
