import type { Coordinates, ID, StopCategory } from "./common";

/** Una parada dentro de una ruta del catálogo, sin fechas: las pone el viaje. */
export interface RouteTemplateStop {
  name: string;
  category: StopCategory;
  coordinates: Coordinates;
  shortDescription: string;
  recommendedDurationMinutes: number;
  /** Día de la ruta al que pertenece, empezando en 1. */
  dayIndex: number;
}

/**
 * Ruta prehecha del catálogo (Explorar). No es un viaje: es una plantilla que
 * se copia a un viaje nuevo, o de la que se cogen paradas sueltas. La ruta
 * original nunca se modifica.
 */
/** Qué clase de ruta es: un viaje por carretera, una escapada de un día o una ciudad a pie. */
export type RouteTipo = "roadtrip" | "escapada" | "ciudad";

/** Temas para filtrar en Explorar. */
export type RouteTag = "costa" | "montaña" | "pueblos" | "naturaleza" | "cultura" | "gastronomia" | "vino" | "castillos";

export interface RouteTemplate {
  id: ID;
  name: string;
  region: string;
  summary: string;
  dayCount: number;
  stops: RouteTemplateStop[];
  /** Opcionales para no romper rutas guardadas o importadas de antes. */
  tipo?: RouteTipo;
  tags?: RouteTag[];
  country?: string;
}
