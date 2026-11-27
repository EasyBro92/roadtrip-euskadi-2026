import { useEffect, useMemo } from "react";
import { Marker, useMap, useMapEvents } from "react-leaflet";
import { useStopsOfDay } from "../../hooks/useStopsOfDay";
import { useSettingsStore } from "../../stores/useSettingsStore";
import { useLugarStore } from "../../stores/useLugarStore";
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
          icon={buildStopMarkerIcon(stop.category, { visited: stop.visited, isCurrent: stop.id === currentStopId, nombre: stop.name })}
          alt={stop.name}
          eventHandlers={{
            click: () => {
              setCurrentStop(stop.id);
              // Tu parada manda sobre la ficha de cualquier otro sitio abierto.
              useLugarStore.getState().elegir(null);
              setBottomSheetState("mid");
            },
          }}
        />
      ))}
    </>
  );
}

/** A partir de este zoom se leen los nombres bajo los pines. */
const ZOOM_NOMBRES = 12;

/**
 * Pone o quita la clase que enseña los nombres de las paradas según el zoom.
 *
 * Es una clase en el contenedor y no un estado de React a propósito: cambiar
 * el zoom no vuelve a dibujar ni un solo marcador, sólo cambia el CSS.
 */
export function NombresSegunZoom() {
  const map = useMap();
  useEffect(() => {
    map.getContainer().classList.toggle("mostrar-nombres", map.getZoom() >= ZOOM_NOMBRES);
  }, [map]);
  useMapEvents({
    zoomend: () => map.getContainer().classList.toggle("mostrar-nombres", map.getZoom() >= ZOOM_NOMBRES),
  });
  return null;
}
