import type { StopCategory } from "../../types";

/**
 * Cómo se escribe cada categoría de parada.
 *
 * El identificador se guarda sin tildes ni mayúsculas porque es una clave;
 * lo que se lee es otra cosa. Hasta ahora se pintaba la clave tal cual con un
 * `capitalize` de CSS encima, y salía "Gastronomia", "Fotografia" e
 * "Historia" sin tilde — tres faltas de ortografía a la vista en la lista del
 * itinerario, el mapa, el diario y el álbum.
 *
 * Los gastos ya tenían su tabla de etiquetas (ver `categorias.ts`); las
 * paradas se habían quedado sin ella.
 */
const ETIQUETAS: Record<StopCategory, string> = {
  naturaleza: "Naturaleza",
  fotografia: "Fotografía",
  paisaje: "Paisaje",
  mirador: "Mirador",
  gastronomia: "Gastronomía",
  hotel: "Hotel",
  estadio: "Estadio",
  cultura: "Cultura",
  ciudad: "Ciudad",
  pueblo: "Pueblo",
  historia: "Historia",
  aparcamiento: "Aparcamiento",
  playa: "Playa",
  castillo: "Castillo",
};

/**
 * La etiqueta de una categoría, ya escrita como se lee.
 *
 * Si llega una categoría que no está en la tabla —de un viaje importado, por
 * ejemplo— se devuelve tal cual en vez de romper: mejor una palabra fea que
 * un hueco vacío donde debería decir qué es la parada.
 */
export function etiquetaParada(categoria: StopCategory): string {
  return ETIQUETAS[categoria] ?? categoria;
}
