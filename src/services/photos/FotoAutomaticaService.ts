import type { Coordinates, StopCategory } from "../../types";
import { haversineDistanceMeters } from "../../utils/geo";
import { StorageService } from "../storage/StorageService";

/**
 * Una foto para un sitio que no la trae, sin que nadie tenga que buscarla.
 *
 * Las paradas del viaje de fábrica llevan su foto pegada en los datos. Las
 * del catálogo de Explorar, las del generador y las que añades tú no llevan
 * ninguna, y eran la mayoría de las tarjetas: un cuadrado de color con un
 * icono. Aquí se pregunta a Wikipedia por el artículo que se llama igual que
 * el sitio y se usa su imagen principal.
 *
 * Dos comprobaciones para no enseñar la foto de otro sitio:
 *
 *  - El artículo tiene que estar geolocalizado a menos de 40 km de la parada.
 *    "Pamplona" a secas puede ser la de Colombia y "Córdoba" la de Argentina;
 *    con la distancia, un homónimo no pasa. Un artículo sin coordenadas (una
 *    página de desambiguación, un apellido) tampoco.
 *  - La imagen no puede ser un escudo, una bandera ni un mapa, que es lo que
 *    muchos artículos de municipios llevan primero.
 *
 * Si no hay foto buena no se pone ninguna: se queda el icono de la categoría,
 * que es mejor que una foto equivocada.
 *
 * Cada sitio se pregunta una sola vez: el resultado —también el "no hay"— se
 * guarda en el móvil. La imagen en sí la guarda el service worker.
 */

export interface LugarConFoto {
  nombre: string;
  coordinates: Coordinates;
  category?: StopCategory;
}

interface Entrada {
  /** URL de la foto, o null si se buscó y no había. */
  u: string | null;
  /** Cuándo se buscó, en milisegundos. */
  t: number;
}

const CLAVE = "fotos-automaticas";
const MAX_ENTRADAS = 800;
const RADIO_MAXIMO_M = 40_000;
/** Un "no hay" caduca: los artículos ganan foto con el tiempo. */
const REINTENTAR_TRAS_MS = 30 * 24 * 60 * 60 * 1000;
const WIKIS = ["es", "en"] as const;

/** Un hotel o un aparcamiento no tienen artículo; lo que saliera sería de otra cosa. */
const SIN_FOTO_AUTOMATICA: StopCategory[] = ["hotel", "aparcamiento"];

const NO_ES_FOTO = ["bandera", "flag", "escudo", "coat_of_arms", "blason", "escut", "wappen", "stemma", "logo", "locator", "location_map", "mapa_", "_map", ".svg"];

let memoria: Record<string, Entrada> | null = null;

function cache(): Record<string, Entrada> {
  memoria ??= StorageService.get<Record<string, Entrada>>(CLAVE, {});
  return memoria;
}

function guardar(clave: string, url: string | null): void {
  const todas = cache();
  todas[clave] = { u: url, t: Date.now() };

  const claves = Object.keys(todas);
  if (claves.length > MAX_ENTRADAS) {
    // Fuera las más antiguas: son las de viajes que ya no se miran.
    claves
      .sort((a, b) => todas[a].t - todas[b].t)
      .slice(0, claves.length - MAX_ENTRADAS)
      .forEach((c) => delete todas[c]);
  }
  StorageService.set(CLAVE, todas);
}

export function claveDe(lugar: LugarConFoto): string {
  const { latitude, longitude } = lugar.coordinates;
  return `${lugar.nombre.trim().toLowerCase()}|${latitude.toFixed(2)},${longitude.toFixed(2)}`;
}

export function esFotoDeVerdad(url: string): boolean {
  const u = decodeURIComponent(url).toLowerCase();
  return !NO_ES_FOTO.some((palabra) => u.includes(palabra));
}

interface PaginaWiki {
  missing?: boolean;
  thumbnail?: { source?: string };
  coordinates?: { lat: number; lon: number }[];
}

async function preguntar(wiki: string, lugar: LugarConFoto, signal?: AbortSignal): Promise<string | null> {
  const url =
    `https://${wiki}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(lugar.nombre.trim())}` +
    "&redirects=1&prop=pageimages%7Ccoordinates&piprop=thumbnail&pithumbsize=640&format=json&formatversion=2&origin=*";
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Wikipedia respondió ${res.status}`);

  const datos = (await res.json()) as { query?: { pages?: PaginaWiki[] } };
  for (const pagina of datos.query?.pages ?? []) {
    const foto = pagina.thumbnail?.source;
    const donde = pagina.coordinates?.[0];
    if (pagina.missing || !foto || !donde) continue;
    if (!esFotoDeVerdad(foto)) continue;

    const metros = haversineDistanceMeters(lugar.coordinates, { latitude: donde.lat, longitude: donde.lon });
    if (metros <= RADIO_MAXIMO_M) return foto;
  }
  return null;
}

/** Como mucho dos preguntas a la vez: una pantalla puede pedir veinte de golpe. */
const SIMULTANEAS = 2;
let enCurso = 0;
const cola: (() => void)[] = [];
const pendientes = new Map<string, Promise<string | null>>();

function turno<T>(tarea: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const lanzar = () => {
      enCurso++;
      tarea()
        .then(resolve, reject)
        .finally(() => {
          enCurso--;
          cola.shift()?.();
        });
    };
    if (enCurso < SIMULTANEAS) lanzar();
    else cola.push(lanzar);
  });
}

export const FotoAutomaticaService = {
  /** Si este sitio puede tener foto automática. */
  aplica(lugar: LugarConFoto): boolean {
    if (lugar.nombre.trim().length < 3) return false;
    return !lugar.category || !SIN_FOTO_AUTOMATICA.includes(lugar.category);
  },

  /** Lo que ya se sabe, sin preguntar: la URL, null si no había, undefined si aún no se ha buscado. */
  conocida(lugar: LugarConFoto): string | null | undefined {
    const entrada = cache()[claveDe(lugar)];
    if (!entrada) return undefined;
    if (entrada.u === null && Date.now() - entrada.t > REINTENTAR_TRAS_MS) return undefined;
    return entrada.u;
  },

  /** Busca la foto, o devuelve la que ya se encontró. Nunca lanza: sin red devuelve null y no guarda nada. */
  buscar(lugar: LugarConFoto): Promise<string | null> {
    if (!this.aplica(lugar)) return Promise.resolve(null);

    const sabida = this.conocida(lugar);
    if (sabida !== undefined) return Promise.resolve(sabida);

    const clave = claveDe(lugar);
    const yaPedida = pendientes.get(clave);
    if (yaPedida) return yaPedida;

    const promesa = turno(async () => {
      try {
        for (const wiki of WIKIS) {
          const foto = await preguntar(wiki, lugar);
          if (foto) {
            guardar(clave, foto);
            return foto;
          }
        }
        guardar(clave, null);
        return null;
      } catch {
        // Sin conexión o Wikipedia caída: no es un "no hay", así que no se
        // apunta y se volverá a intentar la próxima vez.
        return null;
      } finally {
        pendientes.delete(clave);
      }
    });
    pendientes.set(clave, promesa);
    return promesa;
  },

  /** Sólo para las pruebas. */
  _olvidar(): void {
    memoria = null;
    pendientes.clear();
  },
};
