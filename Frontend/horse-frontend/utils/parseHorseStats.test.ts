import { describe, expect, it } from "vitest";
import { parseHorseStats } from "./parseHorseStats";

const NEW_FORMAT =
  `/summon minecraft:horse -1562.06 94.00 1196.24 {Age: 0, Health: 18.0f, Tame: 1b, Variant: 774, ` +
  `CustomName: "Booty Longbottom", ` +
  `attributes: [{id: "minecraft:jump_strength", base: 0.763396966457367d}, ` +
  `{id: "minecraft:movement_speed", base: 0.29660907238721845d}, ` +
  `{id: "minecraft:max_health", base: 18.0d}]}`;

const OLD_FORMAT =
  `/summon minecraft:horse ~ ~ ~ {Age: 0, Health: 24.0f, Tame: 1b, Variant: 258, ` +
  `CustomName: "Old Timer", ` +
  `attributes: [{id: "minecraft:generic.jump_strength", base: 0.9d}, ` +
  `{id: "minecraft:generic.movement_speed", base: 0.28d}, ` +
  `{id: "minecraft:generic.max_health", base: 24.0d}]}`;

describe("parseHorseStats", () => {
  it("parses the current summon format (minecraft:* IDs + CustomName)", () => {
    expect(parseHorseStats(NEW_FORMAT)).toEqual({
      speed: 0.29660907238721845,
      health: 18,
      jump: 0.763396966457367,
      variant: 774,
      firstName: "Booty",
      familyName: "Longbottom",
    });
  });

  it("still parses the legacy format (minecraft:generic.* IDs)", () => {
    expect(parseHorseStats(OLD_FORMAT)).toEqual({
      speed: 0.28,
      health: 24,
      jump: 0.9,
      variant: 258,
      firstName: "Old",
      familyName: "Timer",
    });
  });

  it("prefers max_health over current Health (hurt horses keep genetics)", () => {
    const parsed = parseHorseStats(
      `{Health: 20.0f, attributes: [{id: "minecraft:max_health", base: 30.0d}, ` +
        `{id: "minecraft:movement_speed", base: 0.25d}, ` +
        `{id: "minecraft:jump_strength", base: 0.7d}], Variant: 1}`,
    );
    expect(parsed).toMatchObject({ health: 30, variant: 1 });
  });

  it("falls back to Health when max_health is absent", () => {
    const parsed = parseHorseStats(
      `{Health: 20.0f, Variant: 1, attributes: [` +
        `{id: "minecraft:movement_speed", base: 0.25d}, ` +
        `{id: "minecraft:jump_strength", base: 0.7d}]}`,
    );
    expect(parsed).toMatchObject({ health: 20 });
  });

  it("parses base-before-id attribute order", () => {
    const parsed = parseHorseStats(
      `{Health: 20.0f, Variant: 1, attributes: [` +
        `{base: 0.25d, id: "minecraft:movement_speed"}, ` +
        `{base: 0.7d, id: "minecraft:jump_strength"}]}`,
    );
    expect(parsed).toMatchObject({ speed: 0.25, jump: 0.7 });
  });

  it("rejects malformed numbers as missing", () => {
    expect(
      parseHorseStats(
        `{Health: ...f, Variant: 1, attributes: [` +
          `{id: "minecraft:movement_speed", base: 0.25d}, ` +
          `{id: "minecraft:jump_strength", base: 0.7d}]}`,
      ),
    ).toBeNull();
  });

  it("parses stats without a CustomName", () => {
    const parsed = parseHorseStats(
      `{Health: 20.0f, Variant: 1, attributes: [` +
        `{id: "minecraft:movement_speed", base: 0.25d}, ` +
        `{id: "minecraft:jump_strength", base: 0.7d}]}`,
    );
    expect(parsed).toMatchObject({ speed: 0.25, health: 20 });
    expect(parsed?.firstName).toBeUndefined();
    expect(parsed?.familyName).toBeUndefined();
  });

  it("treats a single-word CustomName as first name only", () => {
    const parsed = parseHorseStats(
      `{Health: 20.0f, Variant: 1, CustomName: "Solo", attributes: [` +
        `{id: "minecraft:movement_speed", base: 0.25d}, ` +
        `{id: "minecraft:jump_strength", base: 0.7d}]}`,
    );
    expect(parsed?.firstName).toBe("Solo");
    expect(parsed?.familyName).toBeUndefined();
  });

  it("unwraps JSON text-component CustomNames", () => {
    const parsed = parseHorseStats(
      `{Health: 20.0f, Variant: 1, CustomName: "{\\"text\\": \\"Json Horse\\"}", attributes: [` +
        `{id: "minecraft:movement_speed", base: 0.25d}, ` +
        `{id: "minecraft:jump_strength", base: 0.7d}]}`,
    );
    expect(parsed?.firstName).toBe("Json");
    expect(parsed?.familyName).toBe("Horse");
  });

  it("returns null for garbage or incomplete commands", () => {
    expect(parseHorseStats("hello world")).toBeNull();
    expect(parseHorseStats("")).toBeNull();
    // Missing jump_strength.
    expect(
      parseHorseStats(
        `{Health: 20.0f, Variant: 1, attributes: [` +
          `{id: "minecraft:movement_speed", base: 0.25d}]}`,
      ),
    ).toBeNull();
  });
});
