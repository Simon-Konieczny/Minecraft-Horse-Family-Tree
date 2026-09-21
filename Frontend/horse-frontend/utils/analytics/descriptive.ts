export interface StatSummary {
  avg: number;
  min: number;
  max: number;
  count: number;
}

export interface HistogramBin {
  start: number;
  end: number;
  label: string;
  count: number;
}

export interface GenerationAverage {
  generation: number;
  avg: number;
  count: number;
}

export interface NiceBin {
  start: number;
  end: number;
  count: number;
  label: string;
}

/** Avg/min/max of a numeric field (empty input -> zeros). */
export function statSummary(
  horses: Record<string, unknown>[],
  field: string,
): StatSummary {
  const values = horses
    .map((h) => h[field])
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (values.length === 0) return { avg: 0, min: 0, max: 0, count: 0 };
  const sum = values.reduce((t, v) => t + v, 0);
  return {
    avg: sum / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
    count: values.length,
  };
}

/** Fixed-width histogram bins over [min, max]; values outside clamp inward. */
export function histogramBins(  values: number[],
  binCount: number,
  min: number,
  max: number,
): HistogramBin[] {
  const safeBins = Math.max(1, Math.floor(binCount));
  const span = max - min;
  const width = span > 0 ? span / safeBins : 1;
  const bins: HistogramBin[] = Array.from({ length: safeBins }, (_, i) => {
    const start = min + i * width;
    return { start, end: start + width, label: start.toFixed(2), count: 0 };
  });
  for (const v of values) {
    if (!Number.isFinite(v)) continue;
    const idx = Math.min(
      safeBins - 1,
      Math.max(0, Math.floor((v - min) / width)),
    );
    bins[idx].count++;
  }
  return bins;
}

/** Average of a numeric field per generation, ascending. */
export function avgByGeneration<T extends { generation?: number }>(
  horses: T[],
  field: keyof T & string,
): GenerationAverage[] {
  const groups = new Map<number, { sum: number; count: number }>();
  for (const h of horses) {
    const v: unknown = h[field];
    if (typeof v !== "number" || !Number.isFinite(v)) continue;
    const gen = typeof h.generation === "number" ? h.generation : 0;
    const group = groups.get(gen) || { sum: 0, count: 0 };
    group.sum += v;
    group.count++;
    groups.set(gen, group);
  }
  return [...groups.entries()]
    .map(([generation, group]) => ({
      generation,
      avg: group.sum / group.count,
      count: group.count,
    }))
    .sort((a, b) => a.generation - b.generation);
}

const NICE_STEPS = [1, 2, 2.5, 5, 10];

/**
 * Auto-binned histogram over finite values with "nice" rounded widths
 * (1/2/2.5/5 × 10^n in data units, snapped to the requested decimal
 * places). Domain extends outward to nice bounds so bars never start
 * mid-tick. Targets ~14 bins ("more detail" policy) capped at 16;
 * degenerate (single-value / empty) input yields one bin. Labels are
 * true ranges ("12.40–12.59"), not bare starts.
 */
export function niceHistogram(
  values: number[],
  decimals = 2,
  targetBins = 14,
  maxBins = 16,
): NiceBin[] {
  const finite = values.filter((v) => Number.isFinite(v));
  const fmt = (v: number) => v.toFixed(decimals);
  if (finite.length === 0) return [];
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  if (!(max > min)) {
    const half = Math.pow(10, -decimals) / 2 || 0.5;
    return [
      {
        start: min - half,
        end: max + half,
        count: finite.length,
        label: `${fmt(min - half)}–${fmt(max + half)}`,
      },
    ];
  }
  const span = max - min;
  const raw = span / Math.max(1, targetBins);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const stepNorm = NICE_STEPS.find((s) => s >= norm) ?? 10;
  // Snap the step itself to whole decimal units so widths stay "nice"
  // at the requested precision (e.g. 0.05 not 0.0499).
  const quantum = Math.pow(10, -decimals);
  let width = Math.max(quantum, Math.round((stepNorm * mag) / quantum) * quantum);
  // Guard against float dust producing hundreds of micro-bins.
  while (span / width > maxBins) width = Math.round((width * 2) / quantum) * quantum;
  const lo = Math.floor(min / width) * width;
  const count = Math.max(1, Math.ceil((max - lo) / width));
  const bins: NiceBin[] = Array.from({ length: count }, (_, i) => {
    const start = lo + i * width;
    const end = start + width;
    return { start, end, count: 0, label: `${fmt(start)}–${fmt(end)}` };
  });
  for (const v of finite) {
    const idx = Math.min(count - 1, Math.max(0, Math.floor((v - lo) / width)));
    bins[idx].count++;
  }
  return bins;
}
