import type { Coordinates } from "../../../types";
import { totalPathDistanceMeters } from "../../../utils/geo";
import type { RoutingProvider, RoutingProviderResult } from "../RoutingProvider";

/** Velocidad media asumida para estimar duración cuando no hay proveedor real disponible. */
const ASSUMED_AVERAGE_SPEED_KMH = 65;

/**
 * Fallback siempre disponible: línea recta entre paradas. Se usa cuando
 * ningún proveedor real responde, y se marca `isFallback: true` en el
 * RouteSegment resultante para que la UI avise de que es una ruta aproximada.
 */
export const straightLineProvider: RoutingProvider = {
  id: "straight-line",
  label: "Línea recta (modo demo)",
  requiresApiKey: false,
  isAvailable: () => true,
  async route(waypoints: Coordinates[]): Promise<RoutingProviderResult> {
    const distanceMeters = totalPathDistanceMeters(waypoints);
    const durationSeconds = (distanceMeters / 1000 / ASSUMED_AVERAGE_SPEED_KMH) * 3600;
    return { geometry: waypoints, distanceMeters, durationSeconds, hasTolls: null };
  },
};
