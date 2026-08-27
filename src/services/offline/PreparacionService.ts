import type { Stop, Trip } from "../../types";
import { medirCobertura } from "./tileCoverage";
import { PlaceDetailsService } from "../places/PlaceDetailsService";
import { RoutingService } from "../routing/RoutingService";
import { WeatherService, hayPrevisionPara } from "../weather/WeatherService";

export type EstadoPaso = "pendiente" | "haciendo" | "hecho" | "aviso" | "fallido";

export interface Paso {
  id: string;
  titulo: string;
  estado: EstadoPaso;
  /** Lo que hay que contarle a quien mira: cuántos, qué falta, qué no se pudo. */
  detalle: string;
  progreso?: { hechas: number; total: number };
}

export interface Avance {
  (pasos: Paso[]): void;
}

const PASOS_INICIALES: Paso[] = [
  { id: "horarios", titulo: "Horarios y teléfonos de las paradas", estado: "pendiente", detalle: "Sin comprobar" },
  { id: "tiempo", titulo: "Previsión del tiempo de cada día", estado: "pendiente", detalle: "Sin comprobar" },
  { id: "rutas", titulo: "Rutas entre paradas", estado: "pendiente", detalle: "Sin comprobar" },
  { id: "mapa", titulo: "Mapa guardado para ver sin cobertura", estado: "pendiente", detalle: "Sin comprobar" },
];

export function pasosIniciales(): Paso[] {
  return PASOS_INICIALES.map((p) => ({ ...p }));
}

/**
 * Deja el viaje listo para la carretera.
 *
 * Descarga y guarda lo que se puede guardar: horarios, teléfonos y webs de
 * cada parada, la previsión de cada día y las rutas. Lo que **no** se puede
 * es bajarse el mapa: la política de uso de OpenStreetMap y de CARTO prohíbe
 * descargar teselas en bloque, así que ese paso sólo mide lo que ya tienes de
 * haber mirado el mapa, y te dice qué días te faltan.
 *
 * Va paso a paso y avisando por el camino: son decenas de peticiones a
 * servidores de voluntarios, espaciadas una por segundo, y conviene poder ver
 * que avanza en vez de mirar una rueda.
 */
export async function prepararViaje(
  trip: Trip,
  stopsById: Record<string, Stop>,
  urlDeTeselas: string,
  avisar: Avance,
  cancelado: () => boolean,
): Promise<Paso[]> {
  const pasos = pasosIniciales();
  const emitir = () => avisar(pasos.map((p) => ({ ...p })));

  const paradas = trip.days.flatMap((d) => d.stopIds.map((id) => stopsById[id]).filter((s): s is Stop => s?.enabled === true));

  // --- Horarios ---
  const horarios = pasos[0];
  horarios.estado = "haciendo";
  let conHorario = 0;
  let fallos = 0;
  for (const [i, parada] of paradas.entries()) {
    if (cancelado()) break;
    horarios.progreso = { hechas: i, total: paradas.length };
    horarios.detalle = `${i} de ${paradas.length}`;
    emitir();
    try {
      const detalles = await PlaceDetailsService.obtener(parada.coordinates, parada.name);
      if (detalles.horario) conHorario++;
    } catch {
      fallos++;
    }
  }
  horarios.progreso = undefined;
  horarios.estado = fallos > paradas.length / 2 ? "fallido" : "hecho";
  horarios.detalle =
    horarios.estado === "fallido"
      ? "OpenStreetMap no responde. Inténtalo más tarde."
      : `${conHorario} de ${paradas.length} paradas tienen horario publicado. El resto no lo tiene en OpenStreetMap.`;
  emitir();

  // --- Tiempo ---
  const tiempo = pasos[1];
  if (!cancelado()) {
    tiempo.estado = "haciendo";
    emitir();
    const conPrevision = trip.days.filter((d) => hayPrevisionPara(d.date));
    try {
      // Una consulta por día basta: la previsión de una ciudad vale para todo.
      for (const dia of conPrevision) {
        const primera = dia.stopIds.map((id) => stopsById[id]).find((s) => s?.enabled);
        if (primera) await WeatherService.prevision(primera.coordinates);
      }
      tiempo.estado = conPrevision.length === trip.days.length ? "hecho" : "aviso";
      tiempo.detalle =
        conPrevision.length === trip.days.length
          ? `Los ${trip.days.length} días, guardados.`
          : `${conPrevision.length} de ${trip.days.length} días. Los demás quedan fuera de la previsión de dos semanas.`;
    } catch {
      tiempo.estado = "fallido";
      tiempo.detalle = "No se ha podido consultar la previsión.";
    }
    emitir();
  }

  // --- Rutas ---
  const rutas = pasos[2];
  if (!cancelado()) {
    rutas.estado = "haciendo";
    emitir();
    try {
      await RoutingService.routeFullTrip(paradas.map((s) => ({ id: s.id, coordinates: s.coordinates })));
      rutas.estado = "hecho";
      rutas.detalle = "Calculadas y guardadas.";
    } catch {
      rutas.estado = "aviso";
      rutas.detalle = "No se han podido calcular. Sin ellas verás líneas rectas entre paradas, no la carretera.";
    }
    emitir();
  }

  // --- Mapa ---
  const mapa = pasos[3];
  if (!cancelado()) {
    mapa.estado = "haciendo";
    emitir();
    const flojos: string[] = [];
    let sinCache = false;
    for (const [i, dia] of trip.days.entries()) {
      const puntos = dia.stopIds.map((id) => stopsById[id]).filter((s) => s?.enabled).map((s) => s.coordinates);
      const medida = await medirCobertura(puntos, urlDeTeselas);
      if (medida.sinCache) {
        sinCache = true;
        break;
      }
      if (medida.porcentaje < 70) flojos.push(`día ${i + 1} (${medida.porcentaje}%)`);
    }

    if (sinCache) {
      // Pasa al abrir la app desde el navegador sin instalar, o en desarrollo.
      mapa.estado = "aviso";
      mapa.detalle = "El mapa sólo se guarda con la app instalada en la pantalla de inicio. Desde el navegador no hay dónde guardarlo.";
    } else {
      mapa.estado = flojos.length === 0 ? "hecho" : "aviso";
      mapa.detalle =
        flojos.length === 0
          ? "Todos los días tienen el mapa guardado."
          : `Falta mapa en ${flojos.join(", ")}. Abre el mapa de esos días con cobertura y vuelve a comprobar.`;
    }
    emitir();
  }

  return pasos.map((p) => ({ ...p }));
}
