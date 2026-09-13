import { describe, expect, it } from "vitest";
import {
  breedingPairKey,
  breedingRunProgress,
  clearBreedingTicks,
  createBreedingRun,
  migrateBreedingRuns,
  removeBreedingPair,
  renameBreedingRun,
  sanitizeBreedingRun,
  setBreedingPairDone,
  suggestBreedingRunLabel,
  toggleBreedingPair,
} from "./breedingRuns";

describe("breedingPairKey", () => {
  it("is order-insensitive", () => {
    expect(breedingPairKey("a", "b")).toBe(breedingPairKey("b", "a"));
  });
});

describe("createBreedingRun", () => {
  it("dedupes, sorts ids, and skips self-pairs", () => {
    const run = createBreedingRun(
      [
        { sireId: "b", damId: "a" },
        { sireId: "a", damId: "b" },
        { sireId: "a", damId: "a" },
        { sireId: "", damId: "c" },
      ],
      null,
      "Gen 3",
      new Date("2026-01-01T00:00:00.000Z"),
    );
    expect(run.pairs).toEqual([{ sireId: "a", damId: "b" }]);
    expect(run.label).toBe("Gen 3");
    expect(run.done).toEqual({});
  });

  it("falls back to a dated label", () => {
    const run = createBreedingRun([], null, "  ", new Date("2026-02-03T00:00:00.000Z"));
    expect(run.label).toContain("2026-02-03");
  });
});

describe("suggestBreedingRunLabel", () => {
  it("suggests the next generation", () => {
    expect(suggestBreedingRunLabel([1, 4, 2], new Date("2026-01-01T00:00:00.000Z"))).toBe(
      "Gen 5 · 2026-01-01",
    );
  });

  it("falls back without generations", () => {
    expect(suggestBreedingRunLabel([], new Date("2026-01-01T00:00:00.000Z"))).toContain(
      "2026-01-01",
    );
  });
});

describe("ticks and progress", () => {
  it("toggles, sets, clears, and removes pairs", () => {
    const run = createBreedingRun(
      [
        { sireId: "a", damId: "b" },
        { sireId: "c", damId: "d" },
      ],
      null,
      "run",
    );
    const key = breedingPairKey("a", "b");
    expect(breedingRunProgress(run)).toEqual({ done: 0, total: 2 });

    const toggled = toggleBreedingPair(run, key);
    expect(breedingRunProgress(toggled)).toEqual({ done: 1, total: 2 });

    const untoggled = toggleBreedingPair(toggled, key);
    expect(breedingRunProgress(untoggled)).toEqual({ done: 0, total: 2 });

    const set = setBreedingPairDone(run, key, true);
    expect(set.done[key]).toBe(true);
    const cleared = clearBreedingTicks(set);
    expect(cleared.done).toEqual({});

    const removed = removeBreedingPair(set, key);
    expect(removed.pairs).toHaveLength(1);
    expect(removed.done[key]).toBeUndefined();
  });

  it("renames, ignoring blank labels", () => {
    const run = createBreedingRun([{ sireId: "a", damId: "b" }], null, "old");
    expect(renameBreedingRun(run, "  new  ").label).toBe("new");
    expect(renameBreedingRun(run, "   ").label).toBe("old");
  });
});

describe("sanitize/migrate", () => {
  it("drops unknown horses and keeps valid ticks", () => {
    const run = sanitizeBreedingRun(
      {
        id: "r1",
        label: "run",
        createdAt: "2026-01-01T00:00:00.000Z",
        pairs: [
          { sireId: "a", damId: "b" },
          { sireId: "a", damId: "gone" },
        ],
        benchedId: "gone",
        done: { [breedingPairKey("a", "b")]: true, junk: true },
      },
      new Set(["a", "b"]),
    );
    expect(run?.pairs).toHaveLength(1);
    expect(run?.benchedId).toBeNull();
    expect(run?.done).toEqual({ [breedingPairKey("a", "b")]: true });
  });

  it("returns null when nothing survives", () => {
    expect(sanitizeBreedingRun({ id: "r", pairs: [] })).toBeNull();
    expect(sanitizeBreedingRun(null)).toBeNull();
    expect(sanitizeBreedingRun({})).toBeNull();
  });

  it("migrates corrupt payloads without throwing", () => {
    expect(migrateBreedingRuns("junk")).toEqual([]);
    expect(migrateBreedingRuns(null)).toEqual([]);
    expect(
      migrateBreedingRuns([
        { id: "r1", pairs: [{ sireId: "a", damId: "b" }] },
        { id: "r1", pairs: [{ sireId: "a", damId: "b" }] },
        null,
      ]),
    ).toHaveLength(1);
  });
});
