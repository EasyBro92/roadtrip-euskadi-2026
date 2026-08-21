import type L from "leaflet";
import { Loader2, MapPin, Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStopsOfDay } from "../../hooks/useStopsOfDay";
import { GeocodingService, type GeocodingResult } from "../../services/geocoding/GeocodingService";
import { useTripStore } from "../../stores/useTripStore";
import { useUIStore } from "../../stores/useUIStore";
import type { Stop } from "../../types";

/**
 * Barra de búsqueda superior al estilo de Google Maps. Busca en dos ámbitos:
 * 1. Paradas del viaje (instantáneo, local) — centra el mapa y abre la ficha.
 * 2. Cualquier lugar del mundo vía Nominatim (con retardo) — permite añadirlo
 *    como parada nueva al día activo.
 */
export function MapSearchBar({ dayId, map }: { dayId: string; map: L.Map }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [remoteResults, setRemoteResults] = useState<GeocodingResult[]>([]);
  const [searching, setSearching] = useState(false);

  const allStops = useTripStore((s) => s.stopsById);
  const dayStops = useStopsOfDay(dayId);
  const setCurrentStop = useTripStore((s) => s.setCurrentStop);
  const setCurrentDay = useTripStore((s) => s.setCurrentDay);
  const addStop = useTripStore((s) => s.addStop);
  const setBottomSheetState = useUIStore((s) => s.setBottomSheetState);
  const pushToast = useUIStore((s) => s.pushToast);

  const localMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return Object.values(allStops)
      .filter((s) => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q))
      .slice(0, 6);
  }, [query, allStops]);

  // Búsqueda remota con retardo. El temporizador vive en un ref para que no
  // se recree en cada pulsación (si no, el "debounce" no debounce nada y se
  // dispara una petición por tecla).
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const q = query.trim();
    if (q.length < 3) {
      setRemoteResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    timerRef.current = setTimeout(async () => {
      try {
        setRemoteResults(await GeocodingService.search(q, { limit: 4 }));
      } catch {
        setRemoteResults([]);
      } finally {
        setSearching(false);
      }
    }, 500);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  function goToStop(stop: Stop) {
    setCurrentDay(stop.dayId);
    setCurrentStop(stop.id);
    map.flyTo([stop.coordinates.latitude, stop.coordinates.longitude], 14, { duration: 0.8 });
    setBottomSheetState("mid");
    close();
  }

  function addRemoteAsStop(result: GeocodingResult) {
    const name = result.displayName.split(",")[0];
    addStop(dayId, { name, category: "pueblo", coordinates: result.coordinates });
    map.flyTo([result.coordinates.latitude, result.coordinates.longitude], 13, { duration: 0.8 });
    pushToast(`"${name}" añadido al día ${dayStops.length > 0 ? "actual" : ""}. Edítalo desde Itinerario.`, "success");
    close();
  }

  function close() {
    setQuery("");
    setRemoteResults([]);
    setFocused(false);
  }

  const showResults = focused && query.trim().length >= 2;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-[570] px-3 pt-3">
      <div className="pointer-events-auto mr-14">
        <div
          className="flex h-12 items-center gap-2 rounded-full border bg-(--color-surface) px-4 shadow-(--shadow-card)"
          style={{ borderColor: "var(--color-border)" }}
        >
          <Search size={18} className="shrink-0 text-(--color-text-muted)" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            placeholder="Buscar en tu viaje o un lugar nuevo"
            aria-label="Buscar paradas o lugares"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-(--color-text-muted)"
          />
          {searching && <Loader2 size={16} className="shrink-0 animate-spin text-(--color-text-muted)" aria-hidden="true" />}
          {query && (
            <button onClick={close} aria-label="Limpiar búsqueda" className="shrink-0 text-(--color-text-muted)">
              <X size={18} aria-hidden="true" />
            </button>
          )}
        </div>

        {showResults && (
          <div
            className="mt-2 max-h-[50vh] overflow-y-auto rounded-2xl border bg-(--color-surface) py-1 shadow-(--shadow-card)"
            style={{ borderColor: "var(--color-border)" }}
          >
            {localMatches.length > 0 && (
              <>
                <p className="px-4 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-(--color-text-muted)">En tu viaje</p>
                {localMatches.map((stop) => (
                  <button key={stop.id} onClick={() => goToStop(stop)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left active:bg-(--color-surface-muted)">
                    <MapPin size={17} className="shrink-0 text-(--color-navigation)" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-(--color-text)">{stop.name}</span>
                      <span className="block truncate text-xs capitalize text-(--color-text-muted)">{stop.category}</span>
                    </span>
                  </button>
                ))}
              </>
            )}

            {remoteResults.length > 0 && (
              <>
                <p className="px-4 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-(--color-text-muted)">Añadir un lugar nuevo</p>
                {remoteResults.map((result, i) => (
                  <button key={i} onClick={() => addRemoteAsStop(result)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left active:bg-(--color-surface-muted)">
                    <Plus size={17} className="shrink-0 text-(--color-progress)" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate text-sm text-(--color-text)">{result.displayName}</span>
                  </button>
                ))}
              </>
            )}

            {!searching && localMatches.length === 0 && remoteResults.length === 0 && (
              <p className="px-4 py-4 text-center text-sm text-(--color-text-muted)">Sin resultados para "{query}".</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
