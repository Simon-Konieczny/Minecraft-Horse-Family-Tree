import { describe, expect, it } from "vitest";
import {
  ACTIVE_HEALTH_COUNT,
  ACTIVE_JUMP_COUNT,
  ACTIVE_SPEED_COUNT,
  getActiveHerd,
  getSuggestedHousing,
  groupPasturesByBloodline,
  penForSpeedRank,
} from "./activeHerd";

const mk = (id: string, speed: number, jump = 1, health = 20, extra = {}) => ({
  id,
  status: "Alive" as const,
  speed,
  jump,
  health,
  dna: { A: 1.0 },
  ...extra,
});

describe("getActiveHerd", () => {
  it("keeps top-63 speed as active", () => {
    const herd = Array.from({ length: 70 }, (_, i) => mk(`h${i}`, 70 - i));
    const { active, pastured, counts } = getActiveHerd(herd);
    expect(active).toHaveLength(ACTIVE_SPEED_COUNT);
    expect(pastured).toHaveLength(70 - ACTIVE_SPEED_COUNT);
    expect(counts.active).toBe(ACTIVE_SPEED_COUNT);
    expect(active[0].id).toBe("h0");
  });

  it("saves jump/health keepers outside the speed cut", () => {
    const herd = Array.from({ length: 70 }, (_, i) => mk(`h${i}`, 70 - i, 1, 20));
    // h69 is slowest but god-tier jumper + tank.
    herd[69] = mk("h69", 1, 99, 99);
    const { activeIds, reasons } = getActiveHerd(herd);
    expect(activeIds.has("h69")).toBe(true);
    expect(reasons.get("h69")).toMatchObject({ speed: false, jump: true, health: true });
  });

  it("caps jump/health cuts at 16 each", () => {
    const herd = Array.from({ length: 30 }, (_, i) =>
      mk(`h${i}`, 100, 30 - i, 30 - i),
    );
    const { reasons } = getActiveHerd(herd);
    const jumpKeepers = [...reasons.values()].filter((r) => r.jump).length;
    const healthKeepers = [...reasons.values()].filter((r) => r.health).length;
    expect(jumpKeepers).toBeLessThanOrEqual(ACTIVE_JUMP_COUNT);
    expect(healthKeepers).toBeLessThanOrEqual(ACTIVE_HEALTH_COUNT);
  });

  it("pastures retired horses and excludes deceased", () => {
    const herd = [
      mk("fast", 100),
      { ...mk("ret", 100), status: "Retired" as const },
      { ...mk("dead", 100), status: "Deceased" as const },
    ];
    const { activeIds, pastured } = getActiveHerd(herd);
    expect(activeIds.has("fast")).toBe(true);
    expect(activeIds.has("ret")).toBe(false);
    expect(activeIds.has("dead")).toBe(false);
    expect(pastured.map((h) => h.id)).toContain("ret");
    expect(pastured.map((h) => h.id)).not.toContain("dead");
  });

  it("reports cuts at the last included rank", () => {
    const herd = [mk("a", 10), mk("b", 20)];
    const { cuts } = getActiveHerd(herd);
    expect(cuts.speed).toBe(10);
  });

  it("is empty-safe", () => {
    expect(getActiveHerd([])).toMatchObject({
      active: [],
      pastured: [],
      cuts: { speed: null, jump: null, health: null },
    });
  });
});

describe("getSuggestedHousing", () => {
  it("assigns pens by speed tier of 7", () => {
    expect(penForSpeedRank(0)).toBe(1);
    expect(penForSpeedRank(6)).toBe(1);
    expect(penForSpeedRank(7)).toBe(2);
    expect(penForSpeedRank(62)).toBe(9);
    expect(penForSpeedRank(63)).toBe(10);
  });

  it("suggests pasture grouped by dominant bloodline when inactive", () => {
    const herd = Array.from({ length: 70 }, (_, i) => mk(`h${i}`, 70 - i));
    const full = getActiveHerd(herd);
    const slow = herd[69];
    const s = getSuggestedHousing(slow, full);
    expect(s.zone).toBe("pasture");
    expect(s.pastureGroup).toBe("A");
    expect(s.pen).toBeNull();
  });

  it("flags overflow for slow jump keepers past pen 9", () => {
    const herd = Array.from({ length: 70 }, (_, i) => mk(`h${i}`, 70 - i, 1, 20));
    herd[69] = mk("h69", 0.01, 99, 99);
    const full = getActiveHerd(herd);
    const s = getSuggestedHousing(herd[69], full);
    expect(s.zone).toBe("active");
    expect(s.overflow).toBe(true);
  });
});

describe("groupPasturesByBloodline", () => {
  it("groups by dominant bloodline, largest first", () => {
    const groups = groupPasturesByBloodline([
      mk("a", 1, 1, 1, { dna: { X: 1.0 } }),
      mk("b", 1, 1, 1, { dna: { X: 1.0 } }),
      mk("c", 1, 1, 1, { dna: { Y: 1.0 } }),
    ]);
    expect(groups[0]).toMatchObject({ group: "X" });
    expect(groups[0].horses).toHaveLength(2);
  });
});
