import type { Coordinates } from "../../types";

export interface LocationSample {
  coordinates: Coordinates;
  accuracyMeters: number;
  timestamp: number;
}

export type LocationErrorReason = "denied" | "unavailable" | "timeout" | "unsupported";

export class LocationServiceError extends Error {
  reason: LocationErrorReason;

  constructor(reason: LocationErrorReason, message: string) {
    super(message);
    this.name = "LocationServiceError";
    this.reason = reason;
  }
}

function mapGeolocationError(error: GeolocationPositionError): LocationServiceError {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return new LocationServiceError("denied", "Permiso de ubicación denegado por el usuario.");
    case error.POSITION_UNAVAILABLE:
      return new LocationServiceError("unavailable", "Posición no disponible en este momento.");
    case error.TIMEOUT:
      return new LocationServiceError("timeout", "Tiempo de espera agotado obteniendo la ubicación.");
    default:
      return new LocationServiceError("unavailable", "Error desconocido de geolocalización.");
  }
}

/**
 * Envoltorio sobre la Geolocation API nativa. Nunca activa seguimiento sin
 * que el usuario pulse explícitamente un botón (sección 34 y 47).
 */
export const LocationService = {
  isSupported(): boolean {
    return "geolocation" in navigator;
  },

  async getCurrentPosition(options?: PositionOptions): Promise<LocationSample> {
    if (!this.isSupported()) throw new LocationServiceError("unsupported", "Este navegador no soporta geolocalización.");

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            coordinates: { latitude: position.coords.latitude, longitude: position.coords.longitude },
            accuracyMeters: position.coords.accuracy,
            timestamp: position.timestamp,
          }),
        (error) => reject(mapGeolocationError(error)),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000, ...options },
      );
    });
  },

  /** Devuelve una función de cancelación (`clearWatch`). Modo ahorro de batería usa `enableHighAccuracy: false`. */
  watchPosition(onUpdate: (sample: LocationSample) => void, onError: (error: LocationServiceError) => void, batterySaver = false): () => void {
    if (!this.isSupported()) {
      onError(new LocationServiceError("unsupported", "Este navegador no soporta geolocalización."));
      return () => {};
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) =>
        onUpdate({
          coordinates: { latitude: position.coords.latitude, longitude: position.coords.longitude },
          accuracyMeters: position.coords.accuracy,
          timestamp: position.timestamp,
        }),
      (error) => onError(mapGeolocationError(error)),
      { enableHighAccuracy: !batterySaver, timeout: 15000, maximumAge: batterySaver ? 30000 : 5000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  },

  async queryPermissionState(): Promise<PermissionState | "unsupported"> {
    if (!("permissions" in navigator)) return "unsupported";
    try {
      const status = await navigator.permissions.query({ name: "geolocation" });
      return status.state;
    } catch {
      return "unsupported";
    }
  },
};
