import { useMemo } from "react";
import { Marker } from "react-leaflet";
import { useStopsOfDay } from "../../hooks/useStopsOfDay";
import { useSettingsStore } from "../../stores/useSettingsStore";
import { useTripStore } from "../../stores/useTripStore";
import { useUIStore } from "../../stores/useUIStore";
import { buildStopMarkerIcon } from "./stopIcon";

/** Marcadores de todas las paradas habilitadas del día activo, coloreados por categoría (sección 11). */
export function StopMarkers({ dayId }: { dayId: string }) {
  const stops = useStopsOfDay(dayId);
  const currentStopId = useTripStore((s) => s.trip.currentStopId);
  const setCurrentStop = useTripStore((s) => s.setCurrentStop);
  const setBottomSheetState = useUIStore((s) => s.setBottomSheetState);
  const categoryVisibility = useSettingsStore((s) => s.settings.categoryVisibility);

  const visibleStops = useMemo(
    () => stops.filter((s) => s.enabled && categoryVisibility[s.category] !== false),
    [stops, categoryVisibility],
  );

  return (
    <>
      {visibleStops.map((stop) => (
        <Marker
          key={stop.id}
          position={[stop.coordinates.latitude, stop.coordinates.longitude]}
          icon={buildStopMarkerIcon(stop.category, { visited: stop.visited, isCurrent: stop.id === currentStopId })}
          alt={stop.name}
          eventHandlers={{
            click: () => {
              setCurrentStop(stop.id);
              setBottomSheetState("mid");
            },
          }}
        />
      ))}
    </>
  );
}
