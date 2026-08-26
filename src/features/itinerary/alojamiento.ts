import type { ID, Stop, TripDay } from "../../types";

export interface NocheDelDia {
  dayId: ID;
  /** Parada de hotel de ese día, si la hay. */
  stopId: ID | null;
  nombre: string | null;
  /** 1 para la primera noche del bloque, 2 para la siguiente… */
  numeroDeNoche: number;
  totalNoches: number;
  /**
   * Alojamientos de más en ese día. Dos hoteles la misma noche casi siempre
   * es que uno está en el día que no toca, y callarse eso deja el fallo
   * escondido: pasó de verdad con la Pensión Bretxa del viaje de Euskadi.
   */
  sobrantes: string[];
}

function mismoSitio(a: string, b: string): boolean {
  const limpio = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  return limpio(a) === limpio(b);
}

/**
 * Agrupa las noches seguidas en el mismo alojamiento.
 *
 * Un hotel de tres noches está en los datos como tres paradas iguales en tres
 * días distintos, y en la pantalla parecen tres reservas. Esto lo deduce de lo
 * que ya hay, sin tocar el viaje: nada que migrar y nada que se pueda perder.
 *
 * La última noche del viaje se trata aparte en quien llama a esto: volver a
 * casa el último día no es quedarse sin hotel.
 */
export function nochesPorDia(days: TripDay[], stopsById: Record<ID, Stop>): NocheDelDia[] {
  const crudas = days.map((day) => {
    const hoteles = day.stopIds.map((id) => stopsById[id]).filter((s) => s?.enabled && s.category === "hotel");
    const [hotel, ...resto] = hoteles;
    return {
      dayId: day.id,
      stopId: hotel?.id ?? null,
      nombre: hotel?.name ?? null,
      sobrantes: resto.map((s) => s.name),
    };
  });

  const salida: NocheDelDia[] = crudas.map((c) => ({ ...c, numeroDeNoche: 1, totalNoches: 1 }));

  // Un bloque son días consecutivos con el mismo nombre de alojamiento.
  let inicio = 0;
  while (inicio < salida.length) {
    const nombre = salida[inicio].nombre;
    if (!nombre) {
      inicio++;
      continue;
    }

    let fin = inicio;
    while (fin + 1 < salida.length && salida[fin + 1].nombre && mismoSitio(salida[fin + 1].nombre!, nombre)) {
      fin++;
    }

    const total = fin - inicio + 1;
    for (let i = inicio; i <= fin; i++) {
      salida[i].numeroDeNoche = i - inicio + 1;
      salida[i].totalNoches = total;
    }
    inicio = fin + 1;
  }

  return salida;
}

/**
 * Días sin sitio donde dormir, sin contar el último.
 *
 * El último día se vuelve a casa: avisar de que no tiene hotel sería un aviso
 * falso en todos los viajes de ida y vuelta.
 */
export function nochesSinAlojamiento(noches: NocheDelDia[]): NocheDelDia[] {
  return noches.slice(0, -1).filter((n) => !n.nombre);
}
