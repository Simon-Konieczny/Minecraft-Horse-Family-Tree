export interface BloodlineShare {
  bloodline: string;
  /** Summed DNA weight across the herd. */
  total: number;
}

export interface GenerationShare {
  generation: number;
  /** Average DNA weight per bloodline within the generation. */
  shares: Record<string, number>;
}

export interface PurityRank<T> {
  horse: T;
  bloodline: string;
  share: number;
}

export interface VariantCount {
  variant: number;
  count: number;
}

export interface CrosstabCell {
  variant: number;
  bloodline: string;
  count: number;
}

export interface DiversityIndex {
  /** Shannon entropy (nats) of the bloodline distribution. */
  shannon: number;
  /** Effective number of bloodlines (exp of Shannon). */
  effective: number;
  /** Largest single-bloodline share 0-1 (bottleneck signal). */
  topShare: number;
  /** Distinct bloodlines with nonzero weight. */
  richness: number;
  /**
   * Miller-Madow bias-corrected Shannon: H + (K-1)/(2N). Prefer this
   * (and its exp) at small herd sizes; the plug-in H is downward
   * biased when rare bloodlines are undersampled.
   */
  shannonMM: number;
  /** exp(shannonMM). */
  effectiveMM: number;
}

export interface VariantBloodlineShare {
  variant: number;
  bloodline: string;
  /** Fractional share (DNA-weight split); sums to the horse count. */
  share: number;
  /** Whole horses touching this cell (for tooltips). */
  horses: number;
}

/** Summed DNA weight per bloodline across the herd, descending. */
export function bloodlineShares(
  horses: { dna?: Record<string, unknown> }[],
): BloodlineShare[] {
  const totals = new Map<string, number>();
  for (const h of horses) {
    for (const [bloodline, weight] of Object.entries(h.dna || {})) {
      if (typeof weight !== "number" || !Number.isFinite(weight) || weight <= 0) continue;
      totals.set(bloodline, (totals.get(bloodline) || 0) + weight);
    }
  }
  return [...totals.entries()]
    .map(([bloodline, total]) => ({ bloodline, total }))
    .sort((a, b) => b.total - a.total);
}

/** Horses ranked by dominant-bloodline share, descending. */
export function purityRanking<T extends { dna?: Record<string, unknown> }>(
  horses: T[],
): PurityRank<T>[] {
  return horses
    .map((horse) => {
      let bloodline = "";
      let share = 0;
      for (const [name, weight] of Object.entries(horse.dna || {})) {
        if (typeof weight !== "number" || !Number.isFinite(weight)) continue;
        if (weight > share) {
          share = weight;
          bloodline = name;
        }
      }
      return { horse, bloodline, share };
    })
    .filter((r) => r.share > 0)
    .sort((a, b) => b.share - a.share);
}

/**
 * Average DNA weight per bloodline within each generation (ascending).
 * Averages (not sums) keep generations comparable across herd sizes.
 */
export function sharesByGeneration(
  horses: { generation?: number; dna?: Record<string, unknown> }[],
): GenerationShare[] {
  const groups = new Map<number, { sums: Map<string, number>; count: number }>();
  for (const h of horses) {
    const gen = h.generation || 0;
    let group = groups.get(gen);
    if (!group) {
      group = { sums: new Map(), count: 0 };
      groups.set(gen, group);
    }
    group.count++;
    for (const [bloodline, weight] of Object.entries(h.dna || {})) {
      if (typeof weight !== "number" || !Number.isFinite(weight) || weight <= 0) continue;
      group.sums.set(bloodline, (group.sums.get(bloodline) || 0) + weight);
    }
  }
  return [...groups.entries()]
    .map(([generation, group]) => {
      const shares: Record<string, number> = {};
      for (const [bloodline, total] of group.sums) {
        shares[bloodline] = total / group.count;
      }
      return { generation, shares };
    })
    .sort((a, b) => a.generation - b.generation);
}

/** Dominant bloodline name ("" when none). */
export function dominantBloodline(dna: Record<string, unknown> | undefined): string {
  let best = "";
  let bestWeight = 0;
  for (const [name, weight] of Object.entries(dna || {})) {
    if (typeof weight !== "number" || !Number.isFinite(weight)) continue;
    if (weight > bestWeight) {
      bestWeight = weight;
      best = name;
    }
  }
  return best;
}

