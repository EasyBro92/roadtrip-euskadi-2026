import type { Coordinates } from "../../types";

/** Tesela del esquema de Google/OSM: z/x/y. */
export interface Tesela {
  z: number;
  x: number;
  y: number;
}

/**
 * Zooms que se comprueban.
 *
 * 11 es "la provincia entera de un vistazo" y 14 es "la calle donde aparcas".
 * Entre medias está lo que de verdad miras conduciendo. Comprobar más niveles
 * multiplicaría las teselas sin decir nada nuevo.
 */
export const ZOOMS_COMPROBADOS = [11, 12, 13, 14];

/** Coordenada -> tesela que la contiene, en la proyección Web Mercator. */
export function teselaDe(coordenadas: Coordinates, z: number): Tesela {
  const lat = Math.max(-85.05112878, Math.min(85.05112878, coordenadas.latitude));
  const n = 2 ** z;
  const x = Math.floor(((coordenadas.longitude + 180) / 360) * n);
  const radianes = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(radianes) + 1 / Math.cos(radianes)) / Math.PI) / 2) * n);
  return { z, x: Math.min(n - 1, Math.max(0, x)), y: Math.min(n - 1, Math.max(0, y)) };
}

/**
 * Teselas que hacen falta para ver un recorrido, con un margen alrededor.
 *
 * Se toman las de cada punto y sus vecinas: cuando vas por la carretera la
 * pantalla enseña más que el punto exacto donde estás. Entre dos paradas
 * lejanas se interpolan puntos intermedios, porque si no la comprobación
 * diría que el trayecto está cubierto por tener las dos puntas.
 */
export function teselasDeRuta(puntos: Coordinates[], z: number, margen = 1): Tesela[] {
  if (puntos.length === 0) return [];

  const densos: Coordinates[] = [];
  for (let i = 0; i < puntos.length; i++) {
    densos.push(puntos[i]);
    const siguiente = puntos[i + 1];
    if (!siguiente) continue;

    // Un paso cada ~0,02 grados (unos 2 km) basta para no dejar huecos.
    const saltos = Math.min(
      200,
      Math.ceil(Math.max(Math.abs(siguiente.latitude - puntos[i].latitude), Math.abs(siguiente.longitude - puntos[i].longitude)) / 0.02),
    );
    for (let s = 1; s < saltos; s++) {
      const t = s / saltos;
      densos.push({
        latitude: puntos[i].latitude + (siguiente.latitude - puntos[i].latitude) * t,
        longitude: puntos[i].longitude + (siguiente.longitude - puntos[i].longitude) * t,
      });
    }
  }

  const n = 2 ** z;
  const vistas = new Set<string>();
  const salida: Tesela[] = [];

  for (const punto of densos) {
    const centro = teselaDe(punto, z);
    for (let dx = -margen; dx <= margen; dx++) {
      for (let dy = -margen; dy <= margen; dy++) {
        const x = centro.x + dx;
        const y = centro.y + dy;
        if (x < 0 || y < 0 || x >= n || y >= n) continue;
        const clave = `${z}/${x}/${y}`;
        if (vistas.has(clave)) continue;
        vistas.add(clave);
        salida.push({ z, x, y });
      }
    }
  }

  return salida;
}

/** Rellena la plantilla de un proveedor: {z}/{x}/{y}, {s} y {r}. */
export function urlDeTesela(plantilla: string, t: Tesela, subdominio = "a"): string {
  return plantilla
    .replace("{s}", subdominio)
    .replace("{z}", String(t.z))
    .replace("{x}", String(t.x))
    .replace("{y}", String(t.y))
    .replace("{r}", "");
}

export interface Cobertura {
  total: number;
  enCache: number;
  /** 0 a 100. */
  porcentaje: number;
  /**
   * No existe la caché de teselas: la app no se está ejecutando como app
   * instalada. En desarrollo el service worker va desactivado, y ahí un 0%
   * no significa "no tienes mapa" sino "aquí no hay dónde mirarlo".
   */
  sinCache: boolean;
}

/**
 * Cuánto de un recorrido se puede ver sin conexión, mirando lo que el Service
 * Worker ya guardó.
 *
 * No descarga nada: sólo pregunta a la caché. Bajarse teselas en bloque va
 * contra la política de uso de OpenStreetMap y de CARTO, así que la app no lo
 * hace; lo que puede es decirte con honestidad qué tienes y qué no.
 */
export async function medirCobertura(puntos: Coordinates[], plantilla: string): Promise<Cobertura> {
  // `caches.open` la crearía vacía, así que primero hay que preguntar si existe.
  if (!("caches" in globalThis) || !(await caches.has("map-tiles-cache"))) {
    return { total: 0, enCache: 0, porcentaje: 0, sinCache: true };
  }

  const cache = await caches.open("map-tiles-cache");
  let total = 0;
  let enCache = 0;

  for (const z of ZOOMS_COMPROBADOS) {
    for (const tesela of teselasDeRuta(puntos, z)) {
      total++;
      // Los proveedores reparten por subdominios; vale con que esté en uno.
      const encontrada = await Promise.all(
        ["a", "b", "c"].map((s) => cache.match(urlDeTesela(plantilla, tesela, s), { ignoreVary: true })),
      );
      if (encontrada.some(Boolean)) enCache++;
    }
  }

  return { total, enCache, porcentaje: total === 0 ? 0 : Math.round((enCache / total) * 100), sinCache: false };
}
