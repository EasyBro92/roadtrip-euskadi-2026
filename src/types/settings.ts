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
}

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
  language: "auto",
  reducedMotion: false,
};
