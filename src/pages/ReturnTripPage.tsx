import { ArrowLeft, Loader2, Route as RouteIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RETURN_TRIP_WAYPOINTS } from "../data/trip.data";
import { RoutingService } from "../services/routing/RoutingService";
import { useTripStore } from "../stores/useTripStore";
import type { Coordinates } from "../types";
import { formatDuration, formatEUR, formatKm } from "../utils/format";

const GIRONA: Coordinates = { latitude: 41.9794, longitude: 2.8214 };

type WaypointId = (typeof RETURN_TRIP_WAYPOINTS)[number]["id"] | "no-stop";

interface Alternative {
  id: WaypointId;
  label: string;
  distanceMeters: number | null;
  durationSeconds: number | null;
  isFallback: boolean;
}

export function ReturnTripPage() {
  const navigate = useNavigate();
  const trip = useTripStore((s) => s.trip);
  const stopsById = useTripStore((s) => s.stopsById);
  const setReturnTrip = useTripStore((s) => s.setReturnTrip);

  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [loading, setLoading] = useState(true);

  // Punto de partida del regreso: última parada habilitada del viaje.
  const lastDay = trip.days[trip.days.length - 1];
  const lastStop = lastDay?.stopIds.map((id) => stopsById[id]).filter((s) => s?.enabled).pop();

  const compute = useCallback(async () => {
    if (!lastStop) return;
    setLoading(true);

    const options: { id: WaypointId; label: string; via: Coordinates | null }[] = [
      { id: "no-stop", label: "Directo, sin parada", via: null },
      ...RETURN_TRIP_WAYPOINTS.map((w) => ({ id: w.id as WaypointId, label: `Vía ${w.name}`, via: w.coordinates })),
    ];

    const computed = await Promise.all(
      options.map(async (option) => {
        const legs = option.via ? [[lastStop.coordinates, option.via], [option.via, GIRONA]] : [[lastStop.coordinates, GIRONA]];

        let distance = 0;
        let duration = 0;
        let isFallback = false;
        for (const [legIndex, [from, to]] of legs.entries()) {
          // Cada tramo necesita su propia clave de caché: si ambos comparten
          // ids, RoutingService devuelve el primer tramo también para el
          // segundo y la ruta "vía X" sale más corta que la directa.
          const segment = await RoutingService.routeBetweenStops({
            fromStopId: `return-${option.id}-leg${legIndex}-from`,
            toStopId: `return-${option.id}-leg${legIndex}-to`,
            from,
            to,
          });
          distance += segment.distanceMeters ?? 0;
          duration += segment.durationSeconds ?? 0;
          if (segment.isFallback) isFallback = true;
        }

        return { id: option.id, label: option.label, distanceMeters: distance, durationSeconds: duration, isFallback };
      }),
    );

    setAlternatives(computed.sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0)));
    setLoading(false);
  }, [lastStop]);

  useEffect(() => {
    compute();
  }, [compute]);

  /** Combustible y coste según el consumo real configurado del Golf. */
  function estimate(distanceMeters: number | null) {
    if (distanceMeters == null) return null;
    const km = distanceMeters / 1000;
    const liters = (km * trip.vehicle.averageConsumptionL100km) / 100;
    return { liters, km };
  }

  const chosen = trip.returnTrip.label;

  return (
    <div className="safe-x h-full overflow-y-auto bg-(--color-bg) px-4 pt-4 pb-8">
      <button onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1 text-sm text-(--color-text-muted)">
        <ArrowLeft size={15} aria-hidden="true" /> Atrás
      </button>
      <h1 className="mb-1 text-xl font-bold">Regreso a Girona</h1>
      <p className="mb-4 text-xs text-(--color-text-muted)">
        Desde {lastStop?.name ?? "la última parada"}. Distancias y tiempos calculados por carretera; el combustible usa tu consumo configurado ({trip.vehicle.averageConsumptionL100km} L/100 km).
      </p>

      <label className="mb-4 block text-sm">
        <span className="mb-1 block text-(--color-text-muted)">Fecha de regreso</span>
        <input
          type="date"
          value={trip.returnTrip.date}
          onChange={(e) => setReturnTrip({ date: e.target.value })}
          className="w-full rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: "var(--color-border)" }}
        />
      </label>

      {loading && (
        <p className="flex items-center gap-2 text-sm text-(--color-text-muted)">
          <Loader2 size={15} className="animate-spin" aria-hidden="true" /> Calculando alternativas…
        </p>
      )}

      <div className="space-y-2">
        {alternatives.map((alt) => {
          const est = estimate(alt.distanceMeters);
          const isChosen = chosen === alt.id || (chosen === "balanced" && alt.id === "no-stop");
          return (
            <button
              key={alt.id}
              onClick={() => setReturnTrip({ label: alt.id === "no-stop" ? "no-stop" : (alt.id as typeof chosen) })}
              className="w-full rounded-(--radius-card) border p-4 text-left shadow-(--shadow-card)"
              style={{
                borderColor: isChosen ? "var(--color-navigation)" : "var(--color-border)",
                background: isChosen ? "color-mix(in srgb, var(--color-navigation) 8%, var(--color-surface))" : "var(--color-surface)",
              }}
            >
              <div className="flex items-center gap-2">
                <RouteIcon size={16} className="shrink-0 text-(--color-navigation)" aria-hidden="true" />
                <span className="text-sm font-medium">{alt.label}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-(--color-text-muted)">
                <span>{alt.distanceMeters ? formatKm(alt.distanceMeters) : "Distancia no disponible"}</span>
                <span>{alt.durationSeconds ? formatDuration(alt.durationSeconds) : "Duración no disponible"}</span>
                {est && <span>{est.liters.toFixed(1)} L de gasóleo</span>}
              </div>
              {alt.isFallback && <p className="mt-1.5 text-xs text-(--color-skipped)">Ruta aproximada: ningún servicio de rutas respondió.</p>}
              {isChosen && <p className="mt-1.5 text-xs font-medium text-(--color-navigation)">Opción elegida</p>}
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-(--color-text-muted)">
        El precio del combustible no se estima aquí porque depende del día: regístralo en Mi Golf al repostar y verás el coste real ({formatEUR(0)} hasta ahora si no has añadido repostajes).
      </p>
    </div>
  );
}
