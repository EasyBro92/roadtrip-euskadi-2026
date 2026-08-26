import { create } from "zustand";
import { NearbyService, olvidarCercanos, type NearbyCategory, type NearbyPlace } from "../services/places/NearbyService";
import type { Coordinates } from "../types";

interface NearbyState {
  /** Categoría que se está mostrando, o `null` si no hay búsqueda activa. */
  categoria: NearbyCategory | null;
  resultados: NearbyPlace[];
  centro: Coordinates | null;
  cargando: boolean;
  error: string | null;
  /** Resultado que has tocado en la lista, para resaltarlo en el mapa. */
  resaltado: string | null;

  buscar: (centro: Coordinates, categoria: NearbyCategory, reintentar?: boolean) => Promise<void>;
  resaltar: (id: string | null) => void;
  limpiar: () => void;
}

/**
 * Contador de peticiones, para descartar las que llegan tarde.
 *
 * Sin esto: tocas Restaurantes, tarda; tocas Farmacias, responde rápido; y
 * cuando por fin llega la de restaurantes machaca la lista, dejando bares
 * bajo el rótulo de "Farmacias". Pasó de verdad al probarlo.
 */
let ultimaPeticion = 0;

/**
 * Lo que hay alrededor ahora mismo.
 *
 * Vive fuera del viaje y no se guarda: son resultados de "qué tengo cerca en
 * este momento", no parte de tu itinerario. Está en un almacén y no en el
 * estado de un componente porque lo leen dos sitios a la vez — el panel con la
 * lista y los marcadores del mapa.
 */
export const useNearbyStore = create<NearbyState>()((set) => ({
  categoria: null,
  resultados: [],
  centro: null,
  cargando: false,
  error: null,
  resaltado: null,

  buscar: async (centro, categoria, reintentar = false) => {
    // Reintentar tras un fallo tiene que saltarse la caché; si no, el botón
    // devolvería el mismo error sin llegar a preguntar de nuevo.
    if (reintentar) olvidarCercanos();

    const mia = ++ultimaPeticion;
    set({ categoria, cargando: true, error: null, centro, resaltado: null });
    try {
      const resultados = await NearbyService.search(centro, categoria);
      if (mia !== ultimaPeticion) return;
      set({ resultados, cargando: false });
    } catch (error) {
      if (mia !== ultimaPeticion) return;
      const nombre = (error as Error).name;
      set({
        resultados: [],
        cargando: false,
        // Distinguimos "tardó demasiado" de "falló": lo primero se arregla
        // reintentando y lo segundo casi nunca.
        error:
          nombre === "TimeoutError" || nombre === "AbortError"
            ? "OpenStreetMap está tardando demasiado. Inténtalo otra vez."
            : "No se ha podido consultar OpenStreetMap.",
      });
    }
  },

  resaltar: (id) => set({ resaltado: id }),
  limpiar: () => set({ categoria: null, resultados: [], error: null, resaltado: null }),
}));
