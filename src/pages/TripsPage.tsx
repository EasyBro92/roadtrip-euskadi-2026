import { CalendarDays, Compass, MapPin, Plus, Trash2, Wallet, Wand2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTripStore } from "../stores/useTripStore";
import { useUIStore } from "../stores/useUIStore";
import { formatEUR } from "../utils/format";
import { toISODate } from "../utils/dates";

function formatRango(inicio: string, fin: string): string {
  const opciones: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
    const desde = new Date(`${inicio}T00:00:00`).toLocaleDateString("es-ES", opciones);
  const hasta = new Date(`${fin}T00:00:00`).toLocaleDateString("es-ES", { ...opciones, year: "numeric" });
  return `${desde} — ${hasta}`;
}

/** Formulario mínimo para arrancar un viaje: lo demás se edita ya dentro. */
function NuevoViaje({ onCerrar }: { onCerrar: () => void }) {
  const createTrip = useTripStore((s) => s.createTrip);
  const pushToast = useUIStore((s) => s.pushToast);
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(toISODate(new Date()));
  const [dayCount, setDayCount] = useState(3);

  function crear() {
    if (!name.trim()) {
      pushToast("Ponle un nombre al viaje.", "error");
      return;
    }
    createTrip({ name, startDate, dayCount });
    pushToast(`Viaje "${name.trim()}" creado.`, "success");
    onCerrar();
    navigate("/viaje");
  }

  return (
    <div className="rounded-(--radius-card) border bg-(--color-surface) p-4 shadow-(--shadow-card)" style={{ borderColor: "var(--color-border)" }}>
      <h2 className="text-sm font-semibold">Nuevo viaje</h2>

      <label className="mt-3 block text-xs text-(--color-text-muted)">
        Nombre
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ruta por la Costa Brava"
          className="mt-1 w-full rounded-(--radius-control) border bg-(--color-bg) px-3 py-2.5 text-sm text-(--color-text)"
          style={{ borderColor: "var(--color-border)" }}
        />
      </label>

      <div className="mt-3 flex gap-2">
        <label className="flex-1 text-xs text-(--color-text-muted)">
          Primer día
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 w-full rounded-(--radius-control) border bg-(--color-bg) px-3 py-2.5 text-sm text-(--color-text)"
            style={{ borderColor: "var(--color-border)" }}
          />
        </label>
        <label className="w-24 text-xs text-(--color-text-muted)">
          Días
          <input
            type="number"
            min={1}
            max={60}
            value={dayCount}
            onChange={(e) => setDayCount(Number(e.target.value))}
            className="mt-1 w-full rounded-(--radius-control) border bg-(--color-bg) px-3 py-2.5 text-sm text-(--color-text)"
            style={{ borderColor: "var(--color-border)" }}
          />
        </label>
      </div>

      <div className="mt-4 flex gap-2">
        <button onClick={onCerrar} className="flex-1 rounded-full border py-2.5 text-sm font-medium" style={{ borderColor: "var(--color-border)" }}>
          Cancelar
        </button>
        <button onClick={crear} className="flex-1 rounded-full bg-(--color-navigation) py-2.5 text-sm font-medium text-white">
          Crear viaje
        </button>
      </div>
    </div>
  );
}

/**
 * Nivel superior de la app (sección nueva): Easy Travel guarda varios viajes
 * y esta es su lista. Al entrar en uno se activa y se navega a su Resumen,
 * desde donde ya funcionan el mapa, el itinerario y el resto.
 */
export function TripsPage() {
  const listTrips = useTripStore((s) => s.listTrips);
  const switchTrip = useTripStore((s) => s.switchTrip);
  const deleteTrip = useTripStore((s) => s.deleteTrip);
  const openModal = useUIStore((s) => s.openModal);
  const pushToast = useUIStore((s) => s.pushToast);
  const navigate = useNavigate();

  const [creando, setCreando] = useState(false);
  const trips = listTrips();

  function abrir(id: string, activo: boolean) {
    if (!activo) switchTrip(id);
    navigate("/viaje");
  }

  function borrar(id: string, nombre: string) {
    if (trips.length === 1) {
      pushToast("Es tu único viaje: crea otro antes de borrarlo.", "info");
      return;
    }
    openModal({
      type: "confirm",
      title: "Borrar viaje",
      message: `Se borrará "${nombre}" con sus paradas, gastos y diario. Esto no se puede deshacer.`,
      confirmLabel: "Borrar",
      onConfirm: () => {
        deleteTrip(id);
        pushToast(`Viaje "${nombre}" borrado.`, "success");
      },
    });
  }

  return (
    <div className="safe-x min-h-dvh bg-(--color-bg) pb-10 pt-[calc(env(safe-area-inset-top)+20px)]">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-(--color-text)">Mis viajes</h1>
          <p className="text-sm text-(--color-text-muted)">{trips.length === 1 ? "1 viaje" : `${trips.length} viajes`}</p>
        </div>
        <button
          onClick={() => navigate("/explorar")}
          className="flex items-center gap-1.5 rounded-full border bg-(--color-surface) px-3.5 py-2 text-sm font-medium text-(--color-text)"
          style={{ borderColor: "var(--color-border)" }}
        >
          <Compass size={16} aria-hidden="true" /> Explorar
        </button>
      </header>

      {creando ? (
        <NuevoViaje onCerrar={() => setCreando(false)} />
      ) : (
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => navigate("/crear")}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-(--color-navigation) py-3.5 text-sm font-medium text-white shadow-(--shadow-card) transition-transform active:scale-[0.98]"
          >
            <Wand2 size={17} aria-hidden="true" /> Proponme un viaje
          </button>
          <button
            onClick={() => setCreando(true)}
            aria-label="Crear un viaje vacío"
            className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full border bg-(--color-surface) text-(--color-text)"
            style={{ borderColor: "var(--color-border)" }}
          >
            <Plus size={20} aria-hidden="true" />
          </button>
        </div>
      )}

      <ul className="mt-4 flex flex-col gap-3">
        {trips.map((t) => (
          <li key={t.id}>
            <div
              className="rounded-(--radius-card) border bg-(--color-surface) p-4 shadow-(--shadow-card)"
              style={{ borderColor: t.isActive ? "var(--color-navigation)" : "var(--color-border)" }}
            >
              <button onClick={() => abrir(t.id, t.isActive)} className="w-full text-left">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-base font-semibold text-(--color-text)">{t.name}</h2>
                  {t.isActive && (
                    <span className="shrink-0 rounded-full bg-(--color-navigation)/10 px-2.5 py-1 text-[11px] font-medium text-(--color-navigation)">
                      En curso
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-(--color-text-muted)">{formatRango(t.startDate, t.endDate)}</p>

                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-(--color-text-muted)">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays size={14} aria-hidden="true" /> {t.dayCount} {t.dayCount === 1 ? "día" : "días"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin size={14} aria-hidden="true" /> {t.stopCount} {t.stopCount === 1 ? "parada" : "paradas"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Wallet size={14} aria-hidden="true" /> {formatEUR(t.budgetEUR)}
                  </span>
                </div>
              </button>

              <div className="mt-3 flex justify-end border-t pt-3" style={{ borderColor: "var(--color-border)" }}>
                <button
                  onClick={() => borrar(t.id, t.name)}
                  aria-label={`Borrar el viaje ${t.name}`}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-(--color-cancelled)"
                >
                  <Trash2 size={14} aria-hidden="true" /> Borrar
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
