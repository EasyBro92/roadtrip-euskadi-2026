import { useEffect, useState } from "react";
import { Polyline } from "react-leaflet";
import { useStopsOfDay } from "../../hooks/useStopsOfDay";
import { RoutingService } from "../../services/routing/RoutingService";
import type { RouteSegment } from "../../types";

function toLatLngs(segments: RouteSegment[]): [number, number][] {
  return segments.flatMap((seg) => seg.geometry.map((c) => [c.latitude, c.longitude] as [number, number]));
}

/**
 * Ruta tricolor (sección 11): gris de fondo (ruta completa, siempre visible),
 * verde (tramo recorrido) y azul (tramo pendiente) superpuestos. Usa rutas
 * reales por carretera (RoutingService); si ningún proveedor responde, cae a
 * línea recta marcada como aproximada (ver `RouteSegment.isFallback`).
 */
export function RoutePolylines({ dayId }: { dayId: string }) {
  const stops = useStopsOfDay(dayId);
  const [segments, setSegments] = useState<RouteSegment[]>([]);
  const [usingFallback, setUsingFallback] = useState(false);

  const enabledStops = stops.filter((s) => s.enabled);
  const stopsKey = enabledStops.map((s) => s.id).join("|");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (enabledStops.length < 2) {
        setSegments([]);
        return;
      }
      const waypoints = enabledStops.map((s) => ({ id: s.id, coordinates: s.coordinates }));
      const result = await RoutingService.routeFullTrip(waypoints);
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
  }, [stopsKey]);

  if (segments.length === 0) return null;

  const lastVisitedIndex = enabledStops.reduce((maxIndex, stop, index) => (stop.visited ? index : maxIndex), -1);
  const completedSegments = segments.slice(0, Math.max(0, lastVisitedIndex));
  const pendingSegments = segments.slice(Math.max(0, lastVisitedIndex));

  const completedLatLngs = toLatLngs(completedSegments);
  const pendingLatLngs = toLatLngs(pendingSegments);

  return (
    <>
      <Polyline positions={toLatLngs(segments)} pathOptions={{ color: "#9CA3AF", weight: 4, opacity: 0.5, dashArray: usingFallback ? "2 10" : undefined }} />

      {/* Borde blanco por debajo del trazo de color, como en Google Maps. */}
      {completedLatLngs.length > 0 && <Polyline positions={completedLatLngs} pathOptions={{ color: "#ffffff", weight: 8, opacity: 0.9 }} />}
      {completedLatLngs.length > 0 && <Polyline positions={completedLatLngs} pathOptions={{ color: "#16A34A", weight: 5, opacity: 1 }} />}

      {pendingLatLngs.length > 0 && <Polyline positions={pendingLatLngs} pathOptions={{ color: "#ffffff", weight: 8, opacity: 0.9 }} />}
      {pendingLatLngs.length > 0 && <Polyline positions={pendingLatLngs} pathOptions={{ color: "#4285F4", weight: 5, opacity: 1 }} />}
    </>
  );
}

