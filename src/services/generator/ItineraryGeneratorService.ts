import type { Coordinates, StopCategory } from "../../types";
import { haversineDistanceMeters } from "../../utils/geo";
import { GeocodingService } from "../geocoding/GeocodingService";

export type Interes = "cultura" | "gastronomia" | "naturaleza" | "monumentos" | "playa" | "ocio";
export type Ritmo = "tranquilo" | "normal" | "intenso";
export type Transporte = "pie" | "publico" | "coche";

export interface SugerenciaParada {
  name: string;
  category: StopCategory;
  coordinates: Coordinates;
  dayIndex: number;
  recommendedDurationMinutes: number;
  /** Identificador en Wikidata, usado para ordenar por relevancia. */
  wikidataId?: string;
  /** En cuántos idiomas tiene artículo en Wikipedia. Cuanto más, más conocido. */
  relevancia?: number;
}

export interface PeticionItinerario {
  destino: string;
  dias: number;
  intereses: Interes[];
  ritmo: Ritmo;
  transporte: Transporte;
}

/**
 * Cada interés se traduce a etiquetas de OpenStreetMap, y a la categoría de
 * parada que usa la app.
 */
const FILTROS: Record<Interes, { osm: string; categoria: StopCategory; minutos: number }> = {
  cultura: { osm: '["tourism"~"museum|gallery"]', categoria: "cultura", minutos: 120 },
  monumentos: { osm: '["historic"~"castle|monument|memorial|ruins|city_gate"]', categoria: "historia", minutos: 60 },
  gastronomia: { osm: '["amenity"~"restaurant|cafe|bar"]', categoria: "gastronomia", minutos: 90 },
  naturaleza: { osm: '["leisure"~"park|nature_reserve"]', categoria: "naturaleza", minutos: 90 },
  playa: { osm: '["natural"="beach"]', categoria: "playa", minutos: 120 },
  ocio: { osm: '["tourism"~"viewpoint|theme_park"]', categoria: "mirador", minutos: 60 },
};

/** Cuántas paradas caben en un día según el ritmo. */
const PARADAS_POR_DIA: Record<Ritmo, number> = { tranquilo: 3, normal: 4, intenso: 6 };

/** Hasta dónde tiene sentido moverse según cómo viajes. */
const RADIO_M: Record<Transporte, number> = { pie: 2000, publico: 6000, coche: 20000 };

const OVERPASS = "https://overpass-api.de/api/interpreter";

