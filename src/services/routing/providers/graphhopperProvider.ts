import type { Coordinates, RouteStrategy } from "../../../types";
import { ENV, hasKey } from "../../../utils/env";
import type { RoutingProvider, RoutingProviderResult } from "../RoutingProvider";
import { RoutingProviderError } from "../RoutingProvider";

/**
 * GraphHopper (https://www.graphhopper.com). Requiere `VITE_GRAPHHOPPER_KEY`
 * en `.env` (plan gratuito disponible). Sin clave configurada, el provider
 * se declara no disponible y RoutingService pasa al siguiente de la lista.
 */
export const graphhopperProvider: RoutingProvider = {
  id: "graphhopper",
  label: "GraphHopper",
  requiresApiKey: true,
  isAvailable: () => hasKey(ENV.GRAPHHOPPER_KEY),
  async route(waypoints: Coordinates[], strategy: RouteStrategy): Promise<RoutingProviderResult> {
    if (!hasKey(ENV.GRAPHHOPPER_KEY)) {
      throw new RoutingProviderError("graphhopper", "VITE_GRAPHHOPPER_KEY no configurada");
    }

    const points = waypoints.map((w) => `point=${w.latitude},${w.longitude}`).join("&");
    const avoidTolls = strategy === "no-tolls" ? "&avoid=toll" : "";
    const url = `https://graphhopper.com/api/1/route?${points}&vehicle=car&points_encoded=false${avoidTolls}&key=${ENV.GRAPHHOPPER_KEY}`;

    let response: Response;
    try {
      response = await fetch(url);
    } catch (error) {
      throw new RoutingProviderError("graphhopper", `Error de red: ${(error as Error).message}`);
    }

    if (!response.ok) throw new RoutingProviderError("graphhopper", `GraphHopper respondió ${response.status}`);

    const data = await response.json();
    const path = data?.paths?.[0];
    if (!path) throw new RoutingProviderError("graphhopper", "GraphHopper no devolvió ninguna ruta");

    const geometry: Coordinates[] = path.points.coordinates.map(([lon, lat]: [number, number]) => ({ latitude: lat, longitude: lon }));

    return { geometry, distanceMeters: path.distance, durationSeconds: path.time / 1000, hasTolls: strategy === "no-tolls" ? false : null };
  },
};
