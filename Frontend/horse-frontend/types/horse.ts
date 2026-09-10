// main type representing a horse
export interface Horse {
  id: string;
  firstName: string;
  familyName: string;
  parentId1?: string;
  parentId2?: string;
  dna: BloodlineMap;
  status: number;
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
  status: number;
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
  status: number;
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
