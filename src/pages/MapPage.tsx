import type L from "leaflet";
import { Play, SkipForward, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { BottomSheet } from "../features/map/BottomSheet";
import { DaySelector } from "../features/map/DaySelector";
import { MapControls } from "../features/map/MapControls";
import { MapSearchBar } from "../features/map/MapSearchBar";
import { RoutePolylines } from "../features/map/RoutePolylines";
import { StartRouteButton } from "../features/map/StartRouteButton";
import { CocheMarker } from "../features/map/CocheMarker";
import { NearbyMarkers } from "../features/map/NearbyMarkers";
import { FichaPoi, PoiLayer } from "../features/map/PoiLayer";
import { StopMarkers } from "../features/map/StopMarkers";
import { useLiveNavigation } from "../features/map/useLiveNavigation";
import { useSkipToNextStop } from "../features/map/useSkipToNextStop";
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
      // En modo en ruta hace falta detalle de calle, no una vista de región:
      // 17 es el nivel al que se navega, con los nombres de calle legibles.
      const minZoom = isLive ? 17 : 11;
      map.flyTo([position.latitude, position.longitude], Math.max(map.getZoom(), minZoom), { duration: 0.6 });
      return;
    }
    map.panTo([position.latitude, position.longitude], { animate: false });
  }, [following, isLive, position, map]);

  return null;
}

/**
 * Lleva el mapa a la parada actual cuando cambia. Sin esto, "Siguiente
 * parada" cambiaría la selección sin que se viese nada moverse.
 *
 * No vuela en el primer render: el encuadre inicial del día lo decide
 * AutoFitOnDayChange, y pelearse con él dejaría el mapa dando saltos al abrir.
 */
function FlyToCurrentStop() {
  const map = useMap();
  const currentStopId = useTripStore((s) => s.trip.currentStopId);
  const stopsById = useTripStore((s) => s.stopsById);
  const anterior = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const primeraVez = anterior.current === undefined;
    const cambio = anterior.current !== currentStopId;
    anterior.current = currentStopId;
    if (primeraVez || !cambio || !currentStopId) return;

    const parada = stopsById[currentStopId];
    if (!parada) return;
    map.flyTo([parada.coordinates.latitude, parada.coordinates.longitude], Math.max(map.getZoom(), 13), { duration: 0.7 });
  }, [currentStopId, stopsById, map]);

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
  const skipToNextStop = useSkipToNextStop(dayId);
  const { isLive, toggle: toggleLive } = useLiveNavigation();
  const bottomSheetState = useUIStore((s) => s.bottomSheetState);

  // Dos acciones bien distintas: seguir tu GPS, o avanzar por el itinerario.
  const liveTap = useTap(toggleLive);
  const nextTap = useTap(skipToNextStop);

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
        <button
          {...nextTap}
          className="pointer-events-auto flex h-12 touch-manipulation items-center gap-1.5 whitespace-nowrap rounded-full bg-(--color-surface) px-4 text-sm font-medium text-(--color-text) shadow-(--shadow-card) transition-transform active:scale-95"
          aria-label="Saltar a la siguiente parada del itinerario"
        >
          <SkipForward size={16} aria-hidden="true" /> Siguiente parada
        </button>
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
        <NearbyMarkers />
        <CocheMarker />
        <PoiLayer />
        <VehicleMarker />
        <InvalidateSizeOnSheetChange />
        <AutoFitOnDayChange dayId={dayId} />
        <FollowVehicleWhilePlaying />
        <FlyToCurrentStop />
        <MapInstanceBridge onReady={setMap} />
      </MapContainer>

      {map && <MapSearchBar dayId={dayId} map={map} />}
      <DaySelector />
      {map && <MapControls dayId={dayId} map={map} />}
      {/* Va antes del panel inferior para quedar por debajo de él si coinciden. */}
      <FichaPoi />
      <PlaybackControls dayId={dayId} />
      <BottomSheet dayId={dayId} />
    </div>
  );
}
