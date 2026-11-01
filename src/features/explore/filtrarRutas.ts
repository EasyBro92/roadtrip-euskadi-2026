import type { Coordinates, RouteTag, RouteTemplate, RouteTipo } from "../../types";
import { haversineDistanceMeters } from "../../utils/geo";

export type FiltroDuracion = "todas" | "1" | "2-3" | "4-5" | "6+";
export type Orden = "recomendadas" | "cortas" | "largas" | "cerca";

export interface FiltrosExplorar {
  texto: string;
  tipo: RouteTipo | "todas";
  duracion: FiltroDuracion;
  tema: RouteTag | "todos";
  pais: string | "todos";
  orden: Orden;
}

export const FILTROS_VACIOS: FiltrosExplorar = { texto: "", tipo: "todas", duracion: "todas", tema: "todos", pais: "todos", orden: "recomendadas" };

export const ETIQUETA_TEMA: Record<RouteTag, string> = {
  costa: "Costa",
  montaña: "Montaña",
  pueblos: "Pueblos",
  naturaleza: "Naturaleza",
  cultura: "Cultura",
  gastronomia: "Gastronomía",
  vino: "Vino",
  castillos: "Castillos",
};

export const ETIQUETA_TIPO: Record<RouteTipo, string> = {
  roadtrip: "Road trip",
  escapada: "Escapada de 1 día",
  ciudad: "Ciudad",
};

/** Sin tildes ni mayúsculas: "cadaques" tiene que encontrar "Cadaqués". */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

/** Kilómetros en línea recta sumando parada a parada. Por carretera siempre son más. */
export function kmDeRuta(ruta: RouteTemplate): number {
  const ordenadas = [...ruta.stops].sort((a, b) => a.dayIndex - b.dayIndex);
  let metros = 0;
  for (let i = 1; i < ordenadas.length; i++) metros += haversineDistanceMeters(ordenadas[i - 1].coordinates, ordenadas[i].coordinates);
  return Math.round(metros / 1000);
}

/** Distancia desde un punto hasta la primera parada de la ruta, en km. */
export function kmHastaRuta(ruta: RouteTemplate, desde: Coordinates): number {
  const primera = ruta.stops.find((s) => s.dayIndex === 1) ?? ruta.stops[0];
  return primera ? haversineDistanceMeters(desde, primera.coordinates) / 1000 : Number.POSITIVE_INFINITY;
}

function cumpleDuracion(dias: number, filtro: FiltroDuracion): boolean {
  switch (filtro) {
    case "todas":
      return true;
    case "1":
      return dias === 1;
    case "2-3":
      return dias >= 2 && dias <= 3;
    case "4-5":
      return dias >= 4 && dias <= 5;
    case "6+":
      return dias >= 6;
  }
}

/**
 * Filtra y ordena el catálogo. La búsqueda mira el nombre, la región, el país
 * y las paradas: buscar "Cadaqués" encuentra la Costa Brava aunque no lo diga
 * en el título.
 */
export function filtrarRutas(rutas: RouteTemplate[], f: FiltrosExplorar, ubicacion?: Coordinates | null): RouteTemplate[] {
  const consulta = normalizar(f.texto);
  const palabras = consulta ? consulta.split(/\s+/) : [];

  const filtradas = rutas.filter((r) => {
    if (f.tipo !== "todas" && (r.tipo ?? "roadtrip") !== f.tipo) return false;
    if (!cumpleDuracion(r.dayCount, f.duracion)) return false;
    if (f.tema !== "todos" && !(r.tags ?? []).includes(f.tema)) return false;
    if (f.pais !== "todos" && r.country !== f.pais) return false;
    if (palabras.length > 0) {
      const pajar = normalizar([r.name, r.region, r.country ?? "", r.summary, ...r.stops.map((s) => s.name)].join(" "));
      if (!palabras.every((p) => pajar.includes(p))) return false;
    }
    return true;
  });

  switch (f.orden) {
    case "cortas":
      return filtradas.sort((a, b) => a.dayCount - b.dayCount || kmDeRuta(a) - kmDeRuta(b));
    case "largas":
      return filtradas.sort((a, b) => b.dayCount - a.dayCount || kmDeRuta(b) - kmDeRuta(a));
    case "cerca":
      return ubicacion ? filtradas.sort((a, b) => kmHastaRuta(a, ubicacion) - kmHastaRuta(b, ubicacion)) : filtradas;
    default:
      return filtradas;
  }
}

/** Países que aparecen en el catálogo, España primero y el resto por orden alfabético. */
export function paisesDe(rutas: RouteTemplate[]): string[] {
  const paises = Array.from(new Set(rutas.map((r) => r.country).filter((p): p is string => Boolean(p))));
  return paises.sort((a, b) => (a === "España" ? -1 : b === "España" ? 1 : a.localeCompare(b, "es")));
}
