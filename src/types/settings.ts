export type ThemeMode = "light" | "dark" | "auto";

export type MapLayerId = "classic" | "light" | "dark" | "relief" | "cycling" | "satellite";

export interface AppSettings {
  theme: ThemeMode;
  mapLayer: MapLayerId;
  categoryVisibility: Record<string, boolean>;
  arrivalRadiusMeters: number;
  locationTrackingEnabled: boolean;
  batterySaverMode: boolean;
  drivingModeEnabled: boolean;
  offlineLimitMB: number;
  language: "es";
  reducedMotion: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "light",
  // "light" (CARTO Positron): base limpia blanco/gris, visualmente la más
  // cercana a Google Maps de las capas keyless disponibles. "classic" (OSM
  // estándar) sigue disponible en el selector de capas para quien lo prefiera.
  mapLayer: "light",
  categoryVisibility: {},
  arrivalRadiusMeters: 150,
  locationTrackingEnabled: false,
  batterySaverMode: false,
  drivingModeEnabled: false,
  offlineLimitMB: 250,
  language: "es",
  reducedMotion: false,
};
