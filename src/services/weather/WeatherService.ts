import type { Coordinates, ISODate } from "../../types";

export interface PrevisionDia {
  fecha: ISODate;
  /** Código WMO tal cual lo da el servicio. */
  codigo: number;
  maxC: number;
  minC: number;
  /** Probabilidad de precipitación, 0-100. */
  lluviaPct: number;
}

const ENDPOINT = "https://api.open-meteo.com/v1/forecast";

/** Hasta dónde llega la previsión. Más allá, nadie lo sabe y no lo fingimos. */
export const DIAS_DE_PREVISION = 14;

/** El tiempo no cambia cada minuto; una hora de caché evita repetir por nada. */
const CADUCIDAD_MS = 60 * 60 * 1000;
const cache = new Map<string, { en: number; dias: PrevisionDia[] }>();

/**
 * Traducción de los códigos WMO que devuelve Open-Meteo.
 *
 * Se agrupan a propósito: la diferencia entre "llovizna ligera" y "llovizna
 * moderada" no cambia el plan de nadie, y "llueve" sí.
 */
const DESCRIPCIONES: [maximo: number, texto: string, lluvia: boolean][] = [
  [0, "Despejado", false],
  [2, "Poco nuboso", false],
  [3, "Nublado", false],
  [48, "Niebla", false],
  [57, "Llovizna", true],
  [67, "Lluvia", true],
  [77, "Nieve", true],
  [82, "Chubascos", true],
  [86, "Chubascos de nieve", true],
  [99, "Tormenta", true],
];

export function describirTiempo(codigo: number): { texto: string; lluvia: boolean } {
  const encontrado = DESCRIPCIONES.find(([maximo]) => codigo <= maximo);
  const [, texto, lluvia] = encontrado ?? [99, "Sin datos", false];
  return { texto, lluvia };
}

/** A partir de aquí conviene tener un plan B bajo techo. */
export const LLUVIA_PREOCUPANTE_PCT = 55;

/** ¿Ese día cae dentro de lo que el servicio puede prever? */
export function hayPrevisionPara(fecha: ISODate, hoy = new Date()): boolean {
  const dia = new Date(`${fecha}T12:00:00`);
  const diferencia = (dia.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24);
  return diferencia >= -1 && diferencia <= DIAS_DE_PREVISION;
}

function clave(c: Coordinates): string {
  return `${c.latitude.toFixed(2)},${c.longitude.toFixed(2)}`;
}

/**
 * Previsión diaria de Open-Meteo: gratuito, sin clave y sin registro.
 *
 * Devuelve lo que hay; los días fuera de la ventana simplemente no vienen, y
 * quien llama decide qué decir. Inventar un pronóstico a un mes vista sería
 * peor que no dar ninguno.
 */
export const WeatherService = {
  async prevision(coordenadas: Coordinates): Promise<PrevisionDia[]> {
    const k = clave(coordenadas);
    const guardado = cache.get(k);
    if (guardado && Date.now() - guardado.en < CADUCIDAD_MS) return guardado.dias;

    const url =
      `${ENDPOINT}?latitude=${coordenadas.latitude.toFixed(4)}&longitude=${coordenadas.longitude.toFixed(4)}` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
      `&timezone=auto&forecast_days=${DIAS_DE_PREVISION}`;

    const respuesta = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!respuesta.ok) throw new Error(`El servicio de meteorología respondió ${respuesta.status}`);

    const datos: {
      daily?: {
        time: string[];
        weather_code: number[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        precipitation_probability_max: (number | null)[];
      };
    } = await respuesta.json();

    const d = datos.daily;
    if (!d) return [];

    const dias: PrevisionDia[] = d.time.map((fecha, i) => ({
      fecha,
      codigo: d.weather_code[i],
      maxC: Math.round(d.temperature_2m_max[i]),
      minC: Math.round(d.temperature_2m_min[i]),
      lluviaPct: d.precipitation_probability_max[i] ?? 0,
    }));

    cache.set(k, { en: Date.now(), dias });
    return dias;
  },
};
