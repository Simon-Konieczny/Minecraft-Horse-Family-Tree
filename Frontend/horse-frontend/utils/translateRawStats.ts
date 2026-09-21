import { getVariantName } from "./variant";

export interface RawStats {
    speed: number;
    jump: number;
    health: number;
    variant: number;
}

export interface ProcessedStats {
    speed: number;
    jump: number;
    health: number;
    variant: string;
}

export function translateStatsForDisplay(stats: RawStats): ProcessedStats {
    return {
        speed: translateStat("speed", stats.speed),
        jump: translateStat("jump", stats.jump),
        health: translateStat("health", stats.health),
        variant: getVariantName(stats.variant),
    };
}

/** Text-field values for the stat inputs in raw or display units. */
export function formatStatsForView(args: {
    speed: number;
    health: number;
    jump: number;
    rawView: boolean;
}): { speed: string; health: string; jump: string } {
    const { speed, health, jump, rawView } = args;
    return {
        speed: (rawView ? speed : translateStat("speed", speed)).toString(),
        health: (rawView ? health : translateStat("health", health)).toString(),
        jump: (rawView ? jump : translateStat("jump", jump)).toString(),
    };
}

export function translateStat(field: string, value: number): number {
    switch (field) {
        case "speed":
            return Number((value * 43.17).toFixed(4));
        case "jump":
            // Quadratic through the documented anchors (raw -> blocks):
            // 0.4 -> 1.153, 0.7 -> 3.124, 1.0 -> 5.9197. Cross-validated
            // against in-game observations (raw 0.7634 -> 3.64,
            // raw 0.7740 -> 3.74, both within 0.01 of prediction).
            return Number(((4.581667 * value ** 2 + 1.530167 * value - 0.192133)).toFixed(4));
        case "health":
            return Number((value / 2).toFixed(4));
        default:
            return value;
    }
}


export function untranslateStat(field: string, value: number): number {
    switch (field) {
        case "speed":
            return Number((value / 43.17));
        case "jump": {
            // Positive root of 4.581667*j^2 + 1.530167*j - 0.192133 = value.
            // The parabola's vertex sits at j ~= -0.17, so the curve is
            // strictly increasing over the whole 0.4-1.0 attribute range
            // and the positive root is always the right one.
            const disc = 1.530167 ** 2 - 4 * 4.581667 * (-0.192133 - value);
            if (!(disc >= 0)) {
                throw new Error(`Jump display value ${value} is below the curve minimum.`);
            }
            return Number(((-1.530167 + Math.sqrt(disc)) / (2 * 4.581667)));
        }
        case "health":
            return Number((value * 2));
        default:
            return value;
    }
}

export type StatField = "speed" | "jump" | "health";

/** Legal raw attribute ranges (vanilla). Mirrors BREEDING_RANGES. */
export const RAW_STAT_RANGES: Record<StatField, { min: number; max: number }> = {
    speed: { min: 0.1125, max: 0.3375 },
    jump: { min: 0.4, max: 1.0 },
    health: { min: 15, max: 30 },
};

const STAT_LABELS: Record<StatField, string> = {
    speed: "Speed",
    jump: "Jump",
    health: "Health",
};

/**
 * Validates one stat text-field value. Returns an error message, or null
 * when the text is a finite number inside the legal range for the
 * current view (raw attribute vs translated display units).
 */
export function statInputError(
    field: StatField,
    text: string,
    rawView: boolean,
): string | null {
    const label = STAT_LABELS[field];
    const value = parseFloat(text);
    if (text.trim() === "" || !Number.isFinite(value)) {
        return `${label} must be a number.`;
    }
    const raw = RAW_STAT_RANGES[field];
    const min = rawView ? raw.min : translateStat(field, raw.min);
    const max = rawView ? raw.max : translateStat(field, raw.max);
    if (value < min || value > max) {
        return `${label} must be between ${min} and ${max}${rawView ? " (raw)" : ""}.`;
    }
    return null;
}
