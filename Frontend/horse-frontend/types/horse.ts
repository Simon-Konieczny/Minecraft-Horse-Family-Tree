// main type representing a horse
export type HorseStatus = "Alive" | "Deceased" | "Retired";

/**
 * Coerces legacy/informal status values to HorseStatus.
 * Numeric convention: 0 = Deceased, anything else = Alive.
 * Unrecognized or missing values default to Alive (matches the
 * historical display behavior, which treated non-zero as alive).
 */
export function parseHorseStatus(value: unknown): HorseStatus {
  if (value === 0 || value === "0") return "Deceased";
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "deceased" || normalized === "dead") return "Deceased";
    if (normalized === "retired") return "Retired";
  }
  // Numbers (other than 0), missing values, and anything unrecognized
  // default to Alive.
  return "Alive";
}

export interface Horse {
  id: string;
  firstName: string;
  familyName: string;
  parentId1?: string;
  parentId2?: string;
  dna: BloodlineMap;
  status: HorseStatus;
  speed: number;
  jump: number;
  health: number;
  variant: number;
  generation: number;
  hexColor?: string;
}

export type BloodlineMap = {
  [key: string]: number;
};

export interface createHorseRequest {
  firstName: string;
  familyName: string;
  parentId1?: string;
  parentId2?: string;
  status: HorseStatus;
  speed: number;
  jump: number;
  health: number;
  variant: number;
  hexColor: string;
  generation: number;
  dna: horseDna;
}

export interface horseDna {
    [key: string]: number;
}

export interface editHorseRequest {
  firstName?: string;
  familyName?: string;
  parentId1?: string;
  parentId2?: string;
  status: HorseStatus;
  speed: number;
  jump: number;
  health: number;
  variant: number;
  hexColor: string;
  generation: number;
  dna: horseDna;
}

// type used in the home page nodes
export interface HorseNodeData {
  labels: string;
  horse: Horse;
}
