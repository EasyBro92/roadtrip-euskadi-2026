import type { CSSProperties } from "react";
import type { StopCategory } from "../types";

/**
 * Gradiente por categoría usado como placeholder visual cuando no hay una
 * fotografía real subida por el usuario. No se usan fotos de stock
 * inventadas ni enlaces a imágenes de terceros no verificadas.
 */
const GRADIENTS: Record<StopCategory, string> = {
  naturaleza: "linear-gradient(135deg,#0d9488,#14b8a6)",
  paisaje: "linear-gradient(135deg,#0d9488,#22c55e)",
  fotografia: "linear-gradient(135deg,#0F6FFF,#0B4FCC)",
  mirador: "linear-gradient(135deg,#0F6FFF,#38bdf8)",
  gastronomia: "linear-gradient(135deg,#f97316,#ea580c)",
  hotel: "linear-gradient(135deg,#ec4899,#db2777)",
  estadio: "linear-gradient(135deg,#15803d,#166534)",
  cultura: "linear-gradient(135deg,#7c3aed,#6d28d9)",
  pueblo: "linear-gradient(135deg,#14b8a6,#0d9488)",
  historia: "linear-gradient(135deg,#7c3aed,#a855f7)",
  aparcamiento: "linear-gradient(135deg,#6b7280,#9ca3af)",
  playa: "linear-gradient(135deg,#0ea5e9,#0284c7)",
  castillo: "linear-gradient(135deg,#7c3aed,#4c1d95)",
};

export function categoryGradient(category: StopCategory): string {
  return GRADIENTS[category] ?? "linear-gradient(135deg,#0F6FFF,#0B4FCC)";
}

/**
 * Estilo de fondo para una miniatura: foto real si existe, degradado de
 * categoría si no. La URL va entre comillas porque las de Wikimedia llevan
 * query string (`?utm_source=…&utm_campaign=…`) y sin comillas el token
 * `url()` de CSS es frágil con esos caracteres.
 */
export function thumbStyle(heroImage: string | undefined, category: StopCategory): CSSProperties {
  if (heroImage) {
    return {
      backgroundImage: `url("${heroImage}"), ${categoryGradient(category)}`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }
  return { background: categoryGradient(category) };
}
