import type { Coordinates } from "../../types";

/** Un rectángulo en el mapa, en grados. */
export interface Recuadro {
  oeste: number;
  sur: number;
  este: number;
  norte: number;
}

/**
 * Cuánto se ensancha el recuadro alrededor de las paradas.
 *
 * Medio grado son unos 55 km. Sin margen, buscar algo que está justo al lado
 * del viaje —el pueblo de la sidrería, la playa de la siguiente cala— quedaría
 * fuera de la zona preferida y competiría de tú a tú con su homónimo de
 * Argentina. Con margen, "al lado de donde vas" sigue contando como cerca.
 */
const MARGEN_GRADOS = 0.5;

/**
 * El rectángulo que abarca el viaje, para que la búsqueda prefiera esa zona.
 *
 * Escribir "catedral" en un buscador de lugares del mundo entero devuelve
 * catedrales de cualquier sitio, y estando planificando un viaje por Euskadi
 * ninguna de las primeras suele ser la que buscas. Este recuadro se le pasa a
 * Nominatim como zona preferida —preferida, no obligatoria: lo de fuera sigue
 * saliendo, sólo que después—, así que lo de cerca de tu ruta sube solo.
 *
 * Devuelve `null` si no hay coordenadas: un viaje recién creado todavía no
 * tiene zona, y entonces se busca en todas partes, que es lo correcto.
 */
export function recuadroDe(coordenadas: Coordinates[]): Recuadro | null {
  if (coordenadas.length === 0) return null;

  let oeste = Infinity;
  let este = -Infinity;
  let sur = Infinity;
  let norte = -Infinity;

  for (const { latitude, longitude } of coordenadas) {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    oeste = Math.min(oeste, longitude);
    este = Math.max(este, longitude);
    sur = Math.min(sur, latitude);
    norte = Math.max(norte, latitude);
  }

  if (!Number.isFinite(oeste)) return null;

  return {
    oeste: Math.max(-180, oeste - MARGEN_GRADOS),
    este: Math.min(180, este + MARGEN_GRADOS),
    sur: Math.max(-90, sur - MARGEN_GRADOS),
    norte: Math.min(90, norte + MARGEN_GRADOS),
  };
}

/**
 * El recuadro como texto, para la URL de Nominatim y para la clave de caché.
 *
 * Redondeado a dos decimales —un kilómetro largo— a propósito: así mover una
 * parada cien metros no estrena una entrada de caché distinta para las mismas
 * búsquedas.
 */
export function textoRecuadro(r: Recuadro): string {
  const n = (v: number) => v.toFixed(2);
  return `${n(r.oeste)},${n(r.norte)},${n(r.este)},${n(r.sur)}`;
}
