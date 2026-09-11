import { describe, expect, it } from "vitest";
import { validateParents } from "./lineage";

const herd = [
  { id: "a", firstName: "Ash", familyName: "Emberhoof" },
  { id: "b", firstName: "Cinder", familyName: "Emberhoof", parentId1: "a" },
];

describe("validateParents", () => {
  it("accepts two parents or none", () => {
    expect(() => validateParents(herd, null, "", "")).not.toThrow();
    expect(() => validateParents(herd, null, undefined, undefined)).not.toThrow();
    expect(() => validateParents(herd, null, "a", "x")).not.toThrow();
  });

  it("rejects exactly one recorded parent (legacy single-parent path removed)", () => {
    expect(() => validateParents(herd, null, "a", "")).toThrow(/two parents/);
    expect(() => validateParents(herd, null, "", "a")).toThrow(/two parents/);
    expect(() => validateParents(herd, "c", "a", null)).toThrow(/two parents/);
  });

  it("still blocks self-parenting and descendant loops", () => {
    expect(() => validateParents(herd, "a", "a", "x")).toThrow(/own parent/);
    expect(() => validateParents(herd, "a", "b", "x")).toThrow(/descendant/);
  });
});
