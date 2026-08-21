import type { Coordinates } from "../types";

const EARTH_RADIUS_M = 6371000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/** Distancia entre dos coordenadas en metros (fórmula de Haversine). */
export function haversineDistanceMeters(a: Coordinates, b: Coordinates): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** Rumbo inicial (bearing) en grados [0, 360) desde `a` hacia `b`, usado para rotar el marcador del coche. */
export function bearingDegrees(a: Coordinates, b: Coordinates): number {
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const dLon = toRad(b.longitude - a.longitude);

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Interpolación lineal simple entre dos coordenadas (t entre 0 y 1). Suficiente para animar el marcador entre paradas. */
export function interpolateCoordinates(a: Coordinates, b: Coordinates, t: number): Coordinates {
  const clamped = Math.min(1, Math.max(0, t));
  return {
    latitude: a.latitude + (b.latitude - a.latitude) * clamped,
    longitude: a.longitude + (b.longitude - a.longitude) * clamped,
  };
}

/** Punto interpolado a lo largo de una polilínea completa, usado para reproducir la animación por tramos reales. */
export function pointAlongPath(path: Coordinates[], progress: number): { point: Coordinates; bearing: number } {
  if (path.length === 0) return { point: { latitude: 0, longitude: 0 }, bearing: 0 };
  if (path.length === 1) return { point: path[0], bearing: 0 };

  const segmentLengths = path.slice(1).map((p, i) => haversineDistanceMeters(path[i], p));
  const totalLength = segmentLengths.reduce((a, b) => a + b, 0);
  if (totalLength === 0) return { point: path[0], bearing: 0 };

  const targetDistance = Math.min(1, Math.max(0, progress)) * totalLength;
  let accumulated = 0;

  for (let i = 0; i < segmentLengths.length; i++) {
    const segLength = segmentLengths[i];
    if (accumulated + segLength >= targetDistance || i === segmentLengths.length - 1) {
      const segT = segLength === 0 ? 0 : (targetDistance - accumulated) / segLength;
      return {
        point: interpolateCoordinates(path[i], path[i + 1], segT),
        bearing: bearingDegrees(path[i], path[i + 1]),
      };
    }
    accumulated += segLength;
  }

  return { point: path[path.length - 1], bearing: 0 };
}

export function totalPathDistanceMeters(path: Coordinates[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    total += haversineDistanceMeters(path[i - 1], path[i]);
  }
  return total;
}

export function googleMapsUrl(name: string, coords: Coordinates): string {
  const query = encodeURIComponent(`${name} @${coords.latitude},${coords.longitude}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

/**
 * URL de navegación multi-parada de Google Maps (Google Maps URLs API,
 * pública y sin clave: https://developers.google.com/maps/documentation/urls/get-started).
 * Google limita a 9 waypoints intermedios en la app; si hay más paradas,
 * se recortan a las 9 centrales más el origen/destino reales para que la
 * ruta siga abriendo en vez de fallar.
 */
export function buildGoogleMapsDirectionsUrl(stops: Coordinates[]): string {
  if (stops.length < 2) return "";

  const MAX_WAYPOINTS = 9;
  const origin = stops[0];
  const destination = stops[stops.length - 1];
  let middle = stops.slice(1, -1);
  if (middle.length > MAX_WAYPOINTS) middle = middle.slice(0, MAX_WAYPOINTS);

  const coordParam = (c: Coordinates) => `${c.latitude},${c.longitude}`;
  const params = new URLSearchParams({
    api: "1",
    origin: coordParam(origin),
    destination: coordParam(destination),
    travelmode: "driving",
  });
  if (middle.length > 0) params.set("waypoints", middle.map(coordParam).join("|"));

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
