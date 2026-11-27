import { create } from "zustand";
import type { Coordinates, StopCategory } from "../types";

/** De dónde sale el sitio que se está mirando: cambia el pin que se dibuja. */
export type OrigenLugar = "busqueda" | "cerca" | "interes" | "mapa";

export interface LugarElegido {
  id: string;
  nombre: string;
  /** "Restaurante", "Castillo", "Gipuzkoa, España"… lo que se lee bajo el nombre. */
  tipo: string;
  categoria: StopCategory;
  coordinates: Coordinates;
  origen: OrigenLugar;
  /** Tipo de cocina, precio y demás chips que haya. */
  chips?: string[];
}

interface LugarState {
  lugar: LugarElegido | null;
  elegir: (lugar: LugarElegido | null) => void;
}

/**
 * El sitio que tienes abierto en el mapa, venga de donde venga.
 *
 * Antes había tres fichas distintas: la de los sitios de interés, la lista de
 * "qué hay cerca" y el buscador, que ni siquiera tenía ficha y añadía el sitio
 * al día directamente. Ahora los tres abren la misma, con los mismos botones,
 * como en Google Maps: toques donde toques, ves qué es antes de decidir.
 */
export const useLugarStore = create<LugarState>()((set) => ({
  lugar: null,
  elegir: (lugar) => set({ lugar }),
}));
