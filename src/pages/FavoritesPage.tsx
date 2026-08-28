import { ArrowLeft, Heart, MapPin } from "lucide-react";
import { Vacio } from "../components/Vacio";
import { useNavigate } from "react-router-dom";
import { useTripStore } from "../stores/useTripStore";

export function FavoritesPage() {
  const navigate = useNavigate();
  const favorites = useTripStore((s) => s.favorites);
  const stopsById = useTripStore((s) => s.stopsById);
  const places = useTripStore((s) => s.places);
  const toggleFavorite = useTripStore((s) => s.toggleFavorite);
  const setCurrentStop = useTripStore((s) => s.setCurrentStop);
  const setCurrentDay = useTripStore((s) => s.setCurrentDay);

  return (
    <div className="safe-x h-full overflow-y-auto bg-(--color-bg) px-4 pt-4 pb-8">
      <button onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1 text-sm text-(--color-text-muted)">
        <ArrowLeft size={15} aria-hidden="true" /> Atrás
      </button>
      <h1 className="mb-4 text-xl font-bold">Favoritos</h1>

      {favorites.length === 0 && (
        <Vacio icon={Heart} titulo="Sin favoritos todavía" texto="Marca una parada o un lugar con el corazón y aparecerá aquí." />
      )}

      <div className="space-y-2">
        {favorites.map((fav) => {
          const stop = fav.targetType === "stop" ? stopsById[fav.targetId] : null;
          const place = fav.targetType === "place" ? places.find((p) => p.id === fav.targetId) : null;
          const name = stop?.name ?? place?.name ?? fav.targetId;

          return (
            <div key={fav.id} className="flex items-center justify-between gap-2 rounded-xl border bg-(--color-surface) p-3 shadow-(--shadow-card)" style={{ borderColor: "var(--color-border)" }}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{name}</p>
                <p className="truncate text-xs uppercase text-(--color-text-muted)">{fav.targetType}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {stop && (
                  <button
                    onClick={() => {
                      setCurrentDay(stop.dayId);
                      setCurrentStop(stop.id);
                      navigate("/mapa");
                    }}
                    className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    <MapPin size={12} aria-hidden="true" /> Ver
                  </button>
                )}
                <button aria-label="Quitar de favoritos" onClick={() => toggleFavorite(fav.targetType, fav.targetId)}>
                  <Heart size={18} fill="var(--color-hotel)" color="var(--color-hotel)" aria-hidden="true" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
