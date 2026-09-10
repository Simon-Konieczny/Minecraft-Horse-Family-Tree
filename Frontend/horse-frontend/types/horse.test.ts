import { describe, expect, it } from "vitest";
import { parseHorseStatus } from "./horse";

describe("parseHorseStatus", () => {
  it.each([
    { value: 1, expected: "Alive" },
    { value: 2, expected: "Alive" },
    { value: "Alive", expected: "Alive" },
    { value: "alive", expected: "Alive" },
    { value: 0, expected: "Deceased" },
    { value: "0", expected: "Deceased" },
    { value: "Dead", expected: "Deceased" },
    { value: "deceased", expected: "Deceased" },
    { value: "Retired", expected: "Retired" },
    { value: "retired", expected: "Retired" },
    { value: undefined, expected: "Alive" },
    { value: null, expected: "Alive" },
    { value: "", expected: "Alive" },
    { value: "banana", expected: "Alive" },
  ])("maps $value to $expected", ({ value, expected }) => {
    expect(parseHorseStatus(value)).toBe(expected);
  });
});
