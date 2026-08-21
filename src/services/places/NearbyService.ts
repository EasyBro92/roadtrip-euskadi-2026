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

/**
 * Busca sitios cercanos reales en OpenStreetMap vía Overpass API (pública,
 * sin clave). Si Overpass no responde, devolvemos un error explícito en vez
 * de inventar resultados (sección 50 del encargo).
 */
export const NearbyService = {
  async search(center: Coordinates, category: NearbyCategory, radiusMeters = 5000): Promise<NearbyPlace[]> {
    const filter = OVERPASS_FILTER[category];
    const query = `[out:json][timeout:20];${filter}(around:${radiusMeters},${center.latitude},${center.longitude});out body 40;`;

    const response = await fetch(OVERPASS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) throw new Error(`Overpass respondió ${response.status}`);

    const data: { elements?: Array<{ id: number; lat: number; lon: number; tags?: Record<string, string> }> } = await response.json();

    return (data.elements ?? [])
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
        };
      })
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, 25);
  },
};
