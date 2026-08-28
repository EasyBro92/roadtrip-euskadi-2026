import type { ExpenseCategory } from "../../types";

/**
 * Las categorías de gasto, en el orden en que se usan viajando.
 *
 * El identificador es lo que se guarda; la etiqueta es lo que se lee. Antes se
 * pintaba el identificador tal cual y en la pantalla salía "gastronomia" sin
 * tilde y en minúscula.
 */
export const CATEGORIAS_GASTO: { id: ExpenseCategory; etiqueta: string; corta: string; color: string }[] = [
  { id: "restaurante", etiqueta: "Restaurante", corta: "Comer", color: "#F97316" },
  { id: "combustible", etiqueta: "Combustible", corta: "Gasoil", color: "#0F6FFF" },
  { id: "hotel", etiqueta: "Alojamiento", corta: "Dormir", color: "#EC4899" },
  { id: "entrada", etiqueta: "Entradas", corta: "Entradas", color: "#14B8A6" },
  { id: "aparcamiento", etiqueta: "Aparcamiento", corta: "Parking", color: "#9CA3AF" },
  { id: "peaje", etiqueta: "Peajes", corta: "Peaje", color: "#7C3AED" },
  { id: "compra", etiqueta: "Compras", corta: "Compras", color: "#EAB308" },
  { id: "otros", etiqueta: "Otros", corta: "Otros", color: "#6B7280" },
];

const POR_ID = new Map(CATEGORIAS_GASTO.map((c) => [c.id, c]));

export function etiquetaCategoria(id: ExpenseCategory): string {
  return POR_ID.get(id)?.etiqueta ?? id;
}

export function colorCategoria(id: ExpenseCategory): string {
  return POR_ID.get(id)?.color ?? "#6B7280";
}
