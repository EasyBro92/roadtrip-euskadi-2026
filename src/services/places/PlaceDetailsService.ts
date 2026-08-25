import type { Coordinates } from "../../types";
import { esperarTurnoNominatim } from "../geocoding/nominatimGate";
import { db } from "../storage/db";

/**
 * Datos prácticos de un sitio, tal y como los publica OpenStreetMap.
 *
 * Todos los campos son opcionales porque OpenStreetMap está incompleto por
 * naturaleza: el Guggenheim tiene horario, teléfono y web; el mirador del
 * pueblo de al lado puede no tener nada. `encontrado: false` significa que ya
 * preguntamos y no había nada, para no volver a preguntar cada vez que abras
 * la ficha.
 */
export interface PlaceDetails {
  id: string;
  encontrado: boolean;
  horario?: string;
  telefono?: string;
  web?: string;
  /** "si" | "no": si cobran entrada. Separado de `precio`, que es el importe. */
  entradaDePago?: "si" | "no";
  precio?: string;
  accesible?: string;
  cocina?: string;
  consultadoEn: string;
}

/**
 * Se usa Nominatim y no Overpass a propósito.
 *
 * Overpass da las mismas etiquetas, pero lo mantienen voluntarios con recursos
 * justos: probándolo devolvía 504 y tardaba más de 12 segundos, y ya me bloqueó
 * una vez por lanzarle ráfagas. Nominatim responde la misma información en
 * medio segundo a través de `extratags`, y es lo que la app ya usa para buscar
 * sitios. Para algo que se pide al abrir una ficha, la diferencia importa.
 */
const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";

/** Un dato de horario o teléfono no cambia a menudo; un mes es de sobra. */
const CADUCIDAD_MS = 30 * 24 * 60 * 60 * 1000;

/** ~0,005 grados son unos 500 m: el edificio y su entorno, no el barrio entero. */
const RADIO_GRADOS = 0.005;

/** Consultas en vuelo, para que abrir dos veces la misma ficha no pida dos veces. */
const enVuelo = new Map<string, Promise<PlaceDetails>>();

/** Clave estable: coordenada redondeada a ~11 m más el nombre. */
function claveDe(coordenadas: Coordinates, nombre: string): string {
  const lat = coordenadas.latitude.toFixed(4);
  const lon = coordenadas.longitude.toFixed(4);
  return `${lat},${lon}:${nombre.toLowerCase().trim()}`;
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // acentos, que NFD acaba de separar
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Cuánto se parecen dos nombres, por palabras compartidas. La búsqueda acotada
 * devuelve varios candidatos y hay que elegir: cerca del Guggenheim hay una
 * cafetería, un puente y una escultura, y sólo uno es el museo.
 */
export function parecido(buscado: string, candidato: string): number {
  const a = new Set(normalizar(buscado).split(" ").filter((p) => p.length > 2));
  const b = new Set(normalizar(candidato).split(" ").filter((p) => p.length > 2));
  if (a.size === 0 || b.size === 0) return 0;
  let comunes = 0;
  for (const palabra of a) if (b.has(palabra)) comunes++;
  return comunes / Math.max(a.size, b.size);
}

interface ResultadoNominatim {
  name?: string;
  display_name?: string;
  extratags?: Record<string, string> | null;
}

function extraer(tags: Record<string, string>, consultadoEn: string, id: string): PlaceDetails {
  const primero = (...claves: string[]) => {
    for (const clave of claves) {
      const valor = tags[clave]?.trim();
      if (valor) return valor;
    }
    return undefined;
  };

  const fee = primero("fee");
  return {
    id,
    encontrado: true,
    horario: primero("opening_hours"),
    telefono: primero("phone", "contact:phone", "contact:mobile"),
    web: primero("website", "contact:website", "url"),
    entradaDePago: fee === "yes" ? "si" : fee === "no" ? "no" : undefined,
    precio: primero("charge", "fee:amount"),
    accesible: primero("wheelchair"),
    cocina: primero("cuisine")?.replace(/;/g, ", "),
    consultadoEn,
  };
}

async function consultar(coordenadas: Coordinates, nombre: string, id: string): Promise<PlaceDetails> {
  const consultadoEn = new Date().toISOString();
  const vacio: PlaceDetails = { id, encontrado: false, consultadoEn };

  const { latitude: lat, longitude: lon } = coordenadas;
  // El recuadro va de izquierda-arriba a derecha-abajo, que es el orden que
  // espera Nominatim. `bounded=1` obliga a no salirse de él.
  const caja = `${lon - RADIO_GRADOS},${lat + RADIO_GRADOS},${lon + RADIO_GRADOS},${lat - RADIO_GRADOS}`;
  const url =
    `${NOMINATIM_ENDPOINT}?q=${encodeURIComponent(nombre)}` +
    `&format=jsonv2&extratags=1&limit=5&viewbox=${caja}&bounded=1`;

  await esperarTurnoNominatim();
  const respuesta = await fetch(url);
  if (!respuesta.ok) throw new Error(`Nominatim respondió ${respuesta.status}`);

  const resultados: ResultadoNominatim[] = await respuesta.json();

  let mejor: Record<string, string> | null = null;
  let mejorNota = 0;
  for (const r of resultados) {
    const etiquetas = r.extratags;
    if (!etiquetas) continue;
    const suNombre = r.name || r.display_name?.split(",")[0] || "";
    const nota = parecido(nombre, suNombre);
    if (nota > mejorNota) {
      mejorNota = nota;
      mejor = etiquetas;
    }
  }

  // Por debajo de la mitad de las palabras en común preferimos no dar nada:
  // enseñar el horario del bar de enfrente sería peor que no enseñar nada.
  if (!mejor || mejorNota < 0.5) return vacio;

  const detalles = extraer(mejor, consultadoEn, id);
  const tieneAlgo =
    detalles.horario || detalles.telefono || detalles.web || detalles.precio || detalles.entradaDePago || detalles.cocina;
  return tieneAlgo ? detalles : vacio;
}

export const PlaceDetailsService = {
  /** Lo que haya en caché, sin salir a la red. Para pintar sin parpadeo. */
  async enCache(coordenadas: Coordinates, nombre: string): Promise<PlaceDetails | undefined> {
    const id = claveDe(coordenadas, nombre);
    const guardado = await db.placeDetails.get(id);
    if (!guardado) return undefined;
    if (Date.now() - new Date(guardado.consultadoEn).getTime() > CADUCIDAD_MS) return undefined;
    return guardado;
  },

  /**
   * Datos prácticos del sitio. Usa la caché si la hay y, si no, pregunta a
   * OpenStreetMap una sola vez y guarda el resultado — incluido el "aquí no
   * hay nada", que también es una respuesta que merece la pena recordar.
   */
  async obtener(coordenadas: Coordinates, nombre: string): Promise<PlaceDetails> {
    const id = claveDe(coordenadas, nombre);

    const guardado = await this.enCache(coordenadas, nombre);
    if (guardado) return guardado;

    const yaEnVuelo = enVuelo.get(id);
    if (yaEnVuelo) return yaEnVuelo;

    const promesa = consultar(coordenadas, nombre, id)
      .then(async (detalles) => {
        await db.placeDetails.put(detalles);
        return detalles;
      })
      .finally(() => enVuelo.delete(id));

    enVuelo.set(id, promesa);
    return promesa;
  },
};
