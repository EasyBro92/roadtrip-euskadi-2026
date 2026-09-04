import { Compass, Plus, Search, Wand2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SwipeToDelete } from "../components/SwipeToDelete";
import { WorldMapBackdrop } from "../components/WorldMapBackdrop";
import { PilaDeViajes } from "../features/trips/PilaDeViajes";
import { repartirViajes } from "../features/trips/repartirViajes";
import { TarjetaViaje } from "../features/trips/TarjetaViaje";
import { useTripStore } from "../stores/useTripStore";
import { useUIStore } from "../stores/useUIStore";
import { toISODate } from "../utils/dates";

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
  const { activo, proximos, terminados } = repartirViajes(trips, toISODate(new Date()));

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
    <div className="safe-x relative isolate min-h-dvh bg-(--color-bg) pb-10 pt-[calc(env(safe-area-inset-top)+20px)]">
      <WorldMapBackdrop />
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
          {/* Con forma de buscador y no de botón: lo que se espera aquí es
              escribir un destino, y un campo lo invita mejor que una píldora.
              Al tocarlo se abre la pantalla del generador con el foco puesto. */}
          <button
            onClick={() => navigate("/crear")}
            className="flex flex-1 items-center gap-2.5 rounded-full border bg-(--color-surface) px-4 py-3.5 text-left shadow-(--shadow-card) transition-transform active:scale-[0.99]"
            style={{ borderColor: "var(--color-border)" }}
          >
            <Search size={18} className="shrink-0 text-(--color-text-muted)" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-sm text-(--color-text-muted)">¿A dónde quieres ir?</span>
            <Wand2 size={16} className="shrink-0 text-(--color-link)" aria-hidden="true" />
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

      {/* El que está en marcha, grande y solo: es el que se abre el 95% de
          las veces que se entra aquí. */}
      {activo && (
        <div className="mt-4">
          <SwipeToDelete deleteLabel={`Borrar el viaje ${activo.name}`} onDelete={() => borrar(activo.id, activo.name)} radio="rounded-(--radius-card)">
            <TarjetaViaje viaje={activo} alAbrir={() => abrir(activo.id, activo.isActive)} />
          </SwipeToDelete>
        </div>
      )}

      {proximos.length > 0 && (
        <ul className="mt-3 flex flex-col gap-3">
          {proximos.map((t) => (
            <li key={t.id}>
              {/* Se borra deslizando, igual que los gastos. Antes cada tarjeta
                  llevaba su botón de Borrar en rojo: mucho ruido para una acción
                  que casi nunca se usa, y en la portada de la app. */}
              <SwipeToDelete deleteLabel={`Borrar el viaje ${t.name}`} onDelete={() => borrar(t.id, t.name)} radio="rounded-(--radius-card)">
                <TarjetaViaje viaje={t} alAbrir={() => abrir(t.id, t.isActive)} />
              </SwipeToDelete>
            </li>
          ))}
        </ul>
      )}

      <PilaDeViajes viajes={terminados} alAbrir={abrir} alBorrar={borrar} />
    </div>
  );
}
