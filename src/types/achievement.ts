import type { ID, ISODateTime } from "./common";
import type { Stop } from "./stop";
import type { Trip } from "./trip";

export type AchievementCategory =
  | "viaje"
  | "kilometros"
  | "estadios"
  | "gastronomia"
  | "fotografia"
  | "paisajes"
  | "hoteles"
  | "vehiculo"
  | "cantabria"
  | "pais-vasco";

/** Snapshot mínimo de estado que el evaluador de logros necesita, ver `AchievementService`. */
export interface AchievementEvalContext {
  trip: Trip;
  stops: Stop[];
  totalPhotos: number;
  totalKm: number;
  totalDistinctStadiumsVisited: number;
  totalRefuels: number;
}

export interface AchievementDefinition {
  id: ID;
  category: AchievementCategory;
  name: string;
  description: string;
  icon: string;
  targetValue?: number;
  getProgress: (ctx: AchievementEvalContext) => number;
  isUnlocked: (ctx: AchievementEvalContext) => boolean;
  /**
   * Si el logro tiene sentido en este viaje. Los que piden paradas concretas
   * (Getaria, San Mamés...) sólo salen en el viaje que las tiene; sin esto,
   * cualquier otro viaje enseñaba logros imposibles de conseguir.
   */
  aplica?: (stops: Stop[]) => boolean;
}

export interface AchievementState {
  id: ID;
  unlockedAt: ISODateTime | null;
  progress: number;
}
