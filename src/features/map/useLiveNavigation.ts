import { useCallback, useEffect, useRef } from "react";
import { useLocationStore } from "../../stores/useLocationStore";
import { useSettingsStore } from "../../stores/useSettingsStore";
import { useUIStore } from "../../stores/useUIStore";
import { useVehicleAnimationStore } from "../../stores/useVehicleAnimationStore";
import type { Coordinates } from "../../types";
import { bearingDegrees, haversineDistanceMeters } from "../../utils/geo";

/**
 * Por debajo de este desplazamiento entre lecturas no giramos el coche: el GPS
 * tiene ruido de varios metros incluso parado, y sin este umbral el icono da
 * vueltas sobre sí mismo en cada semáforo.
 */
const MIN_MOVE_FOR_BEARING_M = 8;

/**
 * Modo "en ruta": sigue tu posición real del GPS en lugar de simular el
 * recorrido. Reutiliza el marcador del coche de la animación, así que ambos
 * modos son excluyentes (lo garantiza useVehicleAnimationStore).
 */
export function useLiveNavigation() {
  const isLive = useVehicleAnimationStore((s) => s.isLive);
  const setLive = useVehicleAnimationStore((s) => s.setLive);

  const position = useLocationStore((s) => s.position);
  const locationError = useLocationStore((s) => s.error);
  const startTracking = useLocationStore((s) => s.startTracking);
  const stopTracking = useLocationStore((s) => s.stopTracking);

  const batterySaver = useSettingsStore((s) => s.settings.batterySaverMode);
  const pushToast = useUIStore((s) => s.pushToast);

  const lastPointRef = useRef<Coordinates | null>(null);

  // Vuelca cada lectura del GPS en el marcador del coche.
  useEffect(() => {
    if (!isLive || !position) return;

    const previous = lastPointRef.current;
    const store = useVehicleAnimationStore.getState();
    const movedEnough = previous ? haversineDistanceMeters(previous, position) >= MIN_MOVE_FOR_BEARING_M : false;
    const bearing = previous && movedEnough ? bearingDegrees(previous, position) : store.bearing;

    store.setPosition(position, bearing);
    if (!previous || movedEnough) lastPointRef.current = position;
  }, [isLive, position]);

  // Un permiso denegado deja el modo encendido pero sin datos: mejor salir y
  // decirlo, en vez de quedarse con el botón en "activo" sin que pase nada.
  useEffect(() => {
    if (!isLive || !locationError) return;
    pushToast(locationError.message, "error");
    stopTracking();
    setLive(false);
    lastPointRef.current = null;
  }, [isLive, locationError, pushToast, stopTracking, setLive]);

  const stop = useCallback(() => {
    stopTracking();
    setLive(false);
    lastPointRef.current = null;
  }, [stopTracking, setLive]);

  const start = useCallback(() => {
    lastPointRef.current = null;
    startTracking(batterySaver);
    setLive(true);
    pushToast("Modo en ruta activado: el mapa sigue tu posición.", "info");
  }, [startTracking, batterySaver, setLive, pushToast]);

  const toggle = useCallback(() => (isLive ? stop() : start()), [isLive, start, stop]);

  // Salir del mapa no debe dejar el GPS encendido consumiendo batería.
  useEffect(() => () => {
    if (useVehicleAnimationStore.getState().isLive) {
      useLocationStore.getState().stopTracking();
      useVehicleAnimationStore.getState().setLive(false);
    }
  }, []);

  return { isLive, start, stop, toggle };
}
