import { Check, MapPin, Plus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTripStore } from "../stores/useTripStore";
import { useUIStore } from "../stores/useUIStore";

function rango(inicio: string, fin: string): string {
  const opciones: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const desde = new Date(`${inicio}T00:00:00`).toLocaleDateString("es-ES", opciones);
  const hasta = new Date(`${fin}T00:00:00`).toLocaleDateString("es-ES", { ...opciones, year: "numeric" });
  return `${desde} — ${hasta}`;
}

/**
 * Salto rápido entre viajes sin pasar por Mis viajes.
 *
 * Cambiar de viaje te deja donde estabas: si lo abres desde el itinerario,
 * sigues en el itinerario pero del otro viaje. Sacarte a otra pantalla cada
 * vez sería justo lo que este atajo intenta evitar.
 */
export function TripSwitcherModal() {
  const listTrips = useTripStore((s) => s.listTrips);
  const switchTrip = useTripStore((s) => s.switchTrip);
  const closeModal = useUIStore((s) => s.closeModal);
  const pushToast = useUIStore((s) => s.pushToast);
  const navigate = useNavigate();

  const viajes = listTrips();

  function elegir(id: string, nombre: string, activo: boolean) {
    closeModal();
    if (activo) return;
    switchTrip(id);
    pushToast(`Ahora estás en "${nombre}".`, "success");
  }

  return (
    <div className="fixed inset-0 z-[2100] flex items-end justify-center bg-black/40" onClick={closeModal}>
      <div
        className="max-h-[80dvh] w-full overflow-y-auto rounded-t-[28px] bg-(--color-surface) p-5 pb-8 shadow-(--shadow-sheet) safe-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Cambiar de viaje</h2>
          <button onClick={closeModal} aria-label="Cerrar" className="p-1 text-(--color-text-muted)">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <ul className="flex flex-col gap-2">
          {viajes.map((v) => (
            <li key={v.id}>
              <button
                onClick={() => elegir(v.id, v.name, v.isActive)}
                aria-current={v.isActive ? "true" : undefined}
                className="flex w-full items-center gap-3 rounded-(--radius-card) border p-3 text-left"
                style={{ borderColor: v.isActive ? "var(--color-navigation)" : "var(--color-border)" }}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-(--color-text)">{v.name}</span>
                  <span className="mt-0.5 flex items-center gap-3 text-xs text-(--color-text-muted)">
                    <span>{rango(v.startDate, v.endDate)}</span>
                    <span className="flex items-center gap-1">
                      <MapPin size={12} aria-hidden="true" /> {v.stopCount}
                    </span>
                  </span>
                </span>
                {v.isActive && <Check size={18} className="shrink-0 text-(--color-link)" aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>

        <button
          onClick={() => {
            closeModal();
            navigate("/viajes");
          }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border py-3 text-sm font-medium text-(--color-text)"
          style={{ borderColor: "var(--color-border)" }}
        >
          <Plus size={16} aria-hidden="true" /> Crear o gestionar viajes
        </button>
      </div>
    </div>
  );
}
