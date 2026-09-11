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
            return Number(((-1.530167 + Math.sqrt(Math.max(0, disc))) / (2 * 4.581667)));
        }
        case "health":
            return Number((value * 2));
        default:
            return value;
    }
}
