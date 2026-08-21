import { Search, X } from "lucide-react";
import { useState } from "react";
import { GeocodingService, debounce, type GeocodingResult } from "../../services/geocoding/GeocodingService";
import { useTripStore } from "../../stores/useTripStore";
import { useUIStore } from "../../stores/useUIStore";
import type { StopCategory } from "../../types";

const CATEGORIES: StopCategory[] = ["naturaleza", "fotografia", "paisaje", "mirador", "gastronomia", "hotel", "estadio", "cultura", "pueblo", "historia", "aparcamiento", "playa", "castillo"];

/** Editor de parada (sección 25): añadir buscando por nombre (Nominatim) o editando una existente. */
export function StopEditorModal({ stopId, dayId }: { stopId: string | null; dayId: string }) {
  const closeModal = useUIStore((s) => s.closeModal);
  const pushToast = useUIStore((s) => s.pushToast);
  const existing = useTripStore((s) => (stopId ? s.stopsById[stopId] : null));
  const addStop = useTripStore((s) => s.addStop);
  const updateStop = useTripStore((s) => s.updateStop);

  const [name, setName] = useState(existing?.name ?? "");
  const [category, setCategory] = useState<StopCategory>(existing?.category ?? "pueblo");
  const [coordinates, setCoordinates] = useState(existing?.coordinates ?? null);
  const [shortDescription, setShortDescription] = useState(existing?.shortDescription ?? "");
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [searching, setSearching] = useState(false);

  const search = debounce(async (query: string) => {
    if (query.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await GeocodingService.search(query);
      setSearchResults(results);
    } catch (error) {
      pushToast(`Búsqueda de lugar falló: ${(error as Error).message}`, "error");
    } finally {
      setSearching(false);
    }
  }, 400);

  function handleSave() {
    if (!name.trim()) {
      pushToast("El nombre es obligatorio.", "error");
      return;
    }
    if (existing) {
      updateStop(existing.id, { name, category, shortDescription, ...(coordinates ? { coordinates } : {}) });
    } else {
      if (!coordinates) {
        pushToast("Busca el lugar o indica coordenadas antes de guardar.", "error");
        return;
      }
      addStop(dayId, { name, category, coordinates });
    }
    closeModal();
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/40" onClick={closeModal}>
      <div className="safe-bottom max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-(--color-surface) p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{existing ? "Editar parada" : "Añadir parada"}</h2>
          <button aria-label="Cerrar" onClick={closeModal}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {!existing && (
          <div className="mb-4">
            <label className="mb-1 block text-xs font-medium text-(--color-text-muted)">Buscar lugar (Nominatim/OpenStreetMap)</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-text-muted)" aria-hidden="true" />
              <input
                onChange={(e) => {
                  setName(e.target.value);
                  search(e.target.value);
                }}
                placeholder="Escribe el nombre del lugar..."
                className="w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm"
                style={{ borderColor: "var(--color-border)" }}
              />
            </div>
            {searching && <p className="mt-1 text-xs text-(--color-text-muted)">Buscando…</p>}
            {searchResults.length > 0 && (
              <ul className="mt-2 divide-y rounded-lg border" style={{ borderColor: "var(--color-border)" }}>
                {searchResults.map((result, i) => (
                  <li key={i}>
                    <button
                      onClick={() => {
                        setName(result.displayName.split(",")[0]);
                        setCoordinates(result.coordinates);
                        setSearchResults([]);
                      }}
                      className="block w-full px-3 py-2 text-left text-xs hover:bg-(--color-surface-muted)"
                    >
                      {result.displayName}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {coordinates && <p className="mt-1 text-xs text-(--color-completed)">Coordenadas seleccionadas: {coordinates.latitude.toFixed(4)}, {coordinates.longitude.toFixed(4)}</p>}
          </div>
        )}

        <label className="mb-1 block text-xs font-medium text-(--color-text-muted)">Nombre</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="mb-3 w-full rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: "var(--color-border)" }} />

        <label className="mb-1 block text-xs font-medium text-(--color-text-muted)">Categoría</label>
        <select value={category} onChange={(e) => setCategory(e.target.value as StopCategory)} className="mb-3 w-full rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: "var(--color-border)" }}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <label className="mb-1 block text-xs font-medium text-(--color-text-muted)">Descripción corta</label>
        <textarea value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} rows={2} className="mb-4 w-full rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: "var(--color-border)" }} />

        <button onClick={handleSave} className="w-full rounded-(--radius-control) bg-(--color-navigation) py-3 text-sm font-semibold text-white">
          Guardar
        </button>
      </div>
    </div>
  );
}
