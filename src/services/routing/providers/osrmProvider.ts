import type { Coordinates, RouteStrategy } from "../../../types";
import type { RoutingProvider, RoutingProviderResult } from "../RoutingProvider";
import { RoutingProviderError } from "../RoutingProvider";

/**
 * OSRM: servidor de demostración público (router.project-osrm.org), sin
 * clave. Es de uso razonable/no comercial según sus propias condiciones —
 * ver https://github.com/Project-OSRM/osrm-backend/wiki/Demo-server. Es el
 * proveedor por defecto porque funciona out-of-the-box sin configuración.
 */
export const osrmProvider: RoutingProvider = {
  id: "osrm",
  label: "OSRM (demo público)",
  requiresApiKey: false,
  isAvailable: () => true,
  async route(waypoints: Coordinates[], strategy?: RouteStrategy): Promise<RoutingProviderResult> {
    const coordsParam = waypoints.map((w) => `${w.longitude},${w.latitude}`).join(";");
    // El perfil de coche del servidor de demo permite excluir los peajes.
    const sinPeajes = strategy === "no-tolls" ? "&exclude=toll" : "";
    const url = `https://router.project-osrm.org/route/v1/driving/${coordsParam}?overview=full&geometries=geojson${sinPeajes}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let response: Response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } catch (error) {
      throw new RoutingProviderError("osrm", `No se pudo contactar con OSRM: ${(error as Error).message}`);
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) throw new RoutingProviderError("osrm", `OSRM respondió ${response.status}`);

    const data = await response.json();
    const route = data?.routes?.[0];
    if (!route) throw new RoutingProviderError("osrm", "OSRM no devolvió ninguna ruta");

    const geometry: Coordinates[] = route.geometry.coordinates.map(([lon, lat]: [number, number]) => ({
      latitude: lat,
      longitude: lon,
    }));

    return { geometry, distanceMeters: route.distance, durationSeconds: route.duration, hasTolls: null };
  },
};
