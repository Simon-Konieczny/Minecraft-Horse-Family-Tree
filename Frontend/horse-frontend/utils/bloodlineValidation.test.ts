import { describe, expect, it } from "vitest";
import {
  bloodlineSlug,
  isValidHex,
  normalizeHexInput,
  validateBloodlineInput,
} from "./bloodlineValidation";

describe("bloodlineSlug", () => {
  it("trims and lowercases", () => {
    expect(bloodlineSlug("  Emberhoof  ")).toBe("emberhoof");
    expect(bloodlineSlug("Star Strider")).toBe("star strider");
  });
});

describe("isValidHex", () => {
  it.each([["#ff0000"], ["#FF0000"], ["#00ff00"]])("accepts %s", (hex) => {
    expect(isValidHex(hex)).toBe(true);
  });

  it.each([["ff0000"], ["#fff"], ["#gggggg"], [""], ["red"]])(
    "rejects %s",
    (hex) => {
      expect(isValidHex(hex)).toBe(false);
    },
  );
});

describe("normalizeHexInput", () => {
  it("accepts exact values like #7A4E2F and #F5F5F2", () => {
    expect(normalizeHexInput("#7A4E2F")).toBe("#7A4E2F");
    expect(normalizeHexInput("#F5F5F2")).toBe("#F5F5F2");
  });

  it("trims whitespace and uppercases lowercase input", () => {
    expect(normalizeHexInput("  #7a4e2f  ")).toBe("#7A4E2F");
  });

  it("rejects incomplete, invalid, and shorthand drafts", () => {
    expect(normalizeHexInput("#7A4")).toBeNull();
    expect(normalizeHexInput("#7A4E2")).toBeNull();
    expect(normalizeHexInput("#GGGGGG")).toBeNull();
    expect(normalizeHexInput("7A4E2F")).toBeNull();
    expect(normalizeHexInput("")).toBeNull();
  });
});

describe("validateBloodlineInput", () => {
  it("trims the name and passes valid input through", () => {
    expect(
      validateBloodlineInput({ name: "  Stormmane ", hexColor: "#123456" }),
    ).toEqual({ name: "Stormmane", hexColor: "#123456" });
  });

  it("rejects empty names", () => {
    expect(() => validateBloodlineInput({ name: "   ", hexColor: "#123456" })).toThrow(
      /name is required/,
    );
  });

  it("rejects dots and dollar signs (Mongo path safety)", () => {
    expect(() =>
      validateBloodlineInput({ name: "Ember.hoof", hexColor: "#123456" }),
    ).toThrow(/cannot contain/);
    expect(() =>
      validateBloodlineInput({ name: "$mith", hexColor: "#123456" }),
    ).toThrow(/cannot contain/);
  });

  it("rejects malformed colors", () => {
    expect(() =>
      validateBloodlineInput({ name: "Stormmane", hexColor: "red" }),
    ).toThrow(/not a valid/);
  });
});
