import type { Coordinates, RouteStrategy } from "../../../types";
import { decodePolyline } from "../../../utils/polyline";
import type { RoutingProvider, RoutingProviderResult } from "../RoutingProvider";
import { RoutingProviderError } from "../RoutingProvider";

/**
 * Valhalla vía la instancia de demostración pública de OpenStreetMap Alemania
 * (valhalla1.openstreetmap.de). Sin clave, pero es un servicio de demo de
 * terceros: puede no estar siempre disponible. Si falla, RoutingService cae
 * al siguiente proveedor de la cadena automáticamente.
 */
export const valhallaProvider: RoutingProvider = {
  id: "valhalla",
  label: "Valhalla (demo público)",
  requiresApiKey: false,
  isAvailable: () => true,
  async route(waypoints: Coordinates[], strategy: RouteStrategy): Promise<RoutingProviderResult> {
    const body = {
      locations: waypoints.map((w) => ({ lat: w.latitude, lon: w.longitude })),
      costing: "auto",
      costing_options: strategy === "no-tolls" ? { auto: { use_tolls: 0 } } : undefined,
    };

    let response: Response;
    try {
      response = await fetch("https://valhalla1.openstreetmap.de/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (error) {
      throw new RoutingProviderError("valhalla", `Error de red: ${(error as Error).message}`);
    }

    if (!response.ok) throw new RoutingProviderError("valhalla", `Valhalla respondió ${response.status}`);

    const data = await response.json();
    const leg = data?.trip?.legs?.[0];
    if (!leg) throw new RoutingProviderError("valhalla", "Valhalla no devolvió ninguna ruta");

    const geometry = decodePolyline(leg.shape, 6);

    return {
      geometry,
      distanceMeters: data.trip.summary.length * 1000,
      durationSeconds: data.trip.summary.time,
      hasTolls: strategy === "no-tolls" ? false : null,
    };
  },
};
