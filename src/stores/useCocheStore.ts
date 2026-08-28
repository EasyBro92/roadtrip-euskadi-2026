import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createZustandStorageAdapter } from "../services/storage/StorageService";
import type { Coordinates } from "../types";

export interface CocheAparcado {
  coordinates: Coordinates;
  /** Cuándo se aparcó, para saber si el punto sigue siendo de este rato. */
  guardadoEn: string;
  /** Planta, número de plaza, la calle… lo que ayude a encontrarlo. */
  nota?: string;
}

interface CocheState {
  coche: CocheAparcado | null;
  aparcar: (coordinates: Coordinates, nota?: string) => void;
  ponerNota: (nota: string) => void;
  olvidar: () => void;
}

/**
 * Dónde está aparcado el coche.
 *
 * Es lo primero que se pierde en un parking subterráneo de Bilbao o en una
 * calle de Donosti que se llamaba igual que las otras cuatro. Guardarlo es un
 * toque, y el punto sobrevive a cerrar la app porque para eso se guarda.
 *
 * Va en su propio almacén y no en los sitios guardados: no es un lugar que
 * quieras volver a visitar, es un dato de ahora mismo que se borra en cuanto
 * te subes al coche. Mezclarlo con las listas de sitios llenaría esas listas
 * de puntos muertos.
 */
export const useCocheStore = create<CocheState>()(
  persist(
    (set, get) => ({
      coche: null,

      aparcar: (coordinates, nota) => set({ coche: { coordinates, guardadoEn: new Date().toISOString(), nota } }),

      ponerNota: (nota) => {
        const coche = get().coche;
        if (!coche) return;
        set({ coche: { ...coche, nota: nota.trim() || undefined } });
      },

      olvidar: () => set({ coche: null }),
    }),
    {
      name: "coche",
      storage: createJSONStorage(() => createZustandStorageAdapter("coche")),
      version: 1,
    },
  ),
);
