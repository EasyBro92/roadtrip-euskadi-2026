import Dexie, { type EntityTable } from "dexie";
import type { DocumentoGuardado } from "../documents/DocumentService";
import type { PlaceDetails } from "../places/PlaceDetailsService";
import type { HistorySnapshot, Photo } from "../../types";

/** Fotografía persistida en IndexedDB, con el blob binario comprimido incluido. */
export interface StoredPhoto extends Photo {
  blob: Blob;
}

/**
 * Base de datos IndexedDB de la app. Guarda binarios (fotos) e historial de
 * snapshots — todo lo que no cabe razonablemente en localStorage. El estado
 * "ligero" (viaje, gastos, logros...) vive en localStorage vía StorageService.
 * Ver DECISIONS.md: separación deliberada por tamaño esperado de cada dato.
 */
export class RoadtripDatabase extends Dexie {
  photos!: EntityTable<StoredPhoto, "id">;
  historySnapshots!: EntityTable<HistorySnapshot, "id">;
  /** Caché de datos prácticos de OpenStreetMap: horarios, teléfono, web. */
  placeDetails!: EntityTable<PlaceDetails, "id">;
  /** Reservas, entradas y billetes, con el PDF o la foto dentro. */
  documents!: EntityTable<DocumentoGuardado, "id">;

  constructor() {
    // NO renombrar aunque la app se llame ahora Easy Travel: es el nombre de
    // la base de datos IndexedDB ya creada. Cambiarlo abriría una base vacía
    // y las fotos guardadas dejarían de aparecer.
    super("roadtrip-euskadi-2026");
    this.version(1).stores({
      photos: "id, stopId, dayId, isFavorite, isHero, takenAt",
      historySnapshots: "id, createdAt",
    });
    // Dexie conserva las tablas de la versión anterior: sólo se añade la nueva.
    this.version(2).stores({
      placeDetails: "id, fetchedAt",
    });
    this.version(3).stores({
      documents: "id, dayId, fecha",
    });
  }
}

export const db = new RoadtripDatabase();

/** Estimación de cuota de almacenamiento del navegador (sección 41: mostrar espacio usado). */
export async function estimateStorageUsage(): Promise<{ usedBytes: number; quotaBytes: number } | null> {
  if (!("storage" in navigator) || !navigator.storage.estimate) return null;
  const estimate = await navigator.storage.estimate();
  return { usedBytes: estimate.usage ?? 0, quotaBytes: estimate.quota ?? 0 };
}
