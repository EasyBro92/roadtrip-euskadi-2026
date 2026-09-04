import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createZustandStorageAdapter } from "../services/storage/StorageService";
import type { Coordinates, ID, StopCategory } from "../types";
import { generateId } from "../utils/id";

export interface Lista {
  id: ID;
  nombre: string;
  createdAt: string;
}

export interface LugarGuardado {
  id: ID;
  listaId: ID;
  nombre: string;
  coordinates: Coordinates;
  categoria?: StopCategory;
  nota?: string;
  addedAt: string;
}

interface SavedPlacesState {
  listas: Lista[];
  lugares: LugarGuardado[];

  /** Sustituye listas y sitios. Sólo para restaurar una copia. */
  reemplazarTodo: (listas: Lista[], lugares: LugarGuardado[]) => void;

  crearLista: (nombre: string) => ID;
  renombrarLista: (id: ID, nombre: string) => void;
  borrarLista: (id: ID) => void;

  guardar: (lugar: Omit<LugarGuardado, "id" | "addedAt" | "listaId">, listaId?: ID) => ID;
  quitar: (id: ID) => void;
  moverA: (id: ID, listaId: ID) => void;
  ponerNota: (id: ID, nota: string) => void;

  lugaresDe: (listaId: ID) => LugarGuardado[];
  estaGuardado: (nombre: string, coordinates: Coordinates) => boolean;
  listaPorDefecto: () => Lista;
}

const NOMBRE_POR_DEFECTO = "Quiero ir";

/** Mismo sitio con nombre igual y a menos de ~11 m: no se guarda dos veces. */
function esElMismo(a: { nombre: string; coordinates: Coordinates }, b: LugarGuardado): boolean {
  return (
    a.nombre.trim().toLowerCase() === b.nombre.trim().toLowerCase() &&
    a.coordinates.latitude.toFixed(4) === b.coordinates.latitude.toFixed(4) &&
    a.coordinates.longitude.toFixed(4) === b.coordinates.longitude.toFixed(4)
  );
}

/**
 * Sitios que quieres visitar algún día, en listas con el nombre que tú pongas.
 *
 * Viven **fuera del viaje**, igual que las puntuaciones: guardar "quiero ir a
 * Lisboa" no es del viaje de Euskadi, y dentro de uno desaparecería al cambiar
 * a otro. Esto es distinto de los favoritos, que sí son marcas rápidas sobre
 * paradas que ya están en un viaje.
 *
 * Un lugar guardado lleva su nombre y sus coordenadas, no una referencia a una
 * parada: lo que guardas puede venir de una búsqueda o de un catálogo y no
 * existir como parada en ninguna parte.
 */
export const useSavedPlacesStore = create<SavedPlacesState>()(
  persist(
    (set, get) => ({
      listas: [],
      lugares: [],

      reemplazarTodo: (listas, lugares) => set({ listas, lugares }),

      crearLista: (nombre) => {
        const id = generateId();
        set((s) => ({
          listas: [...s.listas, { id, nombre: nombre.trim() || NOMBRE_POR_DEFECTO, createdAt: new Date().toISOString() }],
        }));
        return id;
      },

      renombrarLista: (id, nombre) =>
        set((s) => ({
          // Un nombre en blanco no se acepta: dejaría una lista sin identificar.
          listas: s.listas.map((l) => (l.id === id && nombre.trim() ? { ...l, nombre: nombre.trim() } : l)),
        })),

      borrarLista: (id) =>
        set((s) => ({
          listas: s.listas.filter((l) => l.id !== id),
          // Los sitios de la lista se van con ella; dejarlos huérfanos sería
          // guardar cosas que ya no se pueden ver desde ningún sitio.
          lugares: s.lugares.filter((p) => p.listaId !== id),
        })),

      guardar: (lugar, listaId) => {
        const destino = listaId ?? get().listaPorDefecto().id;
        const existente = get().lugares.find((p) => p.listaId === destino && esElMismo(lugar, p));
        if (existente) return existente.id;

        const id = generateId();
        set((s) => ({
          lugares: [...s.lugares, { ...lugar, id, listaId: destino, addedAt: new Date().toISOString() }],
        }));
        return id;
      },

      quitar: (id) => set((s) => ({ lugares: s.lugares.filter((p) => p.id !== id) })),

      moverA: (id, listaId) => set((s) => ({ lugares: s.lugares.map((p) => (p.id === id ? { ...p, listaId } : p)) })),

      ponerNota: (id, nota) =>
        set((s) => ({ lugares: s.lugares.map((p) => (p.id === id ? { ...p, nota: nota.trim() || undefined } : p)) })),

      lugaresDe: (listaId) =>
        get()
          .lugares.filter((p) => p.listaId === listaId)
          .sort((a, b) => b.addedAt.localeCompare(a.addedAt)),

      estaGuardado: (nombre, coordinates) => get().lugares.some((p) => esElMismo({ nombre, coordinates }, p)),

      /**
       * La lista donde caen las cosas si no eliges ninguna. Se crea sola la
       * primera vez: obligar a inventarse un nombre antes de poder guardar
       * nada convierte un gesto de un toque en un formulario.
       */
      listaPorDefecto: () => {
        const existente = get().listas[0];
        if (existente) return existente;

        const lista: Lista = { id: generateId(), nombre: NOMBRE_POR_DEFECTO, createdAt: new Date().toISOString() };
        set((s) => ({ listas: [...s.listas, lista] }));
        return lista;
      },
    }),
    {
      name: "saved-places",
      storage: createJSONStorage(() => createZustandStorageAdapter("saved-places")),
      version: 1,
    },
  ),
);