/** Horse counts per variant value, ascending by variant. */
export function variantDistribution(
  horses: { variant?: unknown }[],
): VariantCount[] {
  const counts = new Map<number, number>();
  for (const h of horses) {
    if (typeof h.variant !== "number" || !Number.isFinite(h.variant)) continue;
    counts.set(h.variant, (counts.get(h.variant) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([variant, count]) => ({ variant, count }))
    .sort((a, b) => a.variant - b.variant);
}

/**
 * Counts per (variant, dominant bloodline) pair — the variant ×
 * bloodline cross-tab. Only pairs that occur are returned.
 */
export function variantBloodlineCrosstab(
  horses: { variant?: unknown; dna?: Record<string, unknown> }[],
): CrosstabCell[] {
  const counts = new Map<string, number>();
  for (const h of horses) {
    if (typeof h.variant !== "number" || !Number.isFinite(h.variant)) continue;
    const bloodline = dominantBloodline(h.dna) || "Unknown";
    const key = `${h.variant}|||${bloodline}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => {
      const [variant, bloodline] = key.split("|||");
      return { variant: Number(variant), bloodline, count };
    })
    .sort((a, b) => a.variant - b.variant || a.bloodline.localeCompare(b.bloodline));
}

/**
 * Bloodline diversity from summed DNA shares (see bloodlineShares):
 * effective = 1 means a single-bloodline herd.
 *
 * `sampleSize` (head count, for the Miller-Madow correction) defaults
 * to the summed weight, which equals head count for normalized DNA.
 */
export function bloodlineDiversity(
  shares: { total: number }[],
  sampleSize?: number,
): DiversityIndex {
  const sum = shares.reduce((t, s) => t + s.total, 0);
  if (!(sum > 0)) return { shannon: 0, effective: 0, topShare: 0, richness: 0, shannonMM: 0, effectiveMM: 0 };
  let shannon = 0;
  let topShare = 0;
  let richness = 0;
  for (const s of shares) {
    const p = s.total / sum;
    if (p > 0) {
      shannon -= p * Math.log(p);
      richness++;
    }
    if (p > topShare) topShare = p;
  }
  const n = sampleSize && sampleSize > 0 ? sampleSize : sum;
  const shannonMM = shannon + (richness - 1) / (2 * n);
  return { shannon, effective: Math.exp(shannon), topShare, richness, shannonMM, effectiveMM: Math.exp(shannonMM) };
}

/**
 * Fractional variant × bloodline cross-tab: each horse's DNA weights
 * split its single count across its bloodlines (a 50/50 hybrid adds
 * 0.5 + 0.5), so column totals stay exact and hybrids are never
 * misattributed to one dominant column. Junk DNA weights skipped.
 *
 * Display rounds shares to 0.1 (see callers): rounding error per cell
 * is at most ±0.05, so column totals hold within ±0.05 × cells.
 */
export function variantBloodlineShares(
  horses: { variant?: unknown; dna?: Record<string, unknown> }[],
): VariantBloodlineShare[] {
  const shares = new Map<string, { share: number; horses: Set<number> }>();
  horses.forEach((h, idx) => {
    if (typeof h.variant !== "number" || !Number.isFinite(h.variant)) return;
    const entries = Object.entries(h.dna || {}).filter(
      (entry): entry is [string, number] =>
        typeof entry[1] === "number" && Number.isFinite(entry[1]) && entry[1] > 0,
    );
    const total = entries.reduce((t, [, w]) => t + w, 0);
    const parts: [string, number][] =
      total > 0 ? entries.map(([b, w]) => [b, w / total]) : [["Unknown", 1]];
    for (const [bloodline, frac] of parts) {
      const key = `${h.variant}|||${bloodline}`;
      let cell = shares.get(key);
      if (!cell) {
        cell = { share: 0, horses: new Set() };
        shares.set(key, cell);
      }
      cell.share += frac;
      cell.horses.add(idx);
    }
  });
  return [...shares.entries()]
    .map(([key, cell]) => {
      const [variant, bloodline] = key.split("|||");
      return {
        variant: Number(variant),
        bloodline,
        share: Math.round(cell.share * 10) / 10,
        horses: cell.horses.size,
      };
    })
    .sort((a, b) => a.variant - b.variant || a.bloodline.localeCompare(b.bloodline));
}
