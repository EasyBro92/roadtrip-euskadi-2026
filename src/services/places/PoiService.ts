import type { Coordinates } from "../../types";

export interface Poi {
  id: string;
  name: string;
  coordinates: Coordinates;
  /** Etiqueta legible del tipo: "Museo", "Castillo", "Mirador"… */
  tipo: string;
  wikidata?: string;
}

export interface Recuadro {
  sur: number;
  oeste: number;
  norte: number;
  este: number;
}

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";
const LIMITE_MS = 15000;

/** Más allá de esto la consulta sería enorme y el mapa un sembrado de puntos. */
export const AREA_MAXIMA_GRADOS = 0.6;

const TIPOS: Record<string, string> = {
  museum: "Museo",
  attraction: "Atracción",
  viewpoint: "Mirador",
  artwork: "Obra de arte",
  gallery: "Galería",
  castle: "Castillo",
  monument: "Monumento",
  memorial: "Memorial",
  ruins: "Ruinas",
  archaeological_site: "Yacimiento",
  church: "Iglesia",
  monastery: "Monasterio",
  tower: "Torre",
  city_gate: "Puerta",
  aqueduct: "Acueducto",
};

interface ElementoOverpass {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/**
 * Sitios de interés de OpenStreetMap dentro del recuadro visible.
 *
 * El filtro de verdad es `["wikidata"]`: sólo entra lo que alguien consideró
 * digno de una ficha en Wikidata. Sin él, el mapa de cualquier ciudad se
 * llena de bancos, fuentes y placas conmemorativas y deja de servir para
 * nada. Es el mismo criterio de notoriedad que usa el generador de viajes.
 */
export const PoiService = {
  async enRecuadro(r: Recuadro): Promise<Poi[]> {
    const caja = `${r.sur},${r.oeste},${r.norte},${r.este}`;
    const query =
      `[out:json][timeout:20];(` +
      `nwr(${caja})["tourism"~"^(attraction|museum|viewpoint|artwork|gallery)$"]["name"]["wikidata"];` +
      `nwr(${caja})["historic"]["name"]["wikidata"];` +
      `);out center 80;`;

    const respuesta = await fetch(OVERPASS_ENDPOINT, {
      signal: AbortSignal.timeout(LIMITE_MS),
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
    });
    if (!respuesta.ok) throw new Error(`Overpass respondió ${respuesta.status}`);

    const datos: { elements?: ElementoOverpass[] } = await respuesta.json();
    const vistos = new Set<string>();
    const salida: Poi[] = [];

    for (const el of datos.elements ?? []) {
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      const nombre = el.tags?.name;
      if (lat == null || lon == null || !nombre) continue;

      // Un mismo monumento aparece a veces como nodo y como contorno; el
      // identificador de Wikidata es lo que los delata como el mismo sitio.
      const clave = el.tags?.wikidata ?? `${el.type}/${el.id}`;
      if (vistos.has(clave)) continue;
      vistos.add(clave);

      const bruto = el.tags?.tourism ?? el.tags?.historic ?? "";
      salida.push({
        id: `${el.type}/${el.id}`,
        name: nombre,
        coordinates: { latitude: lat, longitude: lon },
        tipo: TIPOS[bruto] ?? "Lugar de interés",
        wikidata: el.tags?.wikidata,
      });
    }

    return salida;
  },
};
