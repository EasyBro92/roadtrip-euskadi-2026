import type L from "leaflet";
import { Pause, Play, SkipForward, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { BottomSheet } from "../features/map/BottomSheet";
import { DaySelector } from "../features/map/DaySelector";
import { MapControls } from "../features/map/MapControls";
import { MapSearchBar } from "../features/map/MapSearchBar";
import { RoutePolylines } from "../features/map/RoutePolylines";
import { StartRouteButton } from "../features/map/StartRouteButton";
import { StopMarkers } from "../features/map/StopMarkers";
import { useLiveNavigation } from "../features/map/useLiveNavigation";
import { useVehiclePlayback } from "../features/map/useVehiclePlayback";
import { VehicleMarker } from "../features/map/VehicleMarker";
import { useStopsOfDay } from "../hooks/useStopsOfDay";
import { useTap } from "../hooks/useTap";
import { getMapLayer } from "../services/map/MapService";
import { useSettingsStore } from "../stores/useSettingsStore";
import { useTripStore } from "../stores/useTripStore";
import { useUIStore } from "../stores/useUIStore";
import { useVehicleAnimationStore } from "../stores/useVehicleAnimationStore";

const GIRONA_FALLBACK: [number, number] = [42.0, -1.5];

/** Publica la instancia del mapa hacia fuera para que los overlays (que ya no viven dentro de MapContainer) puedan usarla. */
function MapInstanceBridge({ onReady }: { onReady: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => {
    onReady(map);
  }, [map, onReady]);
  return null;
}

function InvalidateSizeOnSheetChange() {
  const map = useMap();
  const sheetState = useUIStore((s) => s.bottomSheetState);

  useEffect(() => {
    const timeout = setTimeout(() => map.invalidateSize(), 220);
    return () => clearTimeout(timeout);
  }, [sheetState, map]);

  return null;
}

/**
 * El mapa sigue al coche, tanto en la simulación como en modo en ruta (donde
 * la posición viene del GPS). Sin esto la animación podía estar funcionando y
 * pasar totalmente desapercibida: el marcador es pequeño y con el mapa alejado
 * no se aprecia que se mueva.
 */
function FollowVehicleWhilePlaying() {
  const map = useMap();
  const isPlaying = useVehicleAnimationStore((s) => s.isPlaying);
  const isLive = useVehicleAnimationStore((s) => s.isLive);
  const position = useVehicleAnimationStore((s) => s.position);
  const startedRef = useRef(false);
  const following = isPlaying || isLive;

  useEffect(() => {
    if (!following || !position) {
      startedRef.current = false;
      return;
    }
    if (!startedRef.current) {
      startedRef.current = true;
      // Al arrancar, acercamos para que se vea el coche; después solo seguimos.
      // En modo en ruta hace falta detalle de calle, no una vista de región.
      const minZoom = isLive ? 15 : 11;
      map.flyTo([position.latitude, position.longitude], Math.max(map.getZoom(), minZoom), { duration: 0.6 });
      return;
    }
    map.panTo([position.latitude, position.longitude], { animate: false });
  }, [following, isLive, position, map]);

  return null;
}

/** Zoom inteligente / centrado automático al cambiar de día (sección 11). */
function AutoFitOnDayChange({ dayId }: { dayId: string }) {
  const map = useMap();
  const stops = useStopsOfDay(dayId);

  useEffect(() => {
    const enabled = stops.filter((s) => s.enabled);
    if (enabled.length === 0) return;
    if (enabled.length === 1) {
      map.flyTo([enabled[0].coordinates.latitude, enabled[0].coordinates.longitude], 13, { duration: 0.8 });
      return;
    }
    map.flyToBounds(
      enabled.map((s) => [s.coordinates.latitude, s.coordinates.longitude]),
      { padding: [56, 56], duration: 0.8 },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayId, map]);

  return null;
}

function PlaybackControls({ dayId }: { dayId: string }) {
  const { playToNextStop, pause } = useVehiclePlayback(dayId);
  const { isLive, toggle: toggleLive } = useLiveNavigation();
  const isPlaying = useVehicleAnimationStore((s) => s.isPlaying);
  const bottomSheetState = useUIStore((s) => s.bottomSheetState);

  // Play inicia el modo en ruta (sigue el GPS real). La simulación del
  // recorrido vive en el botón de al lado; antes ambos hacían lo mismo.
  const liveTap = useTap(() => {
    if (isPlaying) pause();
    toggleLive();
  });
  const nextTap = useTap(playToNextStop);
  const pauseTap = useTap(pause);

  if (bottomSheetState === "expanded") return null;

  return (
    <div className="pointer-events-none absolute bottom-[calc(128px+env(safe-area-inset-bottom)+12px)] left-0 right-0 z-[550] flex items-center justify-between gap-2 px-4">
      <div className="flex gap-2">
        <button
          {...liveTap}
          className={`pointer-events-auto flex h-12 w-12 touch-manipulation items-center justify-center rounded-full text-white shadow-(--shadow-card) transition-transform active:scale-95 ${
            isLive ? "bg-(--color-cancelled)" : "bg-(--color-navigation)"
          }`}
          aria-label={isLive ? "Detener modo en ruta" : "Iniciar ruta siguiendo tu ubicación"}
          aria-pressed={isLive}
        >
          {isLive ? <Square size={18} aria-hidden="true" /> : <Play size={20} aria-hidden="true" />}
        </button>
        {!isPlaying && !isLive && (
          <button
            {...nextTap}
            className="pointer-events-auto flex h-12 touch-manipulation items-center gap-1.5 rounded-full bg-(--color-surface) px-4 text-sm font-medium text-(--color-text) shadow-(--shadow-card) transition-transform active:scale-95"
          >
            <SkipForward size={16} aria-hidden="true" /> Siguiente parada
          </button>
        )}
        {isPlaying && (
          <button
            {...pauseTap}
            className="pointer-events-auto flex h-12 touch-manipulation items-center gap-1.5 rounded-full bg-(--color-surface) px-4 text-sm font-medium text-(--color-text) shadow-(--shadow-card) transition-transform active:scale-95"
          >
            <Pause size={16} aria-hidden="true" /> Pausar
          </button>
        )}
      </div>
      <StartRouteButton dayId={dayId} />
    </div>
  );
}

export function MapPage() {
  const currentDayId = useTripStore((s) => s.trip.currentDayId);
  const days = useTripStore((s) => s.trip.days);
  const dayId = currentDayId ?? days[0]?.id;
  const mapLayerId = useSettingsStore((s) => s.settings.mapLayer);
  const layer = getMapLayer(mapLayerId);
  const [map, setMap] = useState<L.Map | null>(null);

  const firstStop = useStopsOfDay(dayId)[0];
  const center: [number, number] = firstStop ? [firstStop.coordinates.latitude, firstStop.coordinates.longitude] : GIRONA_FALLBACK;

  if (!dayId) return null;

  return (
    /*
     * Los overlays (selector de día, controles, botones de reproducción y
     * panel inferior) se renderizan como HERMANOS del MapContainer, no como
     * hijos. Dentro del contenedor de Leaflet, sus manejadores de arrastre/
     * zoom se tragan los toques en Android antes de que lleguen al botón
     * (con ratón sí funcionaba, en táctil no). Fuera del contenedor, son
     * elementos normales del DOM y el táctil funciona siempre.
     */
    <div className="relative h-full w-full overflow-hidden">
      <MapContainer center={center} zoom={12} className="h-full w-full" zoomControl={false}>
        <TileLayer key={layer.id} url={layer.url} attribution={layer.attribution} maxZoom={layer.maxZoom} subdomains={["a", "b", "c"]} />
        <RoutePolylines dayId={dayId} />
        <StopMarkers dayId={dayId} />
        <VehicleMarker />
        <InvalidateSizeOnSheetChange />
        <AutoFitOnDayChange dayId={dayId} />
        <FollowVehicleWhilePlaying />
        <MapInstanceBridge onReady={setMap} />
      </MapContainer>

      {map && <MapSearchBar dayId={dayId} map={map} />}
      <DaySelector />
      {map && <MapControls dayId={dayId} map={map} />}
      <PlaybackControls dayId={dayId} />
      <BottomSheet dayId={dayId} />
    </div>
  );
}
