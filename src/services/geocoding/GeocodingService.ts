import { StorageService } from "../storage/StorageService";
import type { Coordinates } from "../../types";
import { esperarTurnoNominatim } from "./nominatimGate";
import { textoRecuadro, type Recuadro } from "./zonaDelViaje";

export interface GeocodingResult {
  displayName: string;
  coordinates: Coordinates;
  type: string;
}

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

/**
 * El turno es compartido con el resto de servicios que llaman a Nominatim
 * (ver `nominatimGate`): el límite de una petición por segundo es de toda la
 * aplicación, no de cada servicio por su cuenta.
 */
const throttle = esperarTurnoNominatim;

/**
 * Búsqueda de lugares vía Nominatim (OpenStreetMap), sin clave. Los
 * navegadores no permiten fijar la cabecera `User-Agent` desde fetch/XHR —
 * Nominatim acepta el `Referer` automático como identificación en apps de
 * navegador (ver su política de uso: https://operations.osmfoundation.org/policies/nominatim/).
 * Cachea por consulta y aplica throttling para no abusar del servicio.
 */
export const GeocodingService = {
  async search(query: string, opts?: { limit?: number; signal?: AbortSignal; cerca?: Recuadro | null }): Promise<GeocodingResult[]> {
    const trimmed = query.trim();
    if (trimmed.length < 3) return [];

    /*
     * La zona forma parte de la clave de caché.
     *
     * "Catedral" cerca de Euskadi y "catedral" a secas no son la misma
     * pregunta ni dan la misma respuesta. Con una sola clave, la primera
     * búsqueda que se hiciera dejaría cacheados sus resultados para la otra.
     * Sin zona la clave se queda como estaba, así que lo ya guardado sigue
     * sirviendo.
     */
    const zona = opts?.cerca ? textoRecuadro(opts.cerca) : "";
    const cacheKey = zona ? `${trimmed.toLowerCase()}@${zona}` : trimmed.toLowerCase();
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    await throttle();

    /*
     * `viewbox` sin `bounded=1`: la zona es una preferencia, no una jaula.
     * Lo de fuera del viaje sigue apareciendo —a veces el sitio que buscas
     * está lejos y lo sabes—, sólo que después de lo que te pilla de camino.
     */
    const zonaUrl = opts?.cerca ? `&viewbox=${textoRecuadro(opts.cerca)}` : "";
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmed)}&format=jsonv2&limit=${opts?.limit ?? 5}&addressdetails=0${zonaUrl}`;

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

/*
 * Aquí vivía un `debounce()` genérico, y se ha quitado a propósito.
 *
 * Dentro de un componente de React no debounce nada: cada render fabrica una
 * función nueva, con su temporizador a estrenar, que no puede cancelar al de
 * la anterior. El editor de paradas lo usaba así y lanzaba una petición por
 * tecla. Dejarlo aquí era dejar la trampa puesta para la próxima vez.
 *
 * Lo que hay que usar es `useBusquedaDeLugares`, que además cancela la
 * petición que ya no interesa y descarta las respuestas que llegan tarde.
 */
