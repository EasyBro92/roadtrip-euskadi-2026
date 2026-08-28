import type { ISODate, Stop, StopCategory, Trip } from "../../types";

/**
 * Un itinerario metido dentro de un enlace.
 *
 * Va **sólo el itinerario**: nombre, fecha y las paradas de cada día. Ni
 * fotos, ni notas, ni gastos, ni tus valoraciones. Dos razones: un enlace
 * tiene un límite práctico de longitud y el viaje entero no cabe, y lo que se
 * comparte con alguien es el plan, no tu cuaderno.
 *
 * El formato es de listas y no de objetos porque las claves repetidas treinta
 * y cinco veces son justo lo que hace que un enlace deje de caber.
 */
export interface ItinerarioCompacto {
  /** Versión del formato, para poder cambiarlo sin romper enlaces viejos. */
  v: 1;
  n: string;
  d: ISODate;
  /** [día (desde 1), nombre, lat, lon, categoría, minutos] */
  p: [number, string, number, number, string, number][];
}

/** Cinco decimales son poco más de un metro: de sobra, y ahorra caracteres. */
const DECIMALES = 5;

export function empaquetar(trip: Trip, stopsById: Record<string, Stop>): ItinerarioCompacto {
  const p: ItinerarioCompacto["p"] = [];
  trip.days.forEach((dia, i) => {
    for (const id of dia.stopIds) {
      const s = stopsById[id];
      if (!s?.enabled) continue;
      p.push([
        i + 1,
        s.name,
        Number(s.coordinates.latitude.toFixed(DECIMALES)),
        Number(s.coordinates.longitude.toFixed(DECIMALES)),
        s.category,
        s.recommendedDurationMinutes,
      ]);
    }
  });
  return { v: 1, n: trip.name, d: trip.startDate, p };
}

export interface ItinerarioLeido {
  nombre: string;
  fechaInicio: ISODate;
  dias: number;
  paradas: { dia: number; nombre: string; latitude: number; longitude: number; categoria: StopCategory; minutos: number }[];
}

/**
 * Comprueba y traduce lo que venga en el enlace.
 *
 * Un enlace puede llegar cortado por WhatsApp o manipulado, así que nada se
 * da por bueno: cada parada que no cuadre se descarta en vez de meter basura
 * en un viaje nuevo.
 */
export function desempaquetar(datos: unknown): ItinerarioLeido | null {
  if (!datos || typeof datos !== "object") return null;
  const d = datos as Partial<ItinerarioCompacto>;
  if (d.v !== 1 || typeof d.n !== "string" || typeof d.d !== "string" || !Array.isArray(d.p)) return null;

  const paradas = d.p
    .filter(
      (f): f is ItinerarioCompacto["p"][number] =>
        Array.isArray(f) &&
        f.length >= 6 &&
        Number.isFinite(f[0]) &&
        typeof f[1] === "string" &&
        Number.isFinite(f[2]) &&
        Number.isFinite(f[3]) &&
        Math.abs(f[2]) <= 90 &&
        Math.abs(f[3]) <= 180,
    )
    .map((f) => ({
      dia: Math.max(1, Math.round(f[0])),
      nombre: f[1].slice(0, 120),
      latitude: f[2],
      longitude: f[3],
      categoria: (f[4] || "ciudad") as StopCategory,
      minutos: Number.isFinite(f[5]) ? Math.max(0, Math.round(f[5])) : 60,
    }));

  if (paradas.length === 0) return null;

  return {
    nombre: d.n.slice(0, 80) || "Viaje compartido",
    fechaInicio: d.d,
    dias: Math.max(...paradas.map((p) => p.dia)),
    paradas,
  };
}
