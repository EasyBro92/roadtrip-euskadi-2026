import { ArrowLeft, Bookmark, Check, Navigation, Plus, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTripStore } from "../stores/useTripStore";
import { useUIStore } from "../stores/useUIStore";
import type { Place, StopCategory } from "../types";
import { thumbStyle } from "../utils/categoryGradient";
import { openExternalUrl } from "../utils/openExternal";

const FILTERS: { id: StopCategory | "todos" | "imprescindibles" | "sin-desvio"; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "imprescindibles", label: "Imprescindibles" },
  { id: "sin-desvio", label: "Sin desvío" },
  { id: "paisaje", label: "Paisajes" },
  { id: "gastronomia", label: "Gastronomía" },
  { id: "ciudad", label: "Ciudades" },
  { id: "pueblo", label: "Pueblos" },
  { id: "cultura", label: "Cultura" },
];

export function PlacesLibraryPage() {
  const navigate = useNavigate();
  const places = useTripStore((s) => s.places);
  const trip = useTripStore((s) => s.trip);
  const addPlaceToRoute = useTripStore((s) => s.addPlaceToRoute);
  const toggleSaveForLater = useTripStore((s) => s.toggleSaveForLater);
  const openModal = useUIStore((s) => s.openModal);
  const pushToast = useUIStore((s) => s.pushToast);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("todos");

  /** Añadir al itinerario preguntando siempre a qué día. */
  function askDayAndAdd(place: Place) {
    openModal({
      type: "day-picker",
      title: `Añadir ${place.name}`,
      message: `+${place.extraTimeMinutes} min de desvío · ${place.recommendedDurationMinutes} min de visita. ¿A qué día lo añado?`,
      onPick: (dayId) => {
        addPlaceToRoute(place.id, dayId);
        const day = trip.days.find((d) => d.id === dayId);
        pushToast(`${place.name} añadido al día ${day ? day.index + 1 : ""}.`, "success");
      },
    });
  }

  /** El marcador ofrece guardar para después o añadirlo ya a un día concreto. */
  function handleSave(place: Place) {
    if (place.savedForLater) {
      toggleSaveForLater(place.id);
      pushToast(`${place.name} ya no está guardado.`, "info");
      return;
    }
    openModal({
      type: "confirm",
      title: `Guardar ${place.name}`,
      message: "¿Solo guardarlo para decidir después, o añadirlo ya a un día del itinerario?",
      confirmLabel: "Añadir a un día",
      cancelLabel: "Solo guardar",
      onCancel: () => {
        toggleSaveForLater(place.id);
        pushToast(`${place.name} guardado para después.`, "success");
      },
      onConfirm: () => askDayAndAdd(place),
    });
  }

  const filtered = useMemo(() => {
    return places.filter((p) => {
      if (filter === "todos") return true;
      if (filter === "imprescindibles") return p.isMustSee;
      if (filter === "sin-desvio") return (p.extraTimeMinutes ?? 0) <= 15;
      return p.category === filter;
    });
  }, [places, filter]);

  return (
    <div className="safe-x h-full overflow-y-auto bg-(--color-bg) px-4 pt-4 pb-8">
      <button onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1 text-sm text-(--color-text-muted)">
        <ArrowLeft size={15} aria-hidden="true" /> Atrás
      </button>
      <h1 className="mb-3 text-xl font-bold">Lugares opcionales</h1>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${filter === f.id ? "bg-(--color-navigation) text-white border-(--color-navigation)" : "bg-(--color-surface)"}`}
            style={filter !== f.id ? { borderColor: "var(--color-border)" } : undefined}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((place) => (
          <div key={place.id} className="overflow-hidden rounded-(--radius-card) border bg-(--color-surface) shadow-(--shadow-card)" style={{ borderColor: "var(--color-border)" }}>
            <div className="h-28 bg-cover bg-center" style={thumbStyle(place.heroImage, place.category)} aria-hidden="true" />
            <div className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{place.name}</p>
                  <p className="truncate text-xs text-(--color-text-muted)">{place.region} · {place.category}</p>
                </div>
                <button aria-label="Guardar para después" className="shrink-0" onClick={() => handleSave(place)}>
                  <Bookmark size={18} fill={place.savedForLater ? "var(--color-navigation)" : "none"} color="var(--color-navigation)" aria-hidden="true" />
                </button>
              </div>
              <p className="mt-1.5 text-xs text-(--color-text)">{place.shortDescription}</p>
              <div className="mt-2 flex items-center gap-3 text-xs text-(--color-text-muted)">
                <span className="flex items-center gap-1">
                  <Star size={12} aria-hidden="true" /> {place.photographyRating}/5
                </span>
                <span>+{place.extraTimeMinutes} min</span>
                <span>{place.distanceFromRouteKm} km desvío</span>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() =>
                    openExternalUrl(
                      `https://www.google.com/maps/dir/?api=1&destination=${place.coordinates.latitude},${place.coordinates.longitude}&travelmode=driving`,
                    )
                  }
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-(--color-navigation) py-2 text-xs font-medium text-white"
                >
                  <Navigation size={13} aria-hidden="true" /> Iniciar ruta
                </button>
                {place.addedToRoute ? (
                  <span className="flex flex-1 items-center justify-center gap-1 rounded-full border py-2 text-xs font-medium text-(--color-completed)" style={{ borderColor: "var(--color-border)" }}>
                    <Check size={13} aria-hidden="true" /> En tu ruta
                  </span>
                ) : (
                  <button
                    onClick={() => askDayAndAdd(place)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-full border py-2 text-xs font-medium text-(--color-navigation)"
                    style={{ borderColor: "var(--color-navigation)" }}
                  >
                    <Plus size={13} aria-hidden="true" /> Añadir al itinerario
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
