import type { Coordinates, ID, ISODate } from "./common";

export type RoutingProviderId = "osrm" | "valhalla" | "graphhopper" | "openrouteservice" | "straight-line";

export type RouteStrategy = "fastest" | "no-tolls" | "scenic" | "balanced";

/** Un tramo geométrico calculado por un RoutingProvider entre dos paradas. */
export interface RouteSegment {
  id: ID;
  fromStopId: ID;
  toStopId: ID;
  provider: RoutingProviderId;
  strategy: RouteStrategy;
  geometry: Coordinates[];
  distanceMeters: number | null;
  durationSeconds: number | null;
  hasTolls: boolean | null;
  isFallback: boolean;
  fetchedAt: string;
}

/** Alternativa comparable de ruta (usada en el editor de regreso). */
export interface RouteAlternative {
  id: ID;
  label: string;
  strategy: RouteStrategy;
  distanceMeters: number | null;
  durationSeconds: number | null;
  tollsInfo: "unknown" | "none" | "some";
  estimatedFuelLiters: number | null;
  estimatedCostEUR: number | null;
  recommendationReason?: string;
  segments: RouteSegment[];
}

/** Día del viaje: agrupa paradas ordenadas y metadatos propios del día. */
export interface TripDay {
  id: ID;
  index: number;
  date: ISODate;
  title: string;
  /** Localidad base del día ("Pamplona", "San Sebastián"), encabezando sus paradas. */
  city?: string;
  stopIds: ID[];
  /**
   * Heredado: "más de seis paradas". Ya no lo lee nadie.
   *
   * Contar paradas no distingue nueve sitios del casco viejo de Bilbao, que
   * caben en una mañana andando, de doce repartidos entre Gaztelugatxe y
   * Hondarribia. Quien quiera saber si un día cabe usa `duracionDelDia`, que
   * suma horas. Se sigue escribiendo porque va dentro de los ficheros que ya
   * ha exportado la gente y quitarlo obliga a migrar el esquema; toca hacerlo
   * en una limpieza, no a mitad de un viaje.
   */
  isOverloaded: boolean;
  rainModeActive: boolean;
  notes: string;
}

export interface ReturnTripOption {
  id: ID;
  label: "zaragoza" | "logrono" | "huesca" | "balanced" | "no-stop" | "custom";
  customPlaceName?: string;
  date: ISODate;
  intermediateStopIds: ID[];
  chosenAlternativeId?: ID;
  alternatives: RouteAlternative[];
}
