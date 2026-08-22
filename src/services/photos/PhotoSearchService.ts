import type { Coordinates } from "../../types";

export interface PhotoCandidate {
  /** URL de la imagen a un ancho razonable para móvil. */
  url: string;
  /** Nombre del archivo en Commons, que sirve de crédito mínimo. */
  title: string;
}

/**
 * Términos que delatan una imagen que no es una foto del lugar: banderas,
 * escudos, mapas de situación y logotipos. Sin este filtro, la primera
 * "imagen de Pamplona" suele ser su escudo municipal.
 */
const BLOQUEADOS = [
  "bandera",
  "flag",
  "escudo",
  "coat_of_arms",
  "shield",
  "mapa_",
  "_map",
  "location_",
  "ubicaci",
  "situaci",
  "blason",
  "locator",
  "logo",
  "escut",
  "diagram",
];

const BASE = "https://commons.wikimedia.org/w/api.php";
const COMUN = "prop=imageinfo&iiprop=url|mime&iiurlwidth=900&format=json&origin=*";

interface PaginaCommons {
  title: string;
  imageinfo?: { thumburl?: string; url?: string; mime?: string }[];
}

function esFoto(titulo: string, mime: string | undefined): boolean {
  const t = titulo.toLowerCase();
  // Los SVG de Commons son casi siempre escudos o esquemas, no fotografías.
  if (!mime || !mime.startsWith("image/") || mime === "image/svg+xml") return false;
  return !BLOQUEADOS.some((palabra) => t.includes(palabra));
}

/**
 * Clave aproximada del "tema" de una foto, a partir de su nombre de archivo.
 * Commons guarda reportajes enteros de un mismo edificio numerados igual
 * ("040 Edifici al c. Joan Maragall...", "041 Edifici al c. Joan Maragall...").
 * Sin agrupar, la búsqueda por cercanía devolvía doce fotos del mismo portal;
 * con esto salen doce sitios distintos.
 */
function tema(titulo: string): string {
  return titulo
    .replace(/^File:/, "")
    .replace(/^[\d\s.,-]+/, "")
    .toLowerCase()
    .split(/[\s_(,-]+/)
    .slice(0, 3)
    .join(" ");
}

async function consultar(url: string, limite: number): Promise<PhotoCandidate[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Wikimedia Commons respondió ${res.status}`);

  const datos = await res.json();
  const paginas = datos?.query?.pages as Record<string, PaginaCommons> | undefined;
  if (!paginas) return [];

  const candidatas: PhotoCandidate[] = [];
  const temasVistos = new Set<string>();

  for (const pagina of Object.values(paginas)) {
    const info = pagina.imageinfo?.[0];
    const src = info?.thumburl ?? info?.url;
    if (!src || !esFoto(pagina.title, info?.mime)) continue;

    const clave = tema(pagina.title);
    if (temasVistos.has(clave)) continue;
    temasVistos.add(clave);

    candidatas.push({ url: src, title: pagina.title.replace(/^File:/, "") });
    if (candidatas.length >= limite) break;
  }
  return candidatas;
}

/**
 * Busca fotos de licencia libre en Wikimedia Commons, la misma fuente que ya
 * usan las paradas del viaje (ver scripts/fetch-place-images.mjs).
 *
 * Busca **por cercanía a las coordenadas**, no por nombre. Medido: buscar
 * "Pamplona" por texto devuelve fotos de Pamplona (Colombia); por coordenadas
 * devuelve el ayuntamiento y la Plaza Consistorial de la de Navarra. Para un
 * hotel concreto Commons no suele tener nada, pero sí fotos de su entorno,
 * que es mejor que dejar la parada sin imagen.
 */
export const PhotoSearchService = {
  /** Fotos tomadas cerca de un punto. `radio` en metros. */
  async searchNearby(coordinates: Coordinates, radio = 1500, limite = 12): Promise<PhotoCandidate[]> {
    const url =
      `${BASE}?action=query&generator=geosearch&ggscoord=${coordinates.latitude}|${coordinates.longitude}` +
      // Se piden muchas más de las que se muestran porque tras agrupar por
      // tema se descartan la mayoría: son reportajes del mismo edificio.
      `&ggsradius=${radio}&ggslimit=${Math.min(120, limite * 8)}&ggsnamespace=6&${COMUN}`;
    return consultar(url, limite);
  },

  /** Búsqueda por texto, para afinar cuando el entorno no da lo que buscas. */
  async searchByText(query: string, limite = 12): Promise<PhotoCandidate[]> {
    const texto = query.trim();
    if (texto.length < 3) return [];
    const url = `${BASE}?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(texto)}&gsrlimit=${limite * 3}&${COMUN}`;
    return consultar(url, limite);
  },
};
