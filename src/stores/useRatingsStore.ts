import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createZustandStorageAdapter } from "../services/storage/StorageService";
import type { ID } from "../types";

export type TipoValorado = "stop" | "route";
export type Estrellas = 1 | 2 | 3 | 4 | 5;

export interface Valoracion {
  tipo: TipoValorado;
  targetId: ID;
  estrellas: Estrellas;
  comentario?: string;
  createdAt: string;
  updatedAt: string;
}

interface RatingsState {
  valoraciones: Record<string, Valoracion>;

  valorar: (tipo: TipoValorado, targetId: ID, estrellas: Estrellas, comentario?: string) => void;
  quitarValoracion: (tipo: TipoValorado, targetId: ID) => void;
  valoracionDe: (tipo: TipoValorado, targetId: ID) => Valoracion | undefined;
  listarPorTipo: (tipo: TipoValorado) => Valoracion[];
}

const clave = (tipo: TipoValorado, targetId: ID) => `${tipo}:${targetId}`;

/**
 * Tus puntuaciones de sitios y de rutas.
 *
 * Viven **fuera del viaje** a propósito, en su propio almacén: puntuar la ruta
 * "Madrid en 3 días" es tuyo, no del viaje de Euskadi, y si estuviera dentro
 * de un viaje desaparecería al cambiar a otro.
 *
 * La forma es la que tendría en un servidor —una fila por (usuario, tipo,
 * objeto, estrellas)—, así que cuando haya cuentas esto se sincroniza tal cual
 * y la nota media de otros usuarios se añade al lado, sin rehacer nada.
 */
export const useRatingsStore = create<RatingsState>()(
  persist(
    (set, get) => ({
      valoraciones: {},

      valorar: (tipo, targetId, estrellas, comentario) =>
        set((state) => {
          const k = clave(tipo, targetId);
          const previa = state.valoraciones[k];
          const ahora = new Date().toISOString();
          return {
            valoraciones: {
              ...state.valoraciones,
              [k]: {
                tipo,
                targetId,
                estrellas,
                comentario: comentario?.trim() || undefined,
                createdAt: previa?.createdAt ?? ahora,
                updatedAt: ahora,
              },
            },
          };
        }),

      quitarValoracion: (tipo, targetId) =>
        set((state) => {
          const valoraciones = { ...state.valoraciones };
          delete valoraciones[clave(tipo, targetId)];
          return { valoraciones };
        }),

      valoracionDe: (tipo, targetId) => get().valoraciones[clave(tipo, targetId)],

      listarPorTipo: (tipo) =>
        Object.values(get().valoraciones)
          .filter((v) => v.tipo === tipo)
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    }),
    {
      name: "ratings",
      storage: createJSONStorage(() => createZustandStorageAdapter("ratings")),
      version: 1,
    },
  ),
);
