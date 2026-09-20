import { style, globalStyle } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const shapeCard = style({
  position: "relative",
  width: "100%",
  aspectRatio: "1 / 1",
  paddingTop: "100%",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  transition: "transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
  ":hover": {
    transform: "scale(1.08) rotate(2deg)",
  },
  ":before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "var(--shape-color)",
    WebkitMaskSize: "contain",
    maskSize: "contain",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskPosition: "center",
    imageRendering: "pixelated",
  },
});

export const shapeTextContainer = style({
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  color: vars.color.white,
  zIndex: 10,
  textAlign: "center",
  textShadow: "0px 1px 4px rgba(0,0,0,0.4)",
  padding: "15%",
});

export const shapeLabel = style({
  fontSize: vars.fontSize.xs,
  fontWeight: vars.fontWeight.bold,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  opacity: 0.9,
  fontFamily: vars.font.display,
});

export const shapeValue = style({
  fontSize: vars.fontSize.xxl,
  fontWeight: vars.fontWeight.bold,
  fontFamily: vars.font.display,
  margin: "0",
  zIndex: 20,
  display: "flex",
  alignItems: "baseline",
  gap: "4px",
});

export const shapeUnit = style({
  fontSize: vars.fontSize.xs,
  fontWeight: vars.fontWeight.medium,
  opacity: 0.8,
});

export const shapeSubtext = style({
  fontSize: vars.fontSize.xs,
  fontWeight: vars.fontWeight.bold,
  textTransform: "uppercase",
  opacity: 0.8,
  marginTop: "4px",
});

globalStyle(`${shapeCard}[data-shape="speed"]::before`, {
  WebkitMaskImage: 'url("/shapes/horse-running.svg")',
  maskImage: 'url("/shapes/horse-running.svg")',
});

globalStyle(`${shapeCard}[data-shape="jump"]::before`, {
  WebkitMaskImage: 'url("/shapes/horse-jumping.svg")',
  maskImage: 'url("/shapes/horse-jumping.svg")',
});

globalStyle(`${shapeCard}[data-shape="health"]::before`, {
  WebkitMaskImage: 'url("/shapes/heart.svg")',
  maskImage: 'url("/shapes/heart.svg")',
});

globalStyle(`${shapeCard}[data-shape="generation"]::before`, {
  WebkitMaskImage: 'url("/shapes/scroll.svg")',
  maskImage: 'url("/shapes/scroll.svg")',
});