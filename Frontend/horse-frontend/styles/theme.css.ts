import { createGlobalTheme } from "@vanilla-extract/css";

export const vars = createGlobalTheme(":root", {
  color: {
    primary: "#2d4a3e",       // Forest Green
    primaryHover: "#1e3229",
    secondary: "#fdfbf7",     // Off-white/Cream
    danger: "#800505",
    dangerBg: "#fee2e2",
    textMain: "#1f2937",
    textMuted: "#6b7280",
    border: "#e5e7eb",
    background: "#fdfbf7",
    backgroundDark: "#1a2c25", // Dark Forest Green
    white: "#ffffff",
    accent: "#d4a373",        // Sandy/Wood accent
    // --- Book theme (Phase 1): parchment & ink ---
    parchment: "#f4ecd9",     // Page surface
    parchmentDeep: "#e9dcc0", // Aged edges / Alt surface
    ink: "#2b2118",           // Body text on parchment
    inkSoft: "#5c4f3d",       // Muted text on parchment
    gold: "#b98a2f",          // Foil / active chapter
    goldSoft: "#e8d5a3",      // Ruled lines, subtle gilding
    leather: "#3a2c1c",       // Binding / ToC surface
    leatherDeep: "#241a10",
    wax: "#8f2d22",           // Seals, destructive accents
  },
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
  },
  shadow: {
    sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
  },
  borderRadius: {
    sm: "4px",
    md: "8px",
    lg: "12px",
    full: "9999px",
  },
  font: {
    main: "var(--font-geist-sans), sans-serif",
    mono: "var(--font-geist-mono), monospace",
    display: "var(--font-display), Georgia, 'Times New Roman', serif",
  },
  fontSize: {
    xs: "11px",
    sm: "13px",
    md: "15px",
    lg: "18px",
    xl: "24px",
    xxl: "32px",
    display: "48px",
  },
  fontWeight: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
    extrabold: "800",
    black: "900",
  }
});
