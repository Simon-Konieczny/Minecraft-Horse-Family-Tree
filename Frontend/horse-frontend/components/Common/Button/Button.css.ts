import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const Button = style({
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  fontSize: "11px",
  fontWeight: 800,
  color: vars.color.ink,
  border: `2px solid ${vars.color.ink}`,
  background: "transparent",
  padding: "10px 24px",
  marginTop: "10px",
  cursor: "pointer",
  borderRadius: vars.borderRadius.sm,
  transition: "all 0.2s ease",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  ":hover": {
    background: vars.color.ink,
    color: vars.color.parchment,
  },
  ":active": {
    transform: "translateY(1px)",
  }
});

export const danger = style({
  color: vars.color.danger,
  borderColor: vars.color.danger,
  ":hover": {
    background: vars.color.danger,
    borderColor: vars.color.danger,
    color: "white",
  },
});
