import { StorageService } from "../storage/StorageService";
import type { Coordinates } from "../../types";

export interface GeocodingResult {
  displayName: string;
  coordinates: Coordinates;
  type: string;
}

const MIN_INTERVAL_MS = 1100; // Política de uso de Nominatim: máx. 1 petición/segundo.
let lastRequestAt = 0;

/**
 * La política de Nominatim pide guardar los resultados. En memoria se perdían
 * al recargar, así que buscar "Pamplona" hoy y mañana eran dos peticiones por
 * lo mismo. Persistirla también hace que una búsqueda ya hecha funcione sin
 * conexión.
 *
 * OJO: esto reduce las peticiones **de un usuario**. El límite de 1/segundo es
 * del servicio, no del navegador: con muchos usuarios a la vez se supera igual,
 * y eso solo se arregla con una caché compartida en servidor propio.
 */
const CACHE_KEY = "geocoding-cache";
const MAX_ENTRADAS = 300;

function cargarCache(): Map<string, GeocodingResult[]> {
  const guardado = StorageService.get<Record<string, GeocodingResult[]>>(CACHE_KEY, {});
  return new Map(Object.entries(guardado));
}

const cache = cargarCache();

function guardarCache(): void {
  // Se recorta por los más antiguos: un Map conserva el orden de inserción.
  const entradas = [...cache.entries()].slice(-MAX_ENTRADAS);
  StorageService.set(CACHE_KEY, Object.fromEntries(entradas));
}

async function throttle(): Promise<void> {
  const elapsed = Date.now() - lastRequestAt;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_INTERVAL_MS - elapsed));
  }
  lastRequestAt = Date.now();
}

/**
 * Búsqueda de lugares vía Nominatim (OpenStreetMap), sin clave. Los
 * navegadores no permiten fijar la cabecera `User-Agent` desde fetch/XHR —
 * Nominatim acepta el `Referer` automático como identificación en apps de
 * navegador (ver su política de uso: https://operations.osmfoundation.org/policies/nominatim/).
 * Cachea por consulta y aplica throttling para no abusar del servicio.
 */
export const GeocodingService = {
  async search(query: string, opts?: { limit?: number; signal?: AbortSignal }): Promise<GeocodingResult[]> {
    const trimmed = query.trim();
    if (trimmed.length < 3) return [];

    const cacheKey = trimmed.toLowerCase();
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    await throttle();

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmed)}&format=jsonv2&limit=${opts?.limit ?? 5}&addressdetails=0`;

    const response = await fetch(url, { signal: opts?.signal });
    if (!response.ok) throw new Error(`Nominatim respondió ${response.status}`);

    const data: Array<{ display_name: string; lat: string; lon: string; type: string }> = await response.json();
    const results = data.map((item) => ({
      displayName: item.display_name,
      coordinates: { latitude: Number.parseFloat(item.lat), longitude: Number.parseFloat(item.lon) },
      type: item.type,
    }));

    cache.set(cacheKey, results);
    guardarCache();
    return results;
  },

  clearCache(): void {
    cache.clear();
    StorageService.remove(CACHE_KEY);
  },
};

/** Debounce genérico usado por el input de búsqueda del editor (sección 26). */
export function debounce<Args extends unknown[]>(fn: (...args: Args) => void, delayMs: number): (...args: Args) => void {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  return (...args: Args) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delayMs);
  };
}
