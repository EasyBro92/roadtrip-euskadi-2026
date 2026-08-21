import { useCallback } from "react";
import { useStopsOfDay } from "../../hooks/useStopsOfDay";
import { useTripStore } from "../../stores/useTripStore";
import { useUIStore } from "../../stores/useUIStore";

/**
 * Salta a la siguiente parada del itinerario: cambia la parada actual, sin
 * animaciones ni recorrido. El mapa vuela hasta ella y el panel inferior pasa
 * a mostrar su ficha.
 *
 * Sustituye a la antigua simulación, que recorría el trayecto con el coche:
 * el botón se llama "Siguiente parada" y ahora hace exactamente eso.
 */
export function useSkipToNextStop(dayId: string) {
  const stops = useStopsOfDay(dayId);
  const setCurrentStop = useTripStore((s) => s.setCurrentStop);
  const pushToast = useUIStore((s) => s.pushToast);

  return useCallback(() => {
    const activas = stops.filter((s) => s.enabled);
    if (activas.length === 0) {
      pushToast("Este día no tiene paradas activas.", "info");
      return;
    }

    const actualId = useTripStore.getState().trip.currentStopId;
    const indice = actualId ? activas.findIndex((s) => s.id === actualId) : -1;
    const siguiente = activas[indice + 1];

    // Al llegar al final del día se vuelve a la primera en lugar de no hacer
    // nada: un botón que deja de responder parece roto.
    if (!siguiente) {
      setCurrentStop(activas[0].id);
      pushToast(`Fin del día: vuelta a ${activas[0].name}.`, "info");
      return;
    }

    setCurrentStop(siguiente.id);
    pushToast(`Siguiente parada: ${siguiente.name}.`, "info");
  }, [stops, setCurrentStop, pushToast]);
}
