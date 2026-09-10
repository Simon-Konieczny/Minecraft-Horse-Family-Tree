import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const pageWrapper = style({
  padding: "40px 20px",
  margin: "0 auto",
  maxWidth: "960px",
  backgroundColor: "transparent",
  minHeight: "100vh",
  fontFamily: vars.font.main,
});

export const buttonRow = style({
  display: "flex",
  flexDirection: "row",
  justifyContent: "space-between",
})

export const deleteButton = style({
  marginLeft: "15px"
})
