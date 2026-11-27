export type ThemeMode = "light" | "dark" | "auto";

export type MapLayerId = "roads" | "classic" | "light" | "dark" | "relief" | "cycling" | "satellite";

export interface AppSettings {
  theme: ThemeMode;
  mapLayer: MapLayerId;
  categoryVisibility: Record<string, boolean>;
  arrivalRadiusMeters: number;
  locationTrackingEnabled: boolean;
  batterySaverMode: boolean;
  drivingModeEnabled: boolean;
  offlineLimitMB: number;
  /** "auto" sigue al idioma del móvil. Ver src/i18n. */
  language: "auto" | "es" | "en";
  reducedMotion: boolean;
  /**
   * Capas extra del mapa. Opcionales a propósito: los ajustes ya guardados no
   * las traen, y al leerlas se usa `?? CAPAS_POR_DEFECTO` en vez de migrar.
   */
  capasMapa?: CapasMapa;
  /** Pedir rutas sin peajes cuando el proveedor lo permite. */
  evitarPeajes?: boolean;
  /** Ya se ha enseñado la pista de "mantén pulsado el mapa". */
  pistaMapaVista?: boolean;
}

export interface CapasMapa {
  fotos: boolean;
  gastos: boolean;
  guardados: boolean;
}

export const CAPAS_POR_DEFECTO: CapasMapa = { fotos: true, gastos: false, guardados: true };

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "light",
  // "light" (CARTO Positron): base limpia blanco/gris, visualmente la más
  // cercana a Google Maps de las capas keyless disponibles. "classic" (OSM
  // estándar) sigue disponible en el selector de capas para quien lo prefiera.
  mapLayer: "roads",
  categoryVisibility: {},
  arrivalRadiusMeters: 150,
  locationTrackingEnabled: false,
  batterySaverMode: false,
  drivingModeEnabled: false,
  offlineLimitMB: 250,
  language: "es",
  reducedMotion: false,
};
