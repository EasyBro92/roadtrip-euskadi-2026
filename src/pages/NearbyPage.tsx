import { ArrowLeft, ExternalLink, Loader2, LocateFixed, MapPin } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { NEARBY_CATEGORY_LABEL, NearbyService, type NearbyCategory, type NearbyPlace } from "../services/places/NearbyService";
import { useLocationStore } from "../stores/useLocationStore";
import { useTripStore } from "../stores/useTripStore";
import { useUIStore } from "../stores/useUIStore";
import type { Coordinates } from "../types";
import { formatKm } from "../utils/format";
import { googleMapsUrl } from "../utils/geo";

const CATEGORIES = Object.keys(NEARBY_CATEGORY_LABEL) as NearbyCategory[];

export function NearbyPage() {
  const navigate = useNavigate();
  const requestSinglePosition = useLocationStore((s) => s.requestSinglePosition);
  const pushToast = useUIStore((s) => s.pushToast);
  const trip = useTripStore((s) => s.trip);
  const stopsById = useTripStore((s) => s.stopsById);

  const [category, setCategory] = useState<NearbyCategory>("gasolinera");
  const [results, setResults] = useState<NearbyPlace[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [origin, setOrigin] = useState<string>("");

  /** Referencia: tu posición real si se puede; si no, la parada actual del viaje. */
  async function resolveCenter(): Promise<{ center: Coordinates; label: string } | null> {
    if (window.isSecureContext) {
      const position = await requestSinglePosition();
      if (position) return { center: position, label: "tu ubicación" };
    }
    const currentStop = trip.currentStopId ? stopsById[trip.currentStopId] : null;
    const fallbackStop = currentStop ?? Object.values(stopsById).find((s) => s.enabled);
    if (fallbackStop) return { center: fallbackStop.coordinates, label: fallbackStop.name };
    return null;
  }

  async function search(next: NearbyCategory) {
    setCategory(next);
    setLoading(true);
    setResults(null);
    try {
      const resolved = await resolveCenter();
      if (!resolved) {
        pushToast("No hay ninguna ubicación de referencia disponible.", "error");
        return;
      }
      setOrigin(resolved.label);
      setResults(await NearbyService.search(resolved.center, next));
    } catch (error) {
      pushToast(`No se pudo consultar OpenStreetMap: ${(error as Error).message}`, "error");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="safe-x h-full overflow-y-auto bg-(--color-bg) px-4 pt-4 pb-8">
      <button onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1 text-sm text-(--color-text-muted)">
        <ArrowLeft size={15} aria-hidden="true" /> Atrás
      </button>
      <h1 className="mb-1 text-xl font-bold">Cerca de mí</h1>
      <p className="mb-4 text-xs text-(--color-text-muted)">
        Resultados reales de OpenStreetMap. La ubicación solo se pide al pulsar una categoría; sin HTTPS se usa tu parada actual como referencia.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => search(c)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
              category === c && results !== null ? "border-(--color-navigation) bg-(--color-navigation) text-white" : "bg-(--color-surface)"
            }`}
            style={!(category === c && results !== null) ? { borderColor: "var(--color-border)" } : undefined}
          >
            {NEARBY_CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>

      {loading && (
        <p className="flex items-center gap-2 text-sm text-(--color-text-muted)">
          <Loader2 size={15} className="animate-spin" aria-hidden="true" /> Buscando en OpenStreetMap…
        </p>
      )}

      {!loading && results === null && (
        <div className="flex flex-col items-center gap-2 rounded-(--radius-card) bg-(--color-surface-muted) py-10 text-center">
          <LocateFixed size={22} className="text-(--color-text-muted)" aria-hidden="true" />
          <p className="max-w-[240px] text-sm text-(--color-text-muted)">Elige una categoría para buscar sitios cercanos.</p>
        </div>
      )}

      {!loading && results?.length === 0 && (
        <p className="text-sm text-(--color-text-muted)">Sin resultados en un radio de 5 km.</p>
      )}

      {!loading && results && results.length > 0 && (
        <>
          <p className="mb-2 text-xs text-(--color-text-muted)">
            {results.length} resultados cerca de <strong>{origin}</strong>
          </p>
          <div className="space-y-2">
            {results.map((place) => (
              <a
                key={place.id}
                href={googleMapsUrl(place.name, place.coordinates)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-2 rounded-xl border bg-(--color-surface) p-3 shadow-(--shadow-card)"
                style={{ borderColor: "var(--color-border)" }}
              >
                <span className="flex min-w-0 flex-1 items-center gap-2.5">
                  <MapPin size={16} className="shrink-0 text-(--color-link)" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-(--color-text)">{place.name}</span>
                    <span className="block text-xs text-(--color-text-muted)">{formatKm(place.distanceMeters)}</span>
                  </span>
                </span>
                <ExternalLink size={14} className="shrink-0 text-(--color-text-muted)" aria-hidden="true" />
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
