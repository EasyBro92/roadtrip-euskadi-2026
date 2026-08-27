export const MODOS = ["pie", "coche", "bus", "tren", "avion"] as const;
export type ModoTransporte = (typeof MODOS)[number];

export const ETIQUETA_MODO: Record<ModoTransporte, string> = {
  pie: "A pie",
  coche: "En coche",
  bus: "En bus o metro",
  tren: "En tren",
  avion: "En avión",
};

/**
 * Hasta aquí se va andando.
 *
 * 1,5 km en línea recta son unos 2 km de calles reales, veinte minutos largos.
 * Por debajo de eso, coger el coche en una ciudad cuesta más de lo que ahorra
 * entre buscar aparcamiento y las calles peatonales.
 */
const A_PIE_MAXIMO_M = 1500;

/** Velocidad andando de alguien que además va mirando. */
const KMH_A_PIE = 4.2;

/**
 * Velocidad media de puerta a puerta, no de crucero: incluye salir de la
 * ciudad, rotondas y aparcar. Estimar por la de la autopista da tiempos que
 * no se cumplen nunca.
 */
const KMH_EN_COCHE = 62;

/** Cómo se llega, si nadie lo ha dicho: por la distancia. */
export function modoPorDefecto(metros: number): ModoTransporte {
  return metros <= A_PIE_MAXIMO_M ? "pie" : "coche";
}

/**
 * Minutos aproximados del tramo.
 *
 * `null` para tren y avión: dependen del horario, no de la distancia, y
 * ponerle un número inventado a un vuelo sería peor que dejarlo en blanco —
 * lo que vale es la hora del billete, que va en Reservas y documentos.
 */
export function minutosDeTramo(metros: number, modo: ModoTransporte): number | null {
  if (modo === "tren" || modo === "avion") return null;
  const km = metros / 1000;
  if (modo === "pie") return Math.max(1, Math.round((km / KMH_A_PIE) * 60));
  // El bus urbano va por las mismas calles pero sin buscar aparcamiento.
  if (modo === "bus") return Math.max(2, Math.round((km / 18) * 60));
  return Math.max(1, Math.round((km / KMH_EN_COCHE) * 60));
}

/** "35 min", "1 h 20 min". */
export function formatearMinutos(minutos: number): string {
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}
