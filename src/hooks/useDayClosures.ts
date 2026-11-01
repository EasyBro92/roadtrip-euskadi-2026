import { useCallback, useEffect, useState } from "react";
import { PlaceDetailsService } from "../services/places/PlaceDetailsService";
import type { ISODate, Stop } from "../types";
import { parseISODate } from "../utils/dates";
import { horasDeLlegada } from "../features/itinerary/duracionDia";
import { abreEseDia, estadoDeApertura } from "../utils/openingHours";

export interface ParadaCerrada {
  id: string;
  nombre: string;
}

/** Abre ese día, pero a la hora a la que llegarías estará cerrada. */
export interface ParadaCerradaALaLlegada extends ParadaCerrada {
  /** "19:30" */
  llegada: string;
  /** Cuándo vuelve a abrir, si es ese mismo día. */
  abreA?: string;
}

/** Lo que sabemos de una parada tras mirar la caché. */
export interface Sabido {
  /** Ya se preguntó a OpenStreetMap, con o sin suerte. */
  comprobado: boolean;
  horario?: string;
}

/** Las tres cuentas del aviso, sin React de por medio para poder probarlas. */
export interface ResumenCierres {
  cerradas: ParadaCerrada[];
  cerradasALaLlegada: ParadaCerradaALaLlegada[];
  sinComprobar: number;
  sinHorario: number;
}

/**
 * Reparte las paradas del día en tres montones: las que cierran seguro, las
 * que aún no se han consultado y aquellas de las que ya se preguntó sin
 * suerte.
 *
 * Las desactivadas no cuentan: no vas a ir. Y un horario que no se entiende
 * cae siempre del lado de "no lo sé", nunca del de "cerrado".
 */
export function resumirCierres(stops: Stop[], sabido: Record<string, Sabido>, fecha: ISODate): ResumenCierres {
  const dia = parseISODate(fecha);
  const cerradas: ParadaCerrada[] = [];
  const cerradasALaLlegada: ParadaCerradaALaLlegada[] = [];
  const llegadas = horasDeLlegada(stops);
  let sinComprobar = 0;
  let sinHorario = 0;

  for (const stop of stops) {
    if (!stop.enabled) continue;
    const horario = stop.openingHours ?? sabido[stop.id]?.horario;
    const abre = abreEseDia(horario, dia);

    if (abre === false) {
      cerradas.push({ id: stop.id, nombre: stop.name });
    } else if (abre === true && llegadas[stop.id] != null && llegadas[stop.id] < 24 * 60) {
      // Abre ese día, pero ¿a la hora a la que llegas? Saliendo a las 9:00 y
      // sumando visitas y carretera, un museo al final del día suele pillarse
      // cerrado sin que nadie se dé cuenta hasta llegar a la puerta.
      const minutos = llegadas[stop.id];
      const momento = new Date(dia);
      momento.setHours(Math.floor(minutos / 60), minutos % 60, 0, 0);
      const estado = estadoDeApertura(horario, momento);
      if (estado.estado === "cerrado") {
        const llegada = `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;
        cerradasALaLlegada.push({ id: stop.id, nombre: stop.name, llegada, abreA: estado.abreDia === "hoy" ? estado.abreA : undefined });
      }
    } else if (abre === null) {
      // Sin saberlo: o no se ha preguntado, o se preguntó y no había nada.
      if (stop.openingHours || sabido[stop.id]?.comprobado) sinHorario++;
      else sinComprobar++;
    }
  }

  return { cerradas, cerradasALaLlegada, sinComprobar, sinHorario };
}

export interface EstadoCierres {
  /** Paradas que ese día están cerradas, con certeza. */
  cerradas: ParadaCerrada[];
  /** Abren ese día, pero no a la hora estimada de llegada. */
  cerradasALaLlegada: ParadaCerradaALaLlegada[];
  /** Paradas cuyo horario no se ha consultado todavía. */
  sinComprobar: number;
  /** Consultadas ya, pero OpenStreetMap no tiene horario de ellas. */
  sinHorario: number;
  comprobando: boolean;
  /** Cuántas llevamos consultadas de cuántas, mientras se comprueba. */
  progreso: { hechas: number; total: number } | null;
  comprobar: () => void;
}

/**
 * Qué paradas del día estarían cerradas cuando llegues.
 *
 * Sin tocar la red: se usa el horario escrito en la parada y, si no lo hay, el
 * que ya esté en la caché de OpenStreetMap. Consultar los que faltan es una
 * acción aparte (`comprobar`) porque son tantas peticiones como paradas tenga
 * el día, y eso no se lanza a espaldas de nadie.
 *
 * Sólo se avisa de lo que se sabe seguro. Un horario que no se entiende no
 * cuenta como "cerrado" jamás.
 */
export function useDayClosures(stops: Stop[], fecha: ISODate): EstadoCierres {
  const [sabido, setSabido] = useState<Record<string, Sabido>>({});
  const [comprobando, setComprobando] = useState(false);
  const [progreso, setProgreso] = useState<{ hechas: number; total: number } | null>(null);

  const claves = stops.map((s) => s.id).join("|");

  // Lectura de caché: se rehace cuando cambia el día o su lista de paradas.
  useEffect(() => {
    let vigente = true;
    (async () => {
      const encontrados: Record<string, Sabido> = {};
      for (const stop of stops) {
        if (stop.openingHours) continue; // lo tuyo manda, no hace falta la caché
        const guardado = await PlaceDetailsService.enCache(stop.coordinates, stop.name);
        if (guardado) encontrados[stop.id] = { comprobado: true, horario: guardado.horario };
      }
      if (vigente) setSabido(encontrados);
    })();
    return () => {
      vigente = false;
    };
    // `claves` resume la lista de paradas; `stops` cambia de identidad en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claves]);

  const { cerradas, cerradasALaLlegada, sinComprobar, sinHorario } = resumirCierres(stops, sabido, fecha);

  const comprobar = useCallback(() => {
    const pendientes = stops.filter((s) => s.enabled && !s.openingHours && !sabido[s.id]?.comprobado);
    if (pendientes.length === 0) return;

    setComprobando(true);
    setProgreso({ hechas: 0, total: pendientes.length });

    (async () => {
      const encontrados: Record<string, Sabido> = {};
      let hechas = 0;
      for (const stop of pendientes) {
        try {
          // El limitador compartido de Nominatim ya las espacia una por segundo.
          const detalles = await PlaceDetailsService.obtener(stop.coordinates, stop.name);
          encontrados[stop.id] = { comprobado: true, horario: detalles.horario };
        } catch {
          // Una parada que falle no debe tumbar la comprobación de las demás,
          // ni quedar marcada como comprobada: se podrá reintentar.
        }
        hechas++;
        setProgreso({ hechas, total: pendientes.length });
      }
      setSabido((previo) => ({ ...previo, ...encontrados }));
      setComprobando(false);
      setProgreso(null);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claves, sabido]);

  return { cerradas, cerradasALaLlegada, sinComprobar, sinHorario, comprobando, progreso, comprobar };
}
