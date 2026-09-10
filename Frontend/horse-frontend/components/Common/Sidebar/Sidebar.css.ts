import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const sidebar = style({
  width: "280px",
  height: "100vh",
  backgroundColor: vars.color.leather,
  backgroundImage: `linear-gradient(180deg, ${vars.color.leather} 0%, ${vars.color.leatherDeep} 100%)`,
  color: vars.color.parchment,
  display: "flex",
  flexDirection: "column",
  padding: vars.spacing.lg,
  position: "fixed",
  left: 0,
  top: 0,
  zIndex: 1000,
  borderRight: `1px solid ${vars.color.goldSoft}`,
  boxShadow: vars.shadow.lg,
  transition: "transform 0.3s ease",
  "@media": {
    "screen and (max-width: 900px)": {
      transform: "translateX(-100%)",
      width: "280px",
    },
    print: {
      display: "none",
    },
  },
});

export const sidebarOpen = style({
  "@media": {
    "screen and (max-width: 900px)": {
      transform: "translateX(0)",
    },
  },
});

export const menuToggle = style({
  display: "none",
  position: "fixed",
  top: vars.spacing.md,
  left: vars.spacing.md,
  zIndex: 1100,
  backgroundColor: vars.color.leather,
  color: vars.color.parchment,
  border: `1px solid ${vars.color.gold}`,
  borderRadius: vars.borderRadius.md,
  padding: "8px 16px",
  fontFamily: vars.font.display,
  fontSize: vars.fontSize.sm,
  fontWeight: vars.fontWeight.bold,
  letterSpacing: "0.08em",
  cursor: "pointer",
  boxShadow: vars.shadow.md,
  "@media": {
    "screen and (max-width: 900px)": {
      display: "block",
    },
    print: {
      display: "none",
    },
  },
});

export const logo = style({
  fontSize: vars.fontSize.xl,
  fontWeight: vars.fontWeight.extrabold,
  marginBottom: vars.spacing.xl,
  display: "flex",
  alignItems: "center",
  gap: vars.spacing.sm,
  color: vars.color.parchment,
  textDecoration: "none",
  letterSpacing: "-0.04em",
  fontFamily: vars.font.display,
});

export const logoEmoji = style({
  fontSize: vars.fontSize.xxl,
});

export const logoText = style({
  background: `linear-gradient(to right, ${vars.color.parchment}, ${vars.color.gold})`,
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
});

export const nav = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.spacing.xl,
  flex: 1,
});

export const navSection = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.spacing.xs,
});

export const sectionLabel = style({
  fontSize: vars.fontSize.xs,
  fontWeight: vars.fontWeight.bold,
  textTransform: "uppercase",
  letterSpacing: "0.18em",
  color: vars.color.goldSoft,
  opacity: 0.8,
  paddingLeft: vars.spacing.md,
  marginBottom: vars.spacing.xs,
  fontFamily: vars.font.display,
});

export const navLink = style({
  display: "flex",
  alignItems: "center",
  gap: vars.spacing.md,
  padding: `${vars.spacing.sm} ${vars.spacing.md}`,
  borderRadius: vars.borderRadius.md,
  color: vars.color.parchment,
  textDecoration: "none",
  fontSize: vars.fontSize.md,
  fontWeight: vars.fontWeight.semibold,
  fontFamily: vars.font.display,
  transition: "all 0.2s",
  opacity: 0.85,
  ":hover": {
    opacity: 1,
    backgroundColor: "rgba(244, 236, 217, 0.08)",
    transform: "translateX(4px)",
  },
});

export const navIcon = style({
  fontSize: vars.fontSize.lg,
});

export const navLinkActive = style([
  navLink,
  {
    opacity: 1,
    backgroundColor: "rgba(244, 236, 217, 0.1)",
    borderLeft: `4px solid ${vars.color.gold}`,
    color: vars.color.white,
  },
]);

export const navNumeral = style({
  fontFamily: vars.font.display,
  fontWeight: vars.fontWeight.bold,
  color: vars.color.gold,
  minWidth: "28px",
  fontSize: vars.fontSize.sm,
  letterSpacing: "0.05em",
});

export const recentList = style({
  display: "flex",
  flexDirection: "column",
  gap: "2px",
});

export const recentItem = style({
  display: "flex",
  alignItems: "center",
  gap: vars.spacing.sm,
  padding: `${vars.spacing.xs} ${vars.spacing.md}`,
  borderRadius: vars.borderRadius.sm,
  color: vars.color.parchment,
  opacity: 0.7,
  textDecoration: "none",
  fontSize: vars.fontSize.sm,
  transition: "all 0.15s",
  ":hover": {
    opacity: 1,
    color: vars.color.white,
    backgroundColor: "rgba(244, 236, 217, 0.06)",
  },
});

export const recentImageContainer = style({
  width: "24px",
  height: "24px",
  borderRadius: vars.borderRadius.sm,
  backgroundColor: "rgba(244, 236, 217, 0.1)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
});

export const recentName = style({
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const footer = style({
  marginTop: "auto",
  paddingTop: vars.spacing.lg,
  borderTop: `1px solid ${vars.color.goldSoft}`,
});

export const createButton = style({
  width: "100%",
  backgroundColor: vars.color.gold,
  color: vars.color.leatherDeep,
  border: "none",
  padding: `${vars.spacing.md} ${vars.spacing.lg}`,
  borderRadius: vars.borderRadius.md,
  fontSize: "12px",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  cursor: "pointer",
  transition: "all 0.2s",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: vars.spacing.sm,
  ":hover": {
    backgroundColor: vars.color.goldSoft,
    transform: "translateY(-1px)",
    boxShadow: vars.shadow.md,
  },
});

export const contentArea = style({
  marginLeft: "280px",
  width: "calc(100% - 280px)",
  minHeight: "100vh",
  backgroundColor: vars.color.parchment,
  borderLeft: `1px solid ${vars.color.goldSoft}`,
  boxShadow: "inset 16px 0 24px -16px rgba(43, 33, 24, 0.45)",
  "@media": {
    "screen and (max-width: 900px)": {
      marginLeft: 0,
      width: "100%",
      borderLeft: "none",
      boxShadow: "none",
    },
    print: {
      marginLeft: 0,
      width: "100%",
      borderLeft: "none",
      boxShadow: "none",
    },
  },
});
