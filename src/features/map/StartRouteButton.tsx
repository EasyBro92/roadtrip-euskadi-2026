import { Navigation } from "lucide-react";
import { useStopsOfDay } from "../../hooks/useStopsOfDay";
import { useTap } from "../../hooks/useTap";
import { useTripStore } from "../../stores/useTripStore";
import { useUIStore } from "../../stores/useUIStore";
import { buildGoogleMapsDirectionsUrl } from "../../utils/geo";
import { openExternalUrl } from "../../utils/openExternal";

/**
 * Abre Google Maps para navegar **solo hasta la siguiente parada**, no la
 * ruta completa del día (preferencia explícita del usuario: ir tramo a
 * tramo). La navegación real se delega en Google Maps; la de esta app es
 * orientativa (sección 27).
 */
export function StartRouteButton({ dayId }: { dayId: string }) {
  const stops = useStopsOfDay(dayId);
  const currentStopId = useTripStore((s) => s.trip.currentStopId);
  const openModal = useUIStore((s) => s.openModal);
  const pushToast = useUIStore((s) => s.pushToast);

  const enabledStops = stops.filter((s) => s.enabled);

  const currentIndex = currentStopId ? enabledStops.findIndex((s) => s.id === currentStopId) : -1;
  const from = currentIndex >= 0 ? enabledStops[currentIndex] : null;

  // Sin parada seleccionada todavía (recién abierta la app) empezamos a
  // buscar en la segunda: la primera del día es el punto de partida, no un
  // destino. Antes se ofrecía "navegar hasta Girona" saliendo de Girona, y
  // Google Maps no arrancaba ninguna ruta porque origen y destino coincidían.
  const searchFrom = currentIndex >= 0 ? currentIndex + 1 : 1;
  const nextPending = enabledStops.slice(searchFrom).find((s) => !s.visited);

  // Si ya no queda ninguna pendiente por delante (estás en la última, o las
  // has marcado como visitadas) el botón desaparecía y parecía que la app lo
  // hubiera perdido. Mejor seguir ofreciendo navegación al destino del día.
  const lastStop = enabledStops.length > 0 ? enabledStops[enabledStops.length - 1] : null;
  const target = nextPending ?? (lastStop && lastStop.id !== currentStopId ? lastStop : null);

  const startTap = useTap(() => handleStart());

  if (!target) return null;

  function handleStart() {
    if (!target) return;
    openModal({
      type: "confirm",
      title: "Ir a la siguiente parada",
      message: `Se abrirá Google Maps para navegar hasta ${target.name}${from ? `, saliendo de ${from.name}` : ""}. ¿Continuar?`,
      onConfirm: () => {
        // Sin origen explícito, Google Maps usa la ubicación real del móvil,
        // que es lo correcto cuando ya estás en carretera.
        const url = from
          ? buildGoogleMapsDirectionsUrl([from.coordinates, target.coordinates])
          : `https://www.google.com/maps/dir/?api=1&destination=${target.coordinates.latitude},${target.coordinates.longitude}&travelmode=driving`;
        if (!url) {
          pushToast("No se pudo construir la ruta.", "error");
          return;
        }
        openExternalUrl(url);
      },
    });
  }

  return (
    <button
      {...startTap}
      className="pointer-events-auto flex h-12 touch-manipulation items-center gap-2 whitespace-nowrap rounded-full bg-(--color-navigation) px-5 text-sm font-medium text-white shadow-(--shadow-card) transition-transform active:scale-95"
      aria-label={`Navegar hasta ${target.name} con Google Maps`}
    >
      <Navigation size={16} aria-hidden="true" />
      Navegar
    </button>
  );
}
