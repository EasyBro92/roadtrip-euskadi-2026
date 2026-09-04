import type { Stop } from "../../types";

/** Categorías que no son "sitios a los que vas": son logística del día. */
const LOGISTICA = new Set(["hotel", "aparcamiento"]);

export interface Aviso {
  id: string;
  texto: string;
  /** `atencion` es lo que puede estropearte el día si no lo miras. */
  tono: "atencion" | "info";
}

export interface EstadoDeHoy {
  /** Qué número de día del viaje es hoy, empezando en 1. */
  numeroDeDia: number;
  totalDias: number;
  /** La siguiente parada de verdad que te queda por visitar. */
  siguiente: Stop | null;
  pendientes: number;
  visitadas: number;
  avisos: Aviso[];
}

/**
 * Dónde estás hoy, y qué se te puede haber olvidado.
 *
 * Es lo que hace útil una tarjeta de Wallet: no que esté bonita, sino que te
 * diga lo que necesitas saber ahora sin que se lo preguntes. Aquí eso es la
 * siguiente parada y los avisos que sólo se ven navegando por la app —que
 * esta noche no tienes hotel, que te dejaste el coche marcado— y que estando
 * en la carretera nadie va a ir a buscar.
 *
 * El día se pasa entero en vez de leerse del reloj para que se pueda probar
 * sin depender de cuándo se ejecuten las pruebas.
 */
export function estadoDeHoy({
  stops,
  numeroDeDia,
  totalDias,
  hayCoche,
}: {
  stops: Stop[];
  numeroDeDia: number;
  totalDias: number;
  hayCoche: boolean;
}): EstadoDeHoy {
  const activas = stops.filter((s) => s.enabled !== false);
  const visitables = activas.filter((s) => !LOGISTICA.has(s.category));

  const visitadas = visitables.filter((s) => s.visited).length;
  const pendientes = visitables.length - visitadas;
  const siguiente = visitables.find((s) => !s.visited) ?? null;

  const avisos: Aviso[] = [];

  /*
   * Sin hotel esta noche.
   *
   * El último día no se avisa: se vuelve a casa, y avisar de que no hay hotel
   * la noche que duermes en tu cama es ruido que enseña a ignorar los avisos.
   */
  const esUltimoDia = numeroDeDia === totalDias;
  if (!esUltimoDia && !activas.some((s) => s.category === "hotel")) {
    avisos.push({ id: "sin-hotel", texto: "Esta noche no tienes hotel apuntado", tono: "atencion" });
  }

  if (hayCoche) {
    avisos.push({ id: "coche", texto: "Tienes el coche marcado en el mapa", tono: "info" });
  }

  if (visitables.length > 0 && pendientes === 0) {
    avisos.push({ id: "completo", texto: "Has visitado todas las paradas de hoy", tono: "info" });
  }

  return { numeroDeDia, totalDias, siguiente, pendientes, visitadas, avisos };
}
