import type { RouteTag, RouteTipo, StopCategory } from "../types";

/** [nombre, categoría, latitud, longitud, minutos, día, descripción] */
export type ParadaRoadtrip = [string, StopCategory, number, number, number, number, string];

/** Un road trip tal como lo escribe `scripts/build-roadtrips.mjs`. */
export interface RoadtripCrudo {
  id: string;
  name: string;
  region: string;
  country: string;
  tipo: RouteTipo;
  tags: RouteTag[];
  summary: string;
  days: number;
  stops: ParadaRoadtrip[];
}
