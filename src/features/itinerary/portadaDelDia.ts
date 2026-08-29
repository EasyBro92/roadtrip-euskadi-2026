import type { Stop } from "../../types";

/**
 * Sitios que no representan un día aunque tengan foto.
 *
 * Nadie recuerda una jornada por el hotel donde durmió ni por el aparcamiento
 * donde dejó el coche, y sin embargo el hotel suele ser la parada más larga
 * del día: eligiendo por tiempo ganaría casi siempre.
 */
const NO_SON_PORTADA = new Set(["hotel", "aparcamiento"]);

/**
 * La foto que representa un día del viaje.
 *
 * Se elige la parada donde más rato se está, que es donde pasa el día. Antes
 * se cogía la primera con foto, y eso hacía que el día 1 abriera con la foto
 * de la ciudad de la que sales: el punto de partida es la primera parada de la
 * lista porque de ahí arranca la ruta, no porque vayas a visitarlo.
 *
 * Con eso basta y no hace falta marcar nada: si a una parada le pones cero
 * minutos —pasas por ahí y ya—, deja de competir por la portada sola.
 *
 * Empatadas a tiempo manda el orden del día, que es el orden en que las vas a
 * ver. No la nota fotográfica: en el viaje de Euskadi el día 1 tiene Huesca y
 * el Castillo de Loarre a 90 minutos cada uno, y por nota ganaría el castillo
 * — pero el día se llama "Salida y Aragón" y va primero Huesca. Ordenar por
 * nota cambiaría portadas ya elegidas sin que nadie lo haya pedido.
 */
export function fotoDelDia(stops: Stop[]): string | undefined {
  const candidatas = stops
    .filter((s) => s.enabled && s.heroImage && !NO_SON_PORTADA.has(s.category))
    .sort((a, b) => b.recommendedDurationMinutes - a.recommendedDurationMinutes);

  // Si el día es sólo hotel y gasolinera, mejor su foto que ninguna.
  return candidatas[0]?.heroImage ?? stops.find((s) => s.enabled && s.heroImage)?.heroImage;
}
