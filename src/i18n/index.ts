import { EN } from "./en";

/** Idiomas con traducción propia. `auto` sigue al del móvil. */
export const IDIOMAS = ["auto", "es", "en"] as const;
export type Idioma = (typeof IDIOMAS)[number];
export type IdiomaReal = Exclude<Idioma, "auto">;

export const ETIQUETA_IDIOMA: Record<Idioma, string> = {
  auto: "El del móvil",
  es: "Castellano",
  en: "English",
};

/**
 * El castellano es el original: las claves **son** el texto en castellano.
 *
 * Así traducir es opcional de verdad. Una pantalla sin traducir sale en
 * castellano en lugar de enseñar una clave rara o quedarse vacía, y se puede
 * ir traduciendo pantalla a pantalla sin dejar la app rota por el camino.
 */
const DICCIONARIOS: Record<IdiomaReal, Record<string, string>> = {
  es: {},
  en: EN,
};

/** El idioma del móvil, si lo tenemos traducido; si no, castellano. */
export function detectarIdioma(): IdiomaReal {
  const preferidos = typeof navigator !== "undefined" ? [navigator.language, ...(navigator.languages ?? [])] : [];
  for (const etiqueta of preferidos) {
    const base = etiqueta?.toLowerCase().split("-")[0];
    if (base === "en") return "en";
    if (base === "es") return "es";
  }
  return "es";
}

export function resolverIdioma(elegido: Idioma): IdiomaReal {
  return elegido === "auto" ? detectarIdioma() : elegido;
}

/**
 * Traduce, y de paso sustituye `{lo que sea}` por lo que le pases.
 *
 * Los huecos van con nombre y no por posición porque el orden de una frase
 * cambia al traducirla: "3 paradas en 2 días" no se ordena igual en todos los
 * idiomas.
 */
export function traducir(clave: string, idioma: IdiomaReal, valores?: Record<string, string | number>): string {
  const texto = DICCIONARIOS[idioma][clave] ?? clave;
  if (!valores) return texto;
  return texto.replace(/\{(\w+)\}/g, (coincidencia, nombre) => String(valores[nombre] ?? coincidencia));
}

/** Claves sin traducir en un idioma. Sirve para saber cuánto queda. */
export function clavesSinTraducir(claves: string[], idioma: IdiomaReal): string[] {
  return claves.filter((c) => !DICCIONARIOS[idioma][c]);
}
