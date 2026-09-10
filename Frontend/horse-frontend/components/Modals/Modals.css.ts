import { style, globalStyle } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const overlay = style({
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    backdropFilter: "blur(4px)",
    "@media": {
      print: {
        display: "none",
      },
    },
})

export const modal = style({
    backgroundColor: vars.color.parchment,
    color: vars.color.ink,
    padding: vars.spacing.xl,
    borderRadius: vars.borderRadius.lg,
    border: `1px solid ${vars.color.gold}`,
    width: "440px",
    maxWidth: "95%",
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: vars.shadow.lg,
    display: "flex",
    flexDirection: "column",
    gap: vars.spacing.lg,
})

globalStyle(`${modal} h2`, {
    margin: 0,
    fontSize: vars.fontSize.xl,
    fontWeight: vars.fontWeight.bold,
    fontFamily: vars.font.display,
    color: vars.color.ink,
    letterSpacing: "0",
    borderBottom: `2px solid ${vars.color.goldSoft}`,
    paddingBottom: vars.spacing.sm,
    marginBottom: vars.spacing.sm,
});