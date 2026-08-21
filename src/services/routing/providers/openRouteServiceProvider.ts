import type { Coordinates, RouteStrategy } from "../../../types";
import { ENV, hasKey } from "../../../utils/env";
import type { RoutingProvider, RoutingProviderResult } from "../RoutingProvider";
import { RoutingProviderError } from "../RoutingProvider";

/**
 * OpenRouteService (https://openrouteservice.org). Requiere `VITE_ORS_KEY`
 * en `.env` (plan gratuito disponible). Único proveedor de la lista con
 * soporte nativo de "ruta panorámica" real (perfil `cycling-regular` de ORS
 * pondera vías secundarias; para coche usamos `preference=recommended` con
 * `avoid_features` como aproximación a "sin peajes").
 */
export const openRouteServiceProvider: RoutingProvider = {
  id: "openrouteservice",
  label: "OpenRouteService",
  requiresApiKey: true,
  isAvailable: () => hasKey(ENV.ORS_KEY),
  async route(waypoints: Coordinates[], strategy: RouteStrategy): Promise<RoutingProviderResult> {
    if (!hasKey(ENV.ORS_KEY)) {
      throw new RoutingProviderError("openrouteservice", "VITE_ORS_KEY no configurada");
    }

    const coordinates = waypoints.map((w) => [w.longitude, w.latitude]);
    const body: Record<string, unknown> = { coordinates };
    if (strategy === "no-tolls") body.options = { avoid_features: ["tollways"] };

    let response: Response;
    try {
      response = await fetch("https://api.openrouteservice.org/v2/directions/driving-car/geojson", {
        method: "POST",
        headers: { Authorization: ENV.ORS_KEY, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (error) {
      throw new RoutingProviderError("openrouteservice", `Error de red: ${(error as Error).message}`);
    }

    if (!response.ok) throw new RoutingProviderError("openrouteservice", `ORS respondió ${response.status}`);

    const data = await response.json();
    const feature = data?.features?.[0];
    if (!feature) throw new RoutingProviderError("openrouteservice", "ORS no devolvió ninguna ruta");

    const geometry: Coordinates[] = feature.geometry.coordinates.map(([lon, lat]: [number, number]) => ({ latitude: lat, longitude: lon }));
    const summary = feature.properties.summary;

    return { geometry, distanceMeters: summary.distance, durationSeconds: summary.duration, hasTolls: strategy === "no-tolls" ? false : null };
  },
};
