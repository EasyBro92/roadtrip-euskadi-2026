import { generateId } from "../../utils/id";
import type { Coordinates, ID, RouteSegment, RouteStrategy, RoutingProviderId } from "../../types";
import { graphhopperProvider } from "./providers/graphhopperProvider";
import { openRouteServiceProvider } from "./providers/openRouteServiceProvider";
import { osrmProvider } from "./providers/osrmProvider";
import { straightLineProvider } from "./providers/straightLineProvider";
import { valhallaProvider } from "./providers/valhallaProvider";
import type { RoutingProvider } from "./RoutingProvider";

const PROVIDERS: RoutingProvider[] = [osrmProvider, valhallaProvider, graphhopperProvider, openRouteServiceProvider];

const segmentCache = new Map<string, RouteSegment>();

function cacheKey(fromStopId: ID, toStopId: ID, strategy: RouteStrategy, providerId: RoutingProviderId): string {
  return `${fromStopId}|${toStopId}|${strategy}|${providerId}`;
}

export interface RouteBetweenStopsInput {
  fromStopId: ID;
  toStopId: ID;
  from: Coordinates;
  to: Coordinates;
  strategy?: RouteStrategy;
  preferredProviderId?: RoutingProviderId;
}

/**
 * Punto único de acceso a "ruta real por carretera" (sección 12). Prueba los
 * proveedores disponibles en orden y solo cae a línea recta si todos fallan
 * o ninguno tiene clave configurada — nunca lanza un error al llamador.
 */
export const RoutingService = {
  listProviders(): { id: RoutingProviderId; label: string; available: boolean; requiresApiKey: boolean }[] {
    return [...PROVIDERS, straightLineProvider].map((p) => ({ id: p.id, label: p.label, available: p.isAvailable(), requiresApiKey: p.requiresApiKey }));
  },

  async routeBetweenStops(input: RouteBetweenStopsInput): Promise<RouteSegment> {
    const strategy = input.strategy ?? "fastest";
    const orderedProviders = input.preferredProviderId
      ? [...PROVIDERS.filter((p) => p.id === input.preferredProviderId), ...PROVIDERS.filter((p) => p.id !== input.preferredProviderId)]
      : PROVIDERS;

    for (const provider of orderedProviders) {
      if (!provider.isAvailable()) continue;

      const key = cacheKey(input.fromStopId, input.toStopId, strategy, provider.id);
      const cached = segmentCache.get(key);
      if (cached) return cached;

      try {
        const result = await provider.route([input.from, input.to], strategy);
        const segment: RouteSegment = {
          id: generateId("segment"),
          fromStopId: input.fromStopId,
          toStopId: input.toStopId,
          provider: provider.id,
          strategy,
          geometry: result.geometry,
          distanceMeters: result.distanceMeters,
          durationSeconds: result.durationSeconds,
          hasTolls: result.hasTolls,
          isFallback: false,
          fetchedAt: new Date().toISOString(),
        };
        segmentCache.set(key, segment);
        return segment;
      } catch (error) {
        console.warn(`[RoutingService] Proveedor ${provider.id} falló, probando siguiente`, error);
      }
    }

    // Ningún proveedor disponible respondió: modo demo con línea recta, marcado explícitamente.
    const fallback = await straightLineProvider.route([input.from, input.to], strategy);
    const segment: RouteSegment = {
      id: generateId("segment"),
      fromStopId: input.fromStopId,
      toStopId: input.toStopId,
      provider: "straight-line",
      strategy,
      geometry: fallback.geometry,
      distanceMeters: fallback.distanceMeters,
      durationSeconds: fallback.durationSeconds,
      hasTolls: null,
      isFallback: true,
      fetchedAt: new Date().toISOString(),
    };
    segmentCache.set(cacheKey(input.fromStopId, input.toStopId, strategy, "straight-line"), segment);
    return segment;
  },

  async routeFullTrip(orderedStops: { id: ID; coordinates: Coordinates }[], strategy: RouteStrategy = "fastest"): Promise<RouteSegment[]> {
    const segments: RouteSegment[] = [];
    for (let i = 0; i < orderedStops.length - 1; i++) {
      const from = orderedStops[i];
      const to = orderedStops[i + 1];
      segments.push(await this.routeBetweenStops({ fromStopId: from.id, toStopId: to.id, from: from.coordinates, to: to.coordinates, strategy }));
    }
    return segments;
  },

  clearCache(): void {
    segmentCache.clear();
  },
};
