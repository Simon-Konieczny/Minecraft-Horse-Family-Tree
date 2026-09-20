import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const switchWrapper = style({
  display: "flex",
  alignItems: "center",
  gap: "10px",
  margin: "10px 0",
});

export const reverse = style({
  flexDirection: "row-reverse",
  justifyContent: "flex-end",
});

export const label = style({
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  fontSize: "11px",
  fontWeight: 800,
  fontFamily: vars.font.display,
  color: vars.color.ink,
});

export const labelLight = style({
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  fontSize: "11px",
  fontWeight: 800,
  fontFamily: vars.font.display,
  color: vars.color.parchment,
});

export const switchContainer = style({
  position: "relative",
  display: "inline-block",
  width: "40px",
  height: "20px",
});

// We style the input directly instead of targeting it from the container
export const input = style({
  opacity: 0,
  width: 0,
  height: 0,
  position: "absolute", // ensure it doesn't take up space
});

export const slider = style({
  position: "absolute",
  cursor: "pointer",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: vars.color.border,
  transition: ".4s",
  borderRadius: "20px",
  ":before": {
    position: "absolute",
    content: '""',
    height: "16px",
    width: "16px",
    left: "2px",
    bottom: "2px",
    backgroundColor: "white",
    transition: ".4s",
    borderRadius: "50%",
  },
  selectors: {
    // Look "up" to see if the sibling input is checked
    [`${input}:checked + &`]: {
      backgroundColor: vars.color.gold,
    },
    [`${input}:checked + &:before`]: {
      transform: "translateX(20px)",
    },
  },
});

export const sliderLight = style({
  position: "absolute",
  cursor: "pointer",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(244, 236, 217, 0.28)",
  transition: ".4s",
  borderRadius: "20px",
  ":before": {
    position: "absolute",
    content: '""',
    height: "16px",
    width: "16px",
    left: "2px",
    bottom: "2px",
    backgroundColor: vars.color.parchment,
    transition: ".4s",
    borderRadius: "50%",
  },
  selectors: {
    [`${input}:checked + &`]: {
      backgroundColor: vars.color.gold,
    },
    [`${input}:checked + &:before`]: {
      transform: "translateX(20px)",
    },
  },
});