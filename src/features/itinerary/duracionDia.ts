import type { Stop } from "../../types";
import { haversineDistanceMeters } from "../../utils/geo";
import { minutosDeTramo, modoPorDefecto } from "./tramos";

/**
 * A partir de aquí el día es largo: se puede, pero sales pronto y llegas de
 * noche. Diez horas de actividad son de 9:00 a 19:00 sin un hueco.
 */
const LARGO_MINUTOS = 10 * 60;

/**
 * Y a partir de aquí no cabe.
 *
 * Doce horas de visitas y carretera significan salir a las ocho y terminar a
 * las ocho sin comer, sin una cola, sin buscar aparcamiento y sin pararse a
 * mirar nada que no estuviera en la lista. Nunca pasa.
 */
const IMPOSIBLE_MINUTOS = 12 * 60;

export interface DuracionDia {
  minutosVisitas: number;
  minutosCamino: number;
  minutosTotales: number;
  nivel: "holgado" | "largo" | "imposible";
}

/**
 * Cuánto dura un día del viaje: lo que se tarda en ver las paradas más lo que
 * se tarda en ir de una a otra.
 *
 * El aviso que había contaba paradas, y contar paradas no distingue nueve
 * sitios del casco viejo de Bilbao — que caben en una mañana andando — de
 * doce repartidos entre Gaztelugatxe y Hondarribia. Lo que no cabe en un día
 * son las horas, no los sitios.
 *
 * Los tramos se estiman igual que en el resto del itinerario, con la
 * velocidad de puerta a puerta y no la de crucero. Es una estimación y por eso
 * la pantalla dice "unas": lo que se quiere evitar es planificar catorce horas
 * creyendo que son ocho, no acertar al minuto.
 */
export function duracionDelDia(stops: Stop[]): DuracionDia {
  const activas = stops.filter((s) => s.enabled);

  const minutosVisitas = activas.reduce((suma, s) => suma + (s.recommendedDurationMinutes || 0), 0);

  let minutosCamino = 0;
  for (let i = 1; i < activas.length; i++) {
    const metros = haversineDistanceMeters(activas[i - 1].coordinates, activas[i].coordinates);
    const modo = activas[i].modoLlegada ?? modoPorDefecto(metros);
    // Tren y avión devuelven null: dependen del horario, no de la distancia, y
    // sumar un número inventado estropearía el total entero.
    minutosCamino += minutosDeTramo(metros, modo) ?? 0;
  }

  const minutosTotales = minutosVisitas + minutosCamino;

  return {
    minutosVisitas,
    minutosCamino,
    minutosTotales,
    nivel: minutosTotales >= IMPOSIBLE_MINUTOS ? "imposible" : minutosTotales >= LARGO_MINUTOS ? "largo" : "holgado",
  };
}
