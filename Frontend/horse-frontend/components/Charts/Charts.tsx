/**
 * Barrel: chart primitives live in per-component modules next to this
 * file. Import from "@/components/Charts/Charts" as before — this
 * re-export keeps all existing importers working.
 */
export { ChartCard } from "./ChartCard";
export { Bars } from "./Bars";
export type { BarRow } from "./Bars";
export { Donut } from "./Donut";
export type { DonutSegment } from "./Donut";
export { PaletteGrid } from "./PaletteGrid";
export type { PaletteItem } from "./PaletteGrid";
export { Radar } from "./Radar";
export type { RadarAxis } from "./Radar";
export { ScatterPlot } from "./ScatterPlot";
export type { ScatterPoint } from "./ScatterPlot";
export { StackedArea } from "./StackedArea";
export type { AreaPoint } from "./StackedArea";
export { TrendLine } from "./TrendLine";
export type { TrendPoint } from "./TrendLine";
export { VerticalHistogram } from "./VerticalHistogram";
export type { HistogramBinInput } from "./VerticalHistogram";
