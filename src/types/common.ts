/** Identificador único de cualquier entidad persistida. */
export type ID = string;

/** Fecha en formato ISO 8601 (YYYY-MM-DD). */
export type ISODate = string;

/** Fecha y hora en formato ISO 8601 completo. */
export type ISODateTime = string;

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** Categorías de parada usadas en mapa, filtros y theming. */
export type StopCategory =
  | "naturaleza"
  | "fotografia"
  | "paisaje"
  | "mirador"
  | "gastronomia"
  | "hotel"
  | "estadio"
  | "cultura"
  | "pueblo"
  | "historia"
  | "aparcamiento"
  | "playa"
  | "castillo";

/** Estado de visita de una parada, usado para colorear ruta y progreso. */
export type VisitStatus =
  | "pending"
  | "completed"
  | "optional"
  | "skipped"
  | "cancelled";

export type PhotographyRating = 1 | 2 | 3 | 4 | 5;

export type Priority = "must-see" | "high" | "medium" | "low";

/**
 * Marca el origen del dato: "real" (verificado o introducido por el usuario)
 * o "demo" (dato de ejemplo, nunca inventado como si fuera real).
 * Ver LIMITATIONS.md: la app nunca debe mostrar un dato demo como si fuera
 * información verificada.
 */
export type DataSource = "real" | "demo" | "user" | "pending-verification";

export interface Timestamped {
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface WithNotes {
  notes: string;
}
