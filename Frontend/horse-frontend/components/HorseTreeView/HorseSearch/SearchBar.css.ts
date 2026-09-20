import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const wrapper = style({
  position: "absolute",
  top: "16px",
  left: "16px",
  zIndex: 120,
  width: "300px",
  maxWidth: "calc(100vw - 340px)",
  "@media": {
    "screen and (max-width: 640px)": {
      width: "200px",
    },
    print: {
      display: "none",
    },
  },
});

export const input = style({
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 12px",
  fontSize: vars.fontSize.sm,
  fontFamily: vars.font.main,
  color: vars.color.ink,
  backgroundColor: vars.color.parchment,
  border: `1px solid ${vars.color.goldSoft}`,
  borderRadius: vars.borderRadius.md,
  boxShadow: vars.shadow.md,
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

export const dropdown = style({
  marginTop: "6px",
  backgroundColor: vars.color.parchment,
  border: `1px solid ${vars.color.goldSoft}`,
  borderRadius: vars.borderRadius.md,
  boxShadow: vars.shadow.lg,
  overflow: "hidden",
  maxHeight: "320px",
  overflowY: "auto",
});

export const option = style({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 12px",
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: vars.fontSize.sm,
  fontFamily: vars.font.main,
  color: vars.color.ink,
  textAlign: "left",
  ":hover": {
    backgroundColor: vars.color.parchmentDeep,
  },
});

export const optionActive = style({
  backgroundColor: vars.color.goldSoft,
});

export const dot = style({
  display: "inline-block",
  width: "12px",
  height: "12px",
  borderRadius: "3px",
  flexShrink: 0,
  border: `1px solid ${vars.color.inkSoft}`,
});

export const optionMeta = style({
  marginLeft: "auto",
  fontSize: vars.fontSize.xs,
  color: vars.color.inkSoft,
  whiteSpace: "nowrap",
});

export const hint = style({
  padding: "6px 12px",
  fontSize: vars.fontSize.xs,
  color: vars.color.inkSoft,
  fontFamily: vars.font.main,
});

export const empty = style({
  padding: "8px 12px",
  fontSize: vars.fontSize.sm,
  color: vars.color.inkSoft,
  fontFamily: vars.font.main,
});
