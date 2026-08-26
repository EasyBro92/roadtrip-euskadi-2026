import { create } from "zustand";
import { AREA_MAXIMA_GRADOS, PoiService, type Poi, type Recuadro } from "../services/places/PoiService";

interface PoiState {
  /** La capa está encendida. Se apaga sola nunca: lo decides tú. */
  activa: boolean;
  pois: Poi[];
  cargando: boolean;
  error: string | null;
  /** Recuadro de la última búsqueda, para saber si te has movido lejos. */
  ultimoRecuadro: Recuadro | null;
  /** Sitio tocado, para enseñar su ficha pequeña. */
  elegido: Poi | null;

  alternar: () => void;
  buscar: (recuadro: Recuadro) => Promise<void>;
  elegir: (poi: Poi | null) => void;
}

let ultimaPeticion = 0;

/**
 * Capa de sitios de interés que no están en tu ruta.
 *
 * No se recarga sola al mover el mapa: cada arrastre sería una consulta a
 * Overpass, que lo mantienen voluntarios. Se pide una vez y luego aparece un
 * botón de "Buscar en esta zona", como hace Google Maps.
 */
export const usePoiStore = create<PoiState>()((set, get) => ({
  activa: false,
  pois: [],
  cargando: false,
  error: null,
  ultimoRecuadro: null,
  elegido: null,

  alternar: () => {
    const activa = !get().activa;
    // Al apagarla se tira lo cargado: dejarlo en memoria haría que al volver
    // a encenderla vieras sitios de donde estabas hace media hora.
    set(activa ? { activa } : { activa, pois: [], elegido: null, error: null, ultimoRecuadro: null });
  },

  buscar: async (recuadro) => {
    const alto = recuadro.norte - recuadro.sur;
    const ancho = recuadro.este - recuadro.oeste;
    if (alto > AREA_MAXIMA_GRADOS || ancho > AREA_MAXIMA_GRADOS) {
      set({ error: "Acércate un poco: la zona es demasiado grande para buscar.", pois: [], ultimoRecuadro: recuadro });
      return;
    }

    const mia = ++ultimaPeticion;
    set({ cargando: true, error: null, ultimoRecuadro: recuadro });
    try {
      const pois = await PoiService.enRecuadro(recuadro);
      if (mia !== ultimaPeticion) return;
      set({ pois, cargando: false });
    } catch (error) {
      if (mia !== ultimaPeticion) return;
      const nombre = (error as Error).name;
      set({
        pois: [],
        cargando: false,
        error:
          nombre === "TimeoutError" || nombre === "AbortError"
            ? "OpenStreetMap está tardando demasiado. Prueba otra vez."
            : "No se han podido cargar los sitios de interés.",
      });
    }
  },

  elegir: (poi) => set({ elegido: poi }),
}));
