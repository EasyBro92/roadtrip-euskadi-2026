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

/**
 * Categorías de parada usadas en mapa, filtros y theming.
 *
 * La lista es la fuente de verdad y el tipo se deriva de ella, no al revés.
 * Antes el tipo era una unión y los desplegables repetían la lista a mano:
 * como `StopCategory[]` acepta una lista incompleta, al añadir "ciudad" el
 * compilador no avisó y la categoría no aparecía al crear una parada.
 * Recorriendo STOP_CATEGORIES eso no puede repetirse.
 */
export const STOP_CATEGORIES = [
  "naturaleza",
  "fotografia",
  "paisaje",
  "mirador",
  "gastronomia",
  "hotel",
  "estadio",
  "cultura",
  "ciudad",
  "pueblo",
  "historia",
  "aparcamiento",
  "playa",
  "castillo",
] as const;

export type StopCategory = (typeof STOP_CATEGORIES)[number];

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
