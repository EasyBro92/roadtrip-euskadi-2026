import type L from "leaflet";
import { useEffect, useState } from "react";
import { Polyline } from "react-leaflet";
import { useStopsOfDay } from "../../hooks/useStopsOfDay";
import { RoutingService } from "../../services/routing/RoutingService";
import { useSettingsStore } from "../../stores/useSettingsStore";
import { useUIStore } from "../../stores/useUIStore";
import type { RouteSegment } from "../../types";

function toLatLngs(segments: RouteSegment[]): [number, number][] {
  return segments.flatMap((seg) => seg.geometry.map((c) => [c.latitude, c.longitude] as [number, number]));
}

/**
 * La línea de la ruta "se dibuja" de la primera parada a la última al
 * aparecer. `pathLength=1` normaliza la longitud del trazo, así la misma
 * animación de CSS vale para un tramo de 2 km y para uno de 300.
 */
function dibujar(e: L.LeafletEvent) {
  const path = (e.target as L.Polyline).getElement() as SVGPathElement | undefined;
  if (!path) return;
  path.setAttribute("pathLength", "1");
  path.classList.add("ruta-dibuja");
}

/**
 * Ruta tricolor (sección 11): gris de fondo (ruta completa, siempre visible),
 * verde (tramo recorrido) y azul (tramo pendiente) superpuestos. Usa rutas
 * reales por carretera (RoutingService); si ningún proveedor responde, cae a
 * línea recta marcada como aproximada (ver `RouteSegment.isFallback`) y se
 * avisa en el mapa.
 *
 * Con `color`, se pinta de un solo color: es la vista del viaje entero, donde
 * lo que importa es distinguir los días y no lo recorrido.
 */
export function RoutePolylines({ dayId, color }: { dayId: string; color?: string }) {
  const stops = useStopsOfDay(dayId);
  const [segments, setSegments] = useState<RouteSegment[]>([]);
  const [usingFallback, setUsingFallback] = useState(false);
  const evitarPeajes = useSettingsStore((s) => s.settings.evitarPeajes ?? false);
  const setRutaAproximada = useUIStore((s) => s.setRutaAproximada);

  const enabledStops = stops.filter((s) => s.enabled);
  const stopsKey = enabledStops.map((s) => s.id).join("|");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (enabledStops.length < 2) {
        setSegments([]);
        setUsingFallback(false);
        return;
      }
      const waypoints = enabledStops.map((s) => ({ id: s.id, coordinates: s.coordinates }));
      const result = await RoutingService.routeFullTrip(waypoints, evitarPeajes ? "no-tolls" : "fastest");
      if (!cancelled) {
        setSegments(result);
        setUsingFallback(result.some((seg) => seg.isFallback));
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopsKey, evitarPeajes]);

  // El aviso de "ruta aproximada" se enseña fuera del mapa, en MapPage.
  useEffect(() => {
    if (usingFallback) setRutaAproximada(true);
  }, [usingFallback, setRutaAproximada]);

  if (segments.length === 0) return null;

  const dash = usingFallback ? "2 10" : undefined;

  if (color) {
    const todo = toLatLngs(segments);
    return (
      <>
        <Polyline positions={todo} pathOptions={{ color: "#ffffff", weight: 7, opacity: 0.9, dashArray: dash }} />
        <Polyline positions={todo} pathOptions={{ color, weight: 4, opacity: 1, dashArray: dash }} eventHandlers={dash ? undefined : { add: dibujar }} />
      </>
    );
  }

  const lastVisitedIndex = enabledStops.reduce((maxIndex, stop, index) => (stop.visited ? index : maxIndex), -1);
  const completedSegments = segments.slice(0, Math.max(0, lastVisitedIndex));
  const pendingSegments = segments.slice(Math.max(0, lastVisitedIndex));

  const completedLatLngs = toLatLngs(completedSegments);
  const pendingLatLngs = toLatLngs(pendingSegments);

  return (
    <>
      <Polyline positions={toLatLngs(segments)} pathOptions={{ color: "#9CA3AF", weight: 4, opacity: 0.5, dashArray: dash }} />

      {/* Borde blanco por debajo del trazo de color, como en Google Maps. */}
      {completedLatLngs.length > 0 && <Polyline positions={completedLatLngs} pathOptions={{ color: "#ffffff", weight: 8, opacity: 0.9 }} />}
      {completedLatLngs.length > 0 && <Polyline positions={completedLatLngs} pathOptions={{ color: "#16A34A", weight: 5, opacity: 1 }} />}

      {pendingLatLngs.length > 0 && <Polyline positions={pendingLatLngs} pathOptions={{ color: "#ffffff", weight: 8, opacity: 0.9 }} />}
      {pendingLatLngs.length > 0 && (
        <Polyline positions={pendingLatLngs} pathOptions={{ color: "#4285F4", weight: 5, opacity: 1, dashArray: dash }} eventHandlers={dash ? undefined : { add: dibujar }} />
      )}
    </>
  );
}
