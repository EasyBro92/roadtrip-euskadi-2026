import { useCallback, useRef } from "react";
import { useStopsOfDay } from "../../hooks/useStopsOfDay";
import { RoutingService } from "../../services/routing/RoutingService";
import { useSettingsStore } from "../../stores/useSettingsStore";
import { useTripStore } from "../../stores/useTripStore";
import { useUIStore } from "../../stores/useUIStore";
import { useVehicleAnimationStore, type PlaybackScope } from "../../stores/useVehicleAnimationStore";
import type { Coordinates } from "../../types";
import { pointAlongPath, totalPathDistanceMeters } from "../../utils/geo";

const BASE_SPEED_KMH = 400; // Velocidad de reproducción "1x" (viaje simbólico, no tiempo real).

/**
 * Reproduce el movimiento del coche siguiendo la geometría real de la ruta
 * (sección 13). Usa requestAnimationFrame con interpolación de posición y
 * bearing; respeta `prefers-reduced-motion` saltando directamente al final.
 *
 * ⚠️ SIN USAR ahora mismo: el botón que la lanzaba pasó a ser "Siguiente
 * parada", que salta por el itinerario en vez de animar el recorrido. El
 * código se conserva porque la animación funciona y puede colgarse de otro
 * control (por ejemplo "Ver recorrido" en el menú del mapa). Si se decide
 * que no se quiere, hay que borrar este archivo entero.
 */
export function useVehiclePlayback(dayId: string) {
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const pathRef = useRef<Coordinates[]>([]);
  const durationMsRef = useRef<number>(0);
  const onCompleteRef = useRef<(() => void) | null>(null);

  const stops = useStopsOfDay(dayId);
  const setCurrentStop = useTripStore((s) => s.setCurrentStop);
  const pushToast = useUIStore((s) => s.pushToast);
  const reducedMotion = useSettingsStore((s) => s.settings.reducedMotion);

  const stopAnimation = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    useVehicleAnimationStore.getState().pause();
  }, []);

  const tick = useCallback((timestamp: number) => {
    if (!startTimeRef.current) startTimeRef.current = timestamp;
    const elapsed = timestamp - startTimeRef.current;
    const progress = durationMsRef.current > 0 ? Math.min(1, elapsed / durationMsRef.current) : 1;

    const { point, bearing } = pointAlongPath(pathRef.current, progress);
    useVehicleAnimationStore.getState().setPosition(point, bearing);

    if (progress >= 1) {
      stopAnimation();
      onCompleteRef.current?.();
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [stopAnimation]);

  const playPath = useCallback(
    (path: Coordinates[], scope: PlaybackScope, onComplete?: () => void) => {
      if (path.length < 2) return;
      pathRef.current = path;
      onCompleteRef.current = onComplete ?? null;
      startTimeRef.current = 0;

      const distanceKm = totalPathDistanceMeters(path) / 1000;
      const speed = useVehicleAnimationStore.getState().speedMultiplier;
      durationMsRef.current = reducedMotion ? 0 : (distanceKm / (BASE_SPEED_KMH * speed)) * 3600 * 1000;

      useVehicleAnimationStore.getState().play(scope);

      if (reducedMotion) {
        const { point, bearing } = pointAlongPath(path, 1);
        useVehicleAnimationStore.getState().setPosition(point, bearing);
        useVehicleAnimationStore.getState().pause();
        onComplete?.();
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    },
    [reducedMotion, tick],
  );

  const playToNextStop = useCallback(async () => {
    const enabledStops = stops.filter((s) => s.enabled);

    if (enabledStops.length < 2) {
      pushToast("Este día necesita al menos dos paradas activas para animar el recorrido.", "info");
      return;
    }

    const currentId = useTripStore.getState().trip.currentStopId;
    const rawIndex = currentId ? enabledStops.findIndex((s) => s.id === currentId) : -1;

    // Si ya estamos en la última parada (o no hay ninguna seleccionada, o la
    // seleccionada es de otro día) el recorrido vuelve a empezar en la
    // primera en vez de no hacer nada: antes el botón parecía roto.
    const isAtEnd = rawIndex >= enabledStops.length - 1;
    const fromIndex = rawIndex < 0 || isAtEnd ? 0 : rawIndex;

    const from = enabledStops[fromIndex];
    const to = enabledStops[fromIndex + 1];
    if (!from || !to) {
      pushToast("No hay una siguiente parada que recorrer en este día.", "info");
      return;
    }

    // Confirmación inmediata de que el toque se registró: sin esto, mientras
    // se calcula la ruta parece que el botón no ha hecho nada.
    pushToast(isAtEnd ? `Fin del día: reiniciando desde ${from.name}.` : `En camino a ${to.name}…`, "info");

    const segment = await RoutingService.routeBetweenStops({ fromStopId: from.id, toStopId: to.id, from: from.coordinates, to: to.coordinates });
    playPath(segment.geometry, "segment", () => {
      setCurrentStop(to.id);
      pushToast(`Has llegado a ${to.name}.`, "success");
    });
  }, [stops, playPath, setCurrentStop, pushToast]);

  const playFullDay = useCallback(async () => {
    const enabledStops = stops.filter((s) => s.enabled);
    if (enabledStops.length < 2) return;
    const segments = await RoutingService.routeFullTrip(enabledStops.map((s) => ({ id: s.id, coordinates: s.coordinates })));
    const path = segments.flatMap((seg) => seg.geometry);
    playPath(path, "day", () => setCurrentStop(enabledStops[enabledStops.length - 1].id));
  }, [stops, playPath, setCurrentStop]);

  const pause = useCallback(() => stopAnimation(), [stopAnimation]);

  return { playToNextStop, playFullDay, pause };
}
