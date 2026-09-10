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
            return Number((value * 42.157).toFixed(4));
        case "jump":
            return Number(((7.56889 * Math.E ** (0.602676 * value)) - 8.59434).toFixed(4));
        case "health":
            return Number((value / 2).toFixed(4));
        default:
            return value;
    }
}


export function untranslateStat(field: string, value: number): number {
    switch (field) {
        case "speed":
            return Number((value / 42.157));
        case "jump":
            return Number((Math.log((value + 8.59434) / 7.56889) / 0.602676));
        case "health":
            return Number((value * 2));
        default:
            return value;
    }
}
