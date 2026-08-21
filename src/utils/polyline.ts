import type { Coordinates } from "../types";

/**
 * Decodificador del algoritmo estándar de "encoded polyline" (Google/OSRM/Valhalla).
 * `precision` es 5 para la mayoría de proveedores y 6 para Valhalla.
 */
export function decodePolyline(encoded: string, precision = 5): Coordinates[] {
  const factor = 10 ** precision;
  const coordinates: Coordinates[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coordinates.push({ latitude: lat / factor, longitude: lng / factor });
  }

  return coordinates;
}
