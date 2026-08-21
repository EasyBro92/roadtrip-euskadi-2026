import type { ID, ISODateTime } from "./common";

/**
 * Metadatos de una fotografía. El blob binario (comprimido) vive en Dexie
 * (`PhotoService`); aquí solo guardamos referencia + metadatos ligeros para
 * que el store principal (localStorage) no crezca con binarios.
 */
export interface Photo {
  id: ID;
  stopId: ID | null;
  dayId: ID | null;
  blobKey: string;
  thumbnailDataUrl: string;
  description: string;
  isFavorite: boolean;
  isHero: boolean;
  takenAt: ISODateTime;
  widthPx: number;
  heightPx: number;
  sizeBytes: number;
  source: "itinerary" | "user";
}
