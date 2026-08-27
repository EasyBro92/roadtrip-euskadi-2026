import type { Coordinates } from "../../types";
import { haversineDistanceMeters } from "../../utils/geo";

export type NearbyCategory =
  | "gasolinera"
  | "aparcamiento"
  | "taller"
  | "hospital"
  | "farmacia"
  | "supermercado"
  | "restaurante"
  | "hotel"
  | "cajero";

export interface NearbyPlace {
  id: string;
  name: string;
  category: NearbyCategory;
  coordinates: Coordinates;
  distanceMeters: number;
  /** true = dato real de OpenStreetMap; nunca inventamos resultados. */
  isReal: boolean;
  /** Tipo de cocina, ya legible: "vasca, pescado". Sólo restaurantes. */
  cocina?: string;
  /** Rango de precio de OpenStreetMap, de € a €€€€. */
  precio?: string;
  /** Bar, cafetería o restaurante: no es lo mismo buscar cena que un café. */
  clase?: string;
}

/** Filtro Overpass por categoría. Datos reales de OpenStreetMap, sin clave. */
const OVERPASS_FILTER: Record<NearbyCategory, string> = {
  gasolinera: 'node["amenity"="fuel"]',
  aparcamiento: 'node["amenity"="parking"]',
  taller: 'node["shop"="car_repair"]',
  hospital: 'node["amenity"~"^(hospital|clinic)$"]',
  farmacia: 'node["amenity"="pharmacy"]',
  supermercado: 'node["shop"~"^(supermarket|convenience)$"]',
  restaurante: 'node["amenity"~"^(restaurant|cafe|bar)$"]',
  hotel: 'node["tourism"~"^(hotel|guest_house|hostel)$"]',
  cajero: 'node["amenity"="atm"]',
};

export const NEARBY_CATEGORY_LABEL: Record<NearbyCategory, string> = {
  gasolinera: "Gasolineras",
  aparcamiento: "Aparcamientos",
  taller: "Talleres",
  hospital: "Hospitales",
  farmacia: "Farmacias",
  supermercado: "Supermercados",
  restaurante: "Restaurantes",
  hotel: "Hoteles",
  cajero: "Cajeros",
};

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";

/** Traducción de las etiquetas de cocina más comunes por aquí. */
const COCINAS: Record<string, string> = {
  spanish: "española",
  basque: "vasca",
  regional: "regional",
  tapas: "tapas",
  pintxos: "pintxos",
  seafood: "pescado y marisco",
  fish: "pescado",
  italian: "italiana",
  pizza: "pizza",
  asian: "asiática",
  chinese: "china",
  japanese: "japonesa",
  indian: "india",
  mexican: "mexicana",
  burger: "hamburguesas",
  sandwich: "bocadillos",
  kebab: "kebab",
  vegetarian: "vegetariana",
  vegan: "vegana",
  coffee_shop: "cafetería",
  ice_cream: "heladería",
  bakery: "panadería",
  international: "internacional",
  french: "francesa",
  portuguese: "portuguesa",
  grill: "parrilla",
  barbecue: "parrilla",
};

const CLASES: Record<string, string> = { restaurant: "Restaurante", cafe: "Cafetería", bar: "Bar" };

/** "basque;seafood" -> "vasca, pescado y marisco". Lo que no conocemos pasa tal cual. */
function leerCocina(valor?: string): string | undefined {
  if (!valor) return undefined;
  return valor
    .split(";")
    .map((c) => COCINAS[c.trim()] ?? c.trim().replace(/_/g, " "))
    .slice(0, 3)
    .join(", ");
}

/**
 * Overpass va a rachas: medido un día tardaba 12 s y devolvía 504, y al día
 * siguiente respondía en 330 ms. Cortamos nosotros antes de que el usuario se
 * quede mirando una rueda eterna.
 */
const LIMITE_MS = 12000;

/**
 * Caché de la sesión, 10 minutos.
 *
 * Corta las repeticiones de volver a la misma categoría sin dejar la lista
 * rancia: una gasolinera abierta a las 9 puede no estarlo a las 22, así que
 * esto no se guarda en disco a propósito.
 */
const CADUCIDAD_MS = 10 * 60 * 1000;
const cache = new Map<string, { en: number; resultados: NearbyPlace[] }>();

/** Coordenada redondeada a ~100 m: moverse un poco no invalida la búsqueda. */
function claveDe(center: Coordinates, category: NearbyCategory, radiusMeters: number): string {
  return `${center.latitude.toFixed(3)},${center.longitude.toFixed(3)}:${category}:${radiusMeters}`;
}

/** Vacía la caché. Para el botón de reintentar y para los tests. */
export function olvidarCercanos(): void {
  cache.clear();
}

/**
 * Busca sitios cercanos reales en OpenStreetMap vía Overpass API (pública,
 * sin clave). Si Overpass no responde, devolvemos un error explícito en vez
 * de inventar resultados (sección 50 del encargo).
 */
export const NearbyService = {
  async search(center: Coordinates, category: NearbyCategory, radiusMeters = 5000): Promise<NearbyPlace[]> {
    const clave = claveDe(center, category, radiusMeters);
    const guardado = cache.get(clave);
    if (guardado && Date.now() - guardado.en < CADUCIDAD_MS) return guardado.resultados;

    const filter = OVERPASS_FILTER[category];
    const query = `[out:json][timeout:20];${filter}(around:${radiusMeters},${center.latitude},${center.longitude});out body 40;`;

    const corte = AbortSignal.timeout(LIMITE_MS);
    const response = await fetch(OVERPASS_ENDPOINT, {
      signal: corte,
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) throw new Error(`Overpass respondió ${response.status}`);

    const data: { elements?: Array<{ id: number; lat: number; lon: number; tags?: Record<string, string> }> } = await response.json();

    const resultados = (data.elements ?? [])
      .filter((el) => el.lat != null && el.lon != null)
      .map((el) => {
        const coordinates = { latitude: el.lat, longitude: el.lon };
        return {
          id: String(el.id),
          name: el.tags?.name ?? el.tags?.brand ?? NEARBY_CATEGORY_LABEL[category].replace(/s$/, ""),
          category,
          coordinates,
          distanceMeters: haversineDistanceMeters(center, coordinates),
          isReal: true,
          cocina: leerCocina(el.tags?.cuisine),
          // OpenStreetMap usa "€", "€€"… o a veces palabras; se deja como venga.
          precio: el.tags?.["price_range"] ?? el.tags?.["price"],
          clase: el.tags?.amenity ? CLASES[el.tags.amenity] : undefined,
        };
      })
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, 25);

    cache.set(clave, { en: Date.now(), resultados });
    return resultados;
  },
};
