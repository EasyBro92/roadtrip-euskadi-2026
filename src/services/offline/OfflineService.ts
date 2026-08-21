import type { OfflinePackage, Stop, Trip } from "../../types";
import { generateId } from "../../utils/id";
import { estimateStorageUsage } from "../storage/db";
import { PhotoService } from "../photos/PhotoService";
import { RoutingService } from "../routing/RoutingService";

/**
 * Gestión del "paquete offline" (sección 41). Con límite legal/técnico
 * honesto: no se descargan teselas de mapa en bloque de forma proactiva (el
 * Service Worker las cachea de forma incremental, según se visitan, vía
 * `runtimeCaching` en vite.config.ts — ver LIMITATIONS.md). Lo que sí se
 * puede preparar de verdad para uso offline es: itinerario, textos, fotos ya
 * subidas por el usuario y rutas precalculadas.
 */
export const OfflineService = {
  async buildPackage(trip: Trip, stops: Stop[], limitBytes: number): Promise<OfflinePackage> {
    try {
      const orderedStops = trip.days.flatMap((day) => day.stopIds.map((id) => stops.find((s) => s.id === id)).filter((s): s is Stop => s != null && s.enabled));

      // Rutas precalculadas: quedan en la caché en memoria de RoutingService y en el
      // runtime cache del Service Worker (NetworkFirst) la próxima vez que se pidan.
      await RoutingService.routeFullTrip(orderedStops.map((s) => ({ id: s.id, coordinates: s.coordinates })));

      const photosSizeBytes = await PhotoService.totalSizeBytes();
      const usage = await estimateStorageUsage();
      const estimatedSizeBytes = photosSizeBytes + JSON.stringify(trip).length + JSON.stringify(stops).length;

      return {
        id: generateId("offline-package"),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        includesItinerary: true,
        includesText: true,
        includesHeroPhotos: true,
        includesPrecomputedRoutes: true,
        includesMapTiles: false,
        estimatedSizeBytes,
        usedSizeBytes: usage?.usedBytes ?? estimatedSizeBytes,
        limitBytes,
        status: "ready",
      };
    } catch (error) {
      return {
        id: generateId("offline-package"),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        includesItinerary: false,
        includesText: false,
        includesHeroPhotos: false,
        includesPrecomputedRoutes: false,
        includesMapTiles: false,
        estimatedSizeBytes: 0,
        usedSizeBytes: 0,
        limitBytes,
        status: "error",
        errorMessage: (error as Error).message,
      };
    }
  },

  async currentUsageBytes(): Promise<number> {
    const usage = await estimateStorageUsage();
    return usage?.usedBytes ?? (await PhotoService.totalSizeBytes());
  },
};