interface ElementoOverpass {
  type: string;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/**
 * Construye la consulta de un interés.
 *
 * Dos detalles que costaron encontrarlos y sin los que esto no sirve:
 *
 * 1. `["wikidata"]` filtra por notoriedad. OpenStreetMap sabe qué hay, no qué
 *    merece la pena: de 59 museos en Madrid, los 26 con artículo en Wikipedia
 *    son los que importan. En restaurantes funciona aún mejor — deja Botín y
 *    la Chocolatería San Ginés, y descarta las franquicias.
 *
 * 2. Hay que pedir `relation` además de `node` y `way`. Sin ella se perdían
 *    doce sitios en Madrid, **incluidos el Prado, el Reina Sofía y el Thyssen**.
 */
function consultaPara(interes: Interes, centro: Coordinates, radio: number): string {
  const { osm } = FILTROS[interes];
  const cerca = `(around:${radio},${centro.latitude},${centro.longitude})`;
  const partes = ["node", "way", "relation"].map((tipo) => `${tipo}${osm}["wikidata"]["name"]${cerca};`).join("");
  return `[out:json][timeout:25];(${partes});out center 40;`;
}

async function buscarInteres(interes: Interes, centro: Coordinates, radio: number): Promise<SugerenciaParada[]> {
  const res = await fetch(OVERPASS, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(consultaPara(interes, centro, radio))}`,
  });
  if (!res.ok) throw new Error(`Overpass respondió ${res.status}`);

  const datos: { elements: ElementoOverpass[] } = await res.json();
  const { categoria, minutos } = FILTROS[interes];

  const vistos = new Set<string>();
  const encontradas: SugerenciaParada[] = [];

  for (const el of datos.elements) {
    const nombre = el.tags?.name;
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (!nombre || lat == null || lon == null) continue;
    // El mismo sitio aparece a veces como nodo y como relación.
    if (vistos.has(nombre)) continue;
    vistos.add(nombre);

    encontradas.push({
      name: nombre,
      category: categoria,
      coordinates: { latitude: lat, longitude: lon },
      dayIndex: 1,
      recommendedDurationMinutes: minutos,
      wikidataId: el.tags?.wikidata,
    });
  }
  return encontradas;
}

/**
 * Puntúa las paradas por en cuántos idiomas tienen artículo en Wikipedia.
 *
 * Sin esto, al recortar la lista mandaba el orden en que Overpass devuelve
 * las cosas, que es arbitrario: en la primera prueba con Madrid el Museo de
 * Cera le quitó el sitio al Prado. El Prado tiene artículo en 80 idiomas y el
 * de Cera en unos pocos, así que esta señal los separa bien.
 *
 * Es **una sola petición** para hasta 50 sitios, y si falla no pasa nada: se
 * sigue con el orden que hubiera.
 */
async function puntuarPorRelevancia(paradas: SugerenciaParada[]): Promise<void> {
  const ids = [...new Set(paradas.map((p) => p.wikidataId).filter((id): id is string => !!id))].slice(0, 50);
  if (ids.length === 0) return;

  try {
    const url =
      `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${ids.join("|")}` +
      `&props=sitelinks&format=json&origin=*`;
    const res = await fetch(url);
    if (!res.ok) return;

    const datos: { entities?: Record<string, { sitelinks?: Record<string, unknown> }> } = await res.json();
    const porId = new Map<string, number>();
    for (const [id, entidad] of Object.entries(datos.entities ?? {})) {
      porId.set(id, Object.keys(entidad.sitelinks ?? {}).length);
    }
    for (const parada of paradas) {
      parada.relevancia = parada.wikidataId ? (porId.get(parada.wikidataId) ?? 0) : 0;
    }
  } catch {
    // Sin puntuación se sigue adelante: peor orden, pero itinerario al fin.
  }
}

/**
 * Ordena las paradas encadenando siempre la más cercana a la anterior, para
 * que cada día quede en una zona y no cruces la ciudad de lado a lado.
 */
function encadenarPorCercania(paradas: SugerenciaParada[], desde: Coordinates): SugerenciaParada[] {
  const pendientes = [...paradas];
  const ruta: SugerenciaParada[] = [];
  let actual = desde;

  while (pendientes.length > 0) {
    let mejor = 0;
    let mejorDistancia = Infinity;
    pendientes.forEach((p, i) => {
      const d = haversineDistanceMeters(actual, p.coordinates);
      if (d < mejorDistancia) {
        mejorDistancia = d;
        mejor = i;
      }
    });
    const [elegida] = pendientes.splice(mejor, 1);
    ruta.push(elegida);
    actual = elegida.coordinates;
  }
  return ruta;
}

export const ItineraryGeneratorService = {
  /**
   * Propone un itinerario para un destino. Es un punto de partida para editar,
   * no una guía: sale de datos abiertos, que aciertan en qué hay y dónde, pero
   * no ordenan por calidad más allá de tener artículo en Wikipedia.
   */
  async generate(peticion: PeticionItinerario): Promise<{ centro: Coordinates; paradas: SugerenciaParada[] }> {
    const lugares = await GeocodingService.search(peticion.destino, { limit: 1 });
    if (lugares.length === 0) throw new Error(`No encuentro "${peticion.destino}".`);
    const centro = lugares[0].coordinates;

    const radio = RADIO_M[peticion.transporte];
    const intereses = peticion.intereses.length > 0 ? peticion.intereses : (["cultura", "monumentos"] as Interes[]);

    // En serie y no en paralelo: Overpass es un servidor donado y lanzarle
    // seis consultas a la vez es justo lo que pide no hacer.
    const candidatas: SugerenciaParada[] = [];
    for (const interes of intereses) {
      try {
        candidatas.push(...(await buscarInteres(interes, centro, radio)));
      } catch {
        // Un interés sin resultados no debe tumbar el resto del itinerario.
      }
    }
    if (candidatas.length === 0) return { centro, paradas: [] };

    await puntuarPorRelevancia(candidatas);

    const porDia = PARADAS_POR_DIA[peticion.ritmo];
    const total = Math.min(candidatas.length, porDia * peticion.dias);

    // Se reparten los intereses antes de recortar, para que un día de "cultura
    // y gastronomía" no salgan seis museos y ni un sitio donde comer. Dentro de
    // cada interés van primero los más conocidos.
    const porInteres = new Map<StopCategory, SugerenciaParada[]>();
    for (const c of candidatas) porInteres.set(c.category, [...(porInteres.get(c.category) ?? []), c]);
    for (const lista of porInteres.values()) lista.sort((a, b) => (b.relevancia ?? 0) - (a.relevancia ?? 0));

    const equilibradas: SugerenciaParada[] = [];
    let quedan = true;
    while (equilibradas.length < total && quedan) {
      quedan = false;
      for (const lista of porInteres.values()) {
        const siguiente = lista.shift();
        if (!siguiente) continue;
        quedan = true;
        equilibradas.push(siguiente);
        if (equilibradas.length >= total) break;
      }
    }

    const ordenadas = encadenarPorCercania(equilibradas, centro);
    ordenadas.forEach((parada, i) => {
      parada.dayIndex = Math.floor(i / porDia) + 1;
    });

    return { centro, paradas: ordenadas };
  },
};
