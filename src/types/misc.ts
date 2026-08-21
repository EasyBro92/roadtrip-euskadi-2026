import type { ID, ISODateTime } from "./common";

export type FavoriteTargetType = "stop" | "place" | "restaurant" | "hotel" | "parking" | "viewpoint" | "photo";

export interface Favorite {
  id: ID;
  targetType: FavoriteTargetType;
  targetId: ID;
  addedAt: ISODateTime;
}

export type NoteTargetType = "day" | "stop" | "hotel" | "restaurant" | "expense" | "photo" | "vehicle";

export interface Note {
  id: ID;
  targetType: NoteTargetType;
  targetId: ID;
  text: string;
  date: ISODateTime;
  tags: string[];
  favorite: boolean;
}

export type ChecklistCategory = "documentacion" | "vehiculo" | "tecnologia" | "viaje";

export interface ChecklistItem {
  id: ID;
  category: ChecklistCategory;
  label: string;
  checked: boolean;
  isCustom: boolean;
}

export interface OfflinePackage {
  id: ID;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  includesItinerary: boolean;
  includesText: boolean;
  includesHeroPhotos: boolean;
  includesPrecomputedRoutes: boolean;
  includesMapTiles: boolean;
  estimatedSizeBytes: number;
  usedSizeBytes: number;
  limitBytes: number;
  status: "idle" | "downloading" | "ready" | "error";
  errorMessage?: string;
}

export interface HistorySnapshot {
  id: ID;
  createdAt: ISODateTime;
  label: string;
  reason: string;
  serializedState: string;
}
