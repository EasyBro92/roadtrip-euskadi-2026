import type { NearbyCategory, NearbyPlace } from "../../services/places/NearbyService";
import type { LugarElegido } from "../../stores/useLugarStore";
import type { StopCategory } from "../../types";

/**
 * Qué categoría de parada le corresponde a un lugar de OpenStreetMap.
 *
 * Antes, todo lo que añadías desde el buscador entraba como "pueblo", fuese
 * un restaurante o un castillo: en el itinerario salía con el icono y el
 * color equivocados y la duración de visita de un pueblo. Nominatim dice qué
 * es cada cosa (`type`), así que basta con traducirlo.
 */
const POR_TIPO_OSM: Record<string, StopCategory> = {
  city: "ciudad",
  town: "ciudad",
  municipality: "ciudad",
  administrative: "ciudad",
  village: "pueblo",
  hamlet: "pueblo",
  suburb: "pueblo",
  neighbourhood: "pueblo",
  locality: "pueblo",
  restaurant: "gastronomia",
  cafe: "gastronomia",
  bar: "gastronomia",
  pub: "gastronomia",
  fast_food: "gastronomia",
  winery: "gastronomia",
  hotel: "hotel",
  guest_house: "hotel",
  hostel: "hotel",
  motel: "hotel",
  camp_site: "hotel",
  caravan_site: "aparcamiento",
  parking: "aparcamiento",
  museum: "cultura",
  gallery: "cultura",
  theatre: "cultura",
  arts_centre: "cultura",
  artwork: "cultura",
  attraction: "cultura",
  castle: "castillo",
  fort: "castillo",
  ruins: "historia",
  monument: "historia",
  memorial: "historia",
  archaeological_site: "historia",
  church: "historia",
  cathedral: "historia",
  monastery: "historia",
  viewpoint: "mirador",
  peak: "paisaje",
  volcano: "paisaje",
  waterfall: "naturaleza",
  cave_entrance: "naturaleza",
  nature_reserve: "naturaleza",
  national_park: "naturaleza",
  park: "naturaleza",
  forest: "naturaleza",
  wood: "naturaleza",
  beach: "playa",
  bay: "playa",
  stadium: "estadio",
  sports_centre: "estadio",
};

/** "castle" → "castillo"; lo que no se conoce, como sitio cultural. */
export function categoriaDeTipoOsm(tipo: string | undefined): StopCategory {
  if (!tipo) return "cultura";
  return POR_TIPO_OSM[tipo] ?? "cultura";
}

/** Con qué categoría de parada se guarda cada tipo de "qué hay cerca". */
export const PARADA_DE_CERCANO: Record<NearbyCategory, StopCategory> = {
  restaurante: "gastronomia",
  hotel: "hotel",
  aparcamiento: "aparcamiento",
  gasolinera: "aparcamiento",
  supermercado: "gastronomia",
  farmacia: "ciudad",
  cajero: "ciudad",
  taller: "aparcamiento",
  hospital: "ciudad",
};

/** Nombre en singular de cada tipo de "qué hay cerca", para la ficha. */
export const TIPO_DE_CERCANO: Record<NearbyCategory, string> = {
  restaurante: "Restaurante",
  hotel: "Alojamiento",
  aparcamiento: "Aparcamiento",
  gasolinera: "Gasolinera",
  supermercado: "Supermercado",
  farmacia: "Farmacia",
  cajero: "Cajero",
  taller: "Taller",
  hospital: "Hospital",
};

/** Palabras con las que la gente busca cada categoría, sin tildes ni mayúsculas. */
const PALABRAS: [RegExp, NearbyCategory][] = [
  [/^(gasolinera|gasolineras|gasolina|gasoil|diesel|combustible|repostar)$/, "gasolinera"],
  [/^(parking|parkings|aparcar|aparcamiento|aparcamientos|estacionamiento)$/, "aparcamiento"],
  [/^(restaurante|restaurantes|comer|cenar|comida|bar|bares|cafe|cafeteria|tapas|pintxos)$/, "restaurante"],
  [/^(hotel|hoteles|dormir|hostal|alojamiento|alojamientos|albergue)$/, "hotel"],
  [/^(super|supermercado|supermercados|tienda|compras)$/, "supermercado"],
  [/^(farmacia|farmacias)$/, "farmacia"],
  [/^(cajero|cajeros|atm|banco)$/, "cajero"],
  [/^(taller|talleres|mecanico|neumaticos)$/, "taller"],
  [/^(hospital|hospitales|urgencias|medico|centro de salud)$/, "hospital"],
];

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Si lo que se ha escrito es una categoría ("gasolinera", "comer") y no el
 * nombre de un sitio. Es lo que hace Google Maps: escribir "gasolineras" no
 * busca un pueblo con ese nombre, enseña las gasolineras de la zona.
 */
export function categoriaEscrita(texto: string): NearbyCategory | null {
  const limpio = normalizar(texto).replace(/\s+(cerca|aqui|por aqui)$/, "");
  for (const [patron, categoria] of PALABRAS) if (patron.test(limpio)) return categoria;
  return null;
}

/** Un resultado de "qué hay cerca", con la forma de la ficha común del mapa. */
export function lugarDeCercano(lugar: NearbyPlace): LugarElegido {
  const chips = [lugar.clase, lugar.cocina, lugar.precio].filter((c): c is string => Boolean(c));
  return {
    id: `cerca:${lugar.id}`,
    nombre: lugar.name,
    tipo: TIPO_DE_CERCANO[lugar.category],
    categoria: PARADA_DE_CERCANO[lugar.category],
    coordinates: lugar.coordinates,
    origen: "cerca" as const,
    chips,
  };
}


/** "Calle Mayor, 3, Hondarribia, Gipuzkoa, España" → nombre y lo demás. */
export function partirDireccion(texto: string): { nombre: string; resto: string } {
  const [nombre, ...resto] = texto.split(",").map((t) => t.trim());
  return { nombre: nombre || texto, resto: resto.slice(0, 3).join(", ") };
}
