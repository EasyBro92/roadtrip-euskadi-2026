import type { MapLayerId } from "../../types";

/**
 * Mapas de calles que tienen gemelo oscuro.
 *
 * Sólo estos se cambian. "Relieve", "Satélite" o "Ciclismo" se eligen porque
 * enseñan algo concreto —las curvas de nivel, la foto real, las vías verdes—
 * y no existe una versión de noche de eso: oscurecerlos sería estropear el
 * dato por el que se han elegido.
 */
const CON_VERSION_NOCTURNA = new Set<MapLayerId>(["roads", "light", "classic"]);

/**
 * Qué capa se pinta, según el tema.
 *
 * No toca el ajuste guardado: si tienes "Carreteras" elegido, sigues
 * teniendo "Carreteras" elegido; lo único que cambia es qué teselas se
 * dibujan mientras la app está en oscuro. Al volver a claro reaparece la
 * tuya sin que hayas perdido nada.
 *
 * Existía un "Mapa oscuro" desde siempre, pero había que ir a elegirlo a
 * mano en el selector de capas. Conduciendo de noche —que es cuando el mapa
 * está a pantalla completa y encendido— nadie va a buscar eso, y lo que
 * pasaba es que la app se ponía oscura y el mapa se quedaba en blanco
 * deslumbrando.
 */
export function capaSegunTema(elegida: MapLayerId, oscuro: boolean): MapLayerId {
  if (!oscuro) return elegida;
  return CON_VERSION_NOCTURNA.has(elegida) ? "dark" : elegida;
}
