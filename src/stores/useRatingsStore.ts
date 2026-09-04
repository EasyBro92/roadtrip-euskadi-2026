import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createZustandStorageAdapter } from "../services/storage/StorageService";
import type { ID, ISODate } from "../types";

export type TipoValorado = "stop" | "route";
export type Estrellas = 1 | 2 | 3 | 4 | 5;

/** Con quién fuiste. Cambia mucho el valor de una reseña para quien la lee. */
export const COMPANIAS = ["solo", "pareja", "familia", "amigos", "trabajo"] as const;
export type Compania = (typeof COMPANIAS)[number];

export const ETIQUETA_COMPANIA: Record<Compania, string> = {
  solo: "Solo",
  pareja: "En pareja",
  familia: "En familia",
  amigos: "Con amigos",
  trabajo: "Por trabajo",
};

export interface Valoracion {
  tipo: TipoValorado;
  targetId: ID;
  estrellas: Estrellas;
  comentario?: string;
  /** Cuándo lo visitaste, que no es lo mismo que cuándo escribes la reseña. */
  fechaVisita?: ISODate;
  compania?: Compania;
  /** "Ve temprano", "aparca en la plaza": lo que le dirías a un amigo. */
  consejo?: string;
  /** Identificadores de fotos en `PhotoService`; las imágenes no viven aquí. */
  fotos?: ID[];
  createdAt: string;
  updatedAt: string;
}

/** Lo que se puede escribir de una reseña. Las estrellas van aparte. */
export type CamposResena = Pick<Valoracion, "comentario" | "fechaVisita" | "compania" | "consejo" | "fotos">;

interface RatingsState {
  valoraciones: Record<string, Valoracion>;

  valorar: (tipo: TipoValorado, targetId: ID, estrellas: Estrellas, comentario?: string) => void;
  guardarResena: (tipo: TipoValorado, targetId: ID, estrellas: Estrellas, campos: CamposResena) => void;
  quitarValoracion: (tipo: TipoValorado, targetId: ID) => void;
  /** Sustituye todas las puntuaciones. Sólo para restaurar una copia. */
  reemplazarTodas: (valoraciones: Record<string, Valoracion>) => void;
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
                // Lo ya escrito se conserva: cambiar las estrellas desde la
                // ficha no puede llevarse por delante una reseña entera.
                ...previa,
                tipo,
                targetId,
                estrellas,
                comentario: comentario?.trim() || previa?.comentario,
                createdAt: previa?.createdAt ?? ahora,
                updatedAt: ahora,
              },
            },
          };
        }),

      /**
       * Reseña completa. A diferencia de `valorar`, esto reemplaza los campos
       * escritos por lo que venga: dejar el comentario en blanco al editar
       * significa borrarlo, no conservar el anterior.
       */
      guardarResena: (tipo, targetId, estrellas, campos) =>
        set((state) => {
          const k = clave(tipo, targetId);
          const previa = state.valoraciones[k];
          const ahora = new Date().toISOString();
          const limpiar = (t?: string) => t?.trim() || undefined;

          return {
            valoraciones: {
              ...state.valoraciones,
              [k]: {
                tipo,
                targetId,
                estrellas,
                comentario: limpiar(campos.comentario),
                fechaVisita: campos.fechaVisita || undefined,
                compania: campos.compania,
                consejo: limpiar(campos.consejo),
                fotos: campos.fotos?.length ? campos.fotos : undefined,
                createdAt: previa?.createdAt ?? ahora,
                updatedAt: ahora,
              },
            },
          };
        }),

      reemplazarTodas: (valoraciones) => set({ valoraciones }),

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
