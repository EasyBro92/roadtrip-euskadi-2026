import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useBusquedaDeLugares } from "../../hooks/useBusquedaDeLugares";
import { recuadroDe } from "../../services/geocoding/zonaDelViaje";
import { useTripStore } from "../../stores/useTripStore";
import { useUIStore } from "../../stores/useUIStore";
import { STOP_CATEGORIES, type StopCategory } from "../../types";
import { PhotoPicker } from "./PhotoPicker";

/** Recorre la lista única: así ninguna categoría nueva se queda fuera. */
const CATEGORIES = STOP_CATEGORIES;

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
  const [heroImage, setHeroImage] = useState(existing?.heroImage);
  /*
   * La consulta va aparte del nombre, aunque escribir en el buscador rellene
   * los dos.
   *
   * Al elegir un resultado se pone su nombre en el campo, y si el buscador
   * leyera de ahí se buscaría a sí mismo: eliges "Getaria" y vuelve a
   * aparecer la lista con Getaria dentro. Con `elegido` la búsqueda se calla
   * hasta que vuelvas a escribir.
   */
  const [consulta, setConsulta] = useState("");
  const [elegido, setElegido] = useState(false);

  /* Se prefieren los lugares cerca del viaje: ver `recuadroDe`. */
  const stopsById = useTripStore((s) => s.stopsById);
  const zona = useMemo(() => recuadroDe(Object.values(stopsById).map((s) => s.coordinates)), [stopsById]);

  const { resultados, buscando } = useBusquedaDeLugares(elegido ? "" : consulta, {
    cerca: zona,
    alFallar: (mensaje) => pushToast(`Búsqueda de lugar falló: ${mensaje}`, "error"),
  });

  function handleSave() {
    if (!name.trim()) {
      pushToast("El nombre es obligatorio.", "error");
      return;
    }
    if (existing) {
      updateStop(existing.id, { name, category, shortDescription, heroImage, ...(coordinates ? { coordinates } : {}) });
    } else {
      if (!coordinates) {
        pushToast("Busca el lugar o indica coordenadas antes de guardar.", "error");
        return;
      }
      const nuevoId = addStop(dayId, { name, category, coordinates, shortDescription });
      // addStop no acepta foto: se aplica justo después sobre la parada creada.
      if (heroImage && nuevoId) updateStop(nuevoId, { heroImage });
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
            {/* "Nominatim/OpenStreetMap" era de dónde salen los datos, no algo
                que ayude a nadie a buscar. Lo que hace falta saber es que se
                busca en el mapa, no en tu viaje. */}
            <label className="mb-1 block text-xs font-medium text-(--color-text-muted)">Buscar el lugar en el mapa</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-text-muted)" aria-hidden="true" />
              <input
                value={consulta}
                onChange={(e) => {
                  setConsulta(e.target.value);
                  setElegido(false);
                  setName(e.target.value);
                }}
                placeholder="Un pueblo, un restaurante, un mirador…"
                className="w-full rounded-(--radius-control) border bg-(--color-bg) py-2.5 pl-9 pr-3 text-sm text-(--color-text)"
                style={{ borderColor: "var(--color-border)" }}
              />
            </div>

            {buscando && <p className="mt-1.5 text-xs text-(--color-text-muted)">Buscando…</p>}

            {resultados.length > 0 && (
              <ul className="mt-2 divide-y overflow-hidden rounded-(--radius-control) border" style={{ borderColor: "var(--color-border)" }}>
                {resultados.map((result, i) => {
                  // El nombre primero y el resto en gris debajo: en una línea
                  // corrida, "Getaria" se perdía dentro de "Getaria, Urola
                  // Kosta, Gipuzkoa, Euskadi, 20808, España".
                  const [titulo, ...resto] = result.displayName.split(",");
                  return (
                    <li key={`${result.coordinates.latitude},${result.coordinates.longitude},${i}`}>
                      <button
                        onClick={() => {
                          setName(titulo);
                          setCoordinates(result.coordinates);
                          setConsulta(titulo);
                          setElegido(true);
                        }}
                        className="block w-full px-3 py-2.5 text-left"
                      >
                        <span className="block truncate text-sm text-(--color-text)">{titulo}</span>
                        {resto.length > 0 && <span className="block truncate text-xs text-(--color-text-muted)">{resto.join(",").trim()}</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {coordinates && (
              <p className="mt-1.5 text-xs text-(--color-completed)">
                Sitio elegido: {coordinates.latitude.toFixed(4)}, {coordinates.longitude.toFixed(4)}
              </p>
            )}
          </div>
        )}

        <label className="mb-1 block text-xs font-medium text-(--color-text-muted)">Nombre</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="mb-3 w-full rounded-(--radius-control) border bg-(--color-bg) px-3 py-2.5 text-sm text-(--color-text)" style={{ borderColor: "var(--color-border)" }} />

        <label className="mb-1 block text-xs font-medium text-(--color-text-muted)">Categoría</label>
        <select value={category} onChange={(e) => setCategory(e.target.value as StopCategory)} className="mb-3 w-full rounded-(--radius-control) border bg-(--color-bg) px-3 py-2.5 text-sm text-(--color-text)" style={{ borderColor: "var(--color-border)" }}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <label className="mb-1 block text-xs font-medium text-(--color-text-muted)">Descripción corta</label>
        <textarea value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} rows={2} className="mb-4 w-full rounded-(--radius-control) border bg-(--color-bg) px-3 py-2.5 text-sm text-(--color-text)" style={{ borderColor: "var(--color-border)" }} />

        <PhotoPicker coordinates={coordinates ?? undefined} name={name} value={heroImage} onChange={setHeroImage} />

        <button onClick={handleSave} className="w-full rounded-(--radius-control) bg-(--color-navigation) py-3 text-sm font-semibold text-white">
          Guardar
        </button>
      </div>
    </div>
  );
}
