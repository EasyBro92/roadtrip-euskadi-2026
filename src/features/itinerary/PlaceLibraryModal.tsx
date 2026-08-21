import { Check, Plus, Search, Star, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useTripStore } from "../../stores/useTripStore";
import { useUIStore } from "../../stores/useUIStore";
import { thumbStyle } from "../../utils/categoryGradient";

/**
 * Biblioteca de lugares opcionales embebida en un modal, para poder añadir
 * uno al itinerario sin salir de la pantalla (antes había que ir a
 * Más → Lugares opcionales y volver).
 */
export function PlaceLibraryModal({ dayId }: { dayId: string }) {
  const places = useTripStore((s) => s.places);
  const addPlaceToRoute = useTripStore((s) => s.addPlaceToRoute);
  const days = useTripStore((s) => s.trip.days);
  const closeModal = useUIStore((s) => s.closeModal);
  const pushToast = useUIStore((s) => s.pushToast);
  const [query, setQuery] = useState("");

  const day = days.find((d) => d.id === dayId);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return places;
    return places.filter((p) => p.name.toLowerCase().includes(q) || p.region.toLowerCase().includes(q) || p.category.includes(q));
  }, [places, query]);

  return (
    <div className="fixed inset-0 z-[2100] flex items-end justify-center bg-black/40" onClick={closeModal}>
      <div className="safe-bottom flex max-h-[85dvh] w-full max-w-lg flex-col rounded-t-[28px] bg-(--color-surface)" onClick={(e) => e.stopPropagation()}>
        <div className="shrink-0 p-5 pb-3">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-lg font-medium">Añadir un lugar</h2>
            <button aria-label="Cerrar" onClick={closeModal}>
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <p className="mb-3 text-sm text-(--color-text-muted)">Se añadirá al día {day ? day.index + 1 : ""}.</p>
          <div className="flex h-11 items-center gap-2 rounded-full border px-4" style={{ borderColor: "var(--color-border)" }}>
            <Search size={16} className="shrink-0 text-(--color-text-muted)" aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar lugar"
              aria-label="Buscar lugar opcional"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-(--color-text-muted)"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 pb-5">
          {filtered.length === 0 && <p className="py-6 text-center text-sm text-(--color-text-muted)">Sin resultados.</p>}
          {filtered.map((place) => (
            <div key={place.id} className="flex items-center gap-3 rounded-xl border p-2.5" style={{ borderColor: "var(--color-border)" }}>
              <div className="h-12 w-12 shrink-0 rounded-xl" style={thumbStyle(place.heroImage, place.category)} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{place.name}</p>
                <p className="truncate text-xs text-(--color-text-muted)">
                  {place.region} · +{place.extraTimeMinutes} min
                </p>
                <p className="flex items-center gap-1 text-xs text-(--color-text-muted)">
                  <Star size={11} fill="currentColor" className="text-(--color-gastronomy)" aria-hidden="true" /> {place.photographyRating}/5
                </p>
              </div>
              {place.addedToRoute ? (
                <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-(--color-completed)">
                  <Check size={13} aria-hidden="true" /> En ruta
                </span>
              ) : (
                <button
                  onClick={() => {
                    addPlaceToRoute(place.id, dayId);
                    pushToast(`${place.name} añadido al día ${day ? day.index + 1 : ""}.`, "success");
                  }}
                  className="flex shrink-0 items-center gap-1 rounded-full bg-(--color-navigation) px-3 py-1.5 text-xs font-medium text-white"
                >
                  <Plus size={12} aria-hidden="true" /> Añadir
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
