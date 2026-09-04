import type { ID, ISODate, TripDay } from "../../types";

/**
 * A qué día del viaje pertenece un gasto: al de su fecha.
 *
 * Antes se le pegaba el día que tuvieras abierto en ese momento. En el viaje
 * de Euskadi eso puso el repostaje de la mañana del 30 en el día 31, porque
 * al apuntarlo estaba mirando el día siguiente — y el gasto del día en el
 * Diario contaba mal los dos días.
 *
 * Con las fechas de antes del viaje pasa igual: los hoteles pagados en agosto
 * caían todos en el día 1 y lo inflaban con 331 € que no se gastaron ese día.
 *
 * Si la fecha no cae en ningún día del viaje se devuelve `porDefecto` — el día
 * abierto —, que no es peor que lo de antes y evita dejar el gasto suelto.
 */
export function diaDeLaFecha(days: TripDay[], fecha: ISODate, porDefecto: ID | null): ID | null {
  return days.find((d) => d.date === fecha)?.id ?? porDefecto;
}
