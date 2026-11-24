import { BedDouble, Compass, Download, Map as MapIcon, Plane, Plus, Route, Search, Wallet, Wand2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SwipeToDelete } from "../components/SwipeToDelete";
import { TODAS_LAS_RUTAS } from "../data/routeTemplates.data";
import { TarjetaIdea } from "../features/inicio/TarjetaIdea";
import { PilaDeViajes } from "../features/trips/PilaDeViajes";
import { repartirViajes } from "../features/trips/repartirViajes";
import { TarjetaViaje } from "../features/trips/TarjetaViaje";
import { useTripStore } from "../stores/useTripStore";
import { useUIStore } from "../stores/useUIStore";
import type { RouteTemplate } from "../types";
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

/** Unas pocas rutas para inspirarse, siempre las mismas en el mismo día para que no bailen al volver. */
function ideasDelDia(): RouteTemplate[] {
  const roadtrips = TODAS_LAS_RUTAS.filter((r) => (r.tipo ?? "roadtrip") === "roadtrip" && r.stops.length > 0);
  const dia = Math.floor(Date.now() / 86_400_000);
  const desde = roadtrips.length ? dia % roadtrips.length : 0;
  return [...roadtrips.slice(desde), ...roadtrips.slice(0, desde)].slice(0, 8);
}

function Seccion({ titulo, accion, children }: { titulo: string; accion?: { etiqueta: string; alPulsar: () => void }; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-bold text-(--color-text)">{titulo}</h2>
        {accion && (
          <button onClick={accion.alPulsar} className="control-en-linea text-sm font-semibold text-(--color-link)">
            {accion.etiqueta}
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

/**
 * La pantalla de inicio de la app, al estilo de la portada de Booking.
 *
 * Una cabecera azul con el buscador rodeado de amarillo —lo primero que ves
 * y lo que más se usa—, accesos rápidos debajo, y luego tus viajes por
 * secciones: el que tienes en marcha con atajos a sus pantallas, los
 * próximos, ideas de rutas para el siguiente y los que ya hiciste.
 *
 * Es también la pantalla a la que se vuelve desde dentro de cualquier
 * viaje, con el botón de inicio de la barra de arriba.
 */
export function TripsPage() {
  const listTrips = useTripStore((s) => s.listTrips);
  const switchTrip = useTripStore((s) => s.switchTrip);
  const deleteTrip = useTripStore((s) => s.deleteTrip);
  const openModal = useUIStore((s) => s.openModal);
  const pushToast = useUIStore((s) => s.pushToast);
  const navigate = useNavigate();

  const [creando, setCreando] = useState(false);
  const [ideas] = useState(ideasDelDia);
  const trips = listTrips();
  const { activo, proximos, terminados } = repartirViajes(trips, toISODate(new Date()));

  function abrir(id: string, activo: boolean, destino = "/viaje") {
    if (!activo) switchTrip(id);
    navigate(destino);
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

  const accesos = [
    { etiqueta: "Crear con IA", icono: Wand2, alPulsar: () => navigate("/crear") },
    { etiqueta: "Explorar rutas", icono: Compass, alPulsar: () => navigate("/explorar") },
    { etiqueta: "Viaje vacío", icono: Plus, alPulsar: () => setCreando(true) },
    { etiqueta: "Importar", icono: Download, alPulsar: () => navigate("/importar") },
  ];

  return (
    <div className="h-full overflow-y-auto bg-(--color-bg) pb-12">
      <header className="cabecera-marca safe-x relative overflow-hidden rounded-b-[28px] bg-(--color-brand) pb-6 pt-[calc(env(safe-area-inset-top)+14px)] text-white">
        {/* Dos círculos de luz que se mueven despacio: dan vida a la cabecera sin distraer. */}
        <span className="luz-cabecera luz-1" aria-hidden="true" />
        <span className="luz-cabecera luz-2" aria-hidden="true" />

        <div className="relative flex items-center justify-between">
          <p className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
              <Plane size={17} aria-hidden="true" />
            </span>
            Easy Travel
          </p>
          <span className="text-sm text-white/75">{trips.length === 1 ? "1 viaje" : `${trips.length} viajes`}</span>
        </div>

        <h1 className="aparece-arriba relative mt-5 text-[1.75rem] font-extrabold leading-tight">¿A dónde vamos ahora?</h1>
        <p className="aparece-arriba relative mt-1 text-sm text-white/80" style={{ animationDelay: "60ms" }}>
          Tus viajes, rutas e ideas, todo en un sitio.
        </p>

        {/* El buscador con el borde amarillo grueso: es lo que más se ve
            de la portada y lo que más se usa. */}
        <button
          onClick={() => navigate("/crear")}
          className="aparece-arriba relative mt-4 flex w-full items-center gap-3 rounded-2xl border-[3px] border-(--color-accent) bg-white px-4 py-3.5 text-left text-[#1a1a1a] shadow-lg"
          style={{ animationDelay: "120ms" }}
        >
          <Search size={20} className="shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-base font-semibold">¿A dónde quieres ir?</span>
            <span className="block truncate text-xs text-[#595959]">Dime un destino y te monto la ruta día a día</span>
          </span>
          <Wand2 size={18} className="shrink-0 text-(--color-navigation)" aria-hidden="true" />
        </button>

        <div className="scrollbar-none relative -mx-5 mt-4 flex gap-2 overflow-x-auto px-5">
          {accesos.map((a, i) => (
            <button
              key={a.etiqueta}
              onClick={a.alPulsar}
              className="aparece-arriba flex shrink-0 items-center gap-1.5 rounded-full border border-white/35 bg-white/10 px-3.5 py-2 text-sm font-medium text-white"
              style={{ animationDelay: `${180 + i * 50}ms` }}
            >
              <a.icono size={15} aria-hidden="true" /> {a.etiqueta}
            </button>
          ))}
        </div>
      </header>

      <div className="safe-x cascada">
        {creando && (
          <div className="mt-5">
            <NuevoViaje onCerrar={() => setCreando(false)} />
          </div>
        )}

        {/* El que está en marcha, grande y con atajos: es el que se abre el
            95% de las veces que se entra aquí. */}
        {activo && (
          <Seccion titulo="Continúa tu viaje">
            <SwipeToDelete deleteLabel={`Borrar el viaje ${activo.name}`} onDelete={() => borrar(activo.id, activo.name)} radio="rounded-(--radius-card)">
              <TarjetaViaje viaje={activo} alAbrir={() => abrir(activo.id, activo.isActive)} alto="h-52" />
            </SwipeToDelete>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {[
                { etiqueta: "Mapa", icono: MapIcon, destino: "/mapa" },
                { etiqueta: "Días", icono: Route, destino: "/itinerario" },
                { etiqueta: "Dormir", icono: BedDouble, destino: "/mas/dormir" },
                { etiqueta: "Gastos", icono: Wallet, destino: "/gastos" },
              ].map((a) => (
                <button
                  key={a.destino}
                  onClick={() => abrir(activo.id, activo.isActive, a.destino)}
                  className="tarjeta-elevable flex flex-col items-center gap-1 rounded-2xl border bg-(--color-surface) py-2.5 text-xs font-semibold text-(--color-text) shadow-(--shadow-card)"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <a.icono size={20} className="text-(--color-link)" aria-hidden="true" />
                  {a.etiqueta}
                </button>
              ))}
            </div>
          </Seccion>
        )}

        {proximos.length > 0 && (
          <Seccion titulo="Próximos viajes">
            <ul className="flex flex-col gap-3">
              {proximos.map((t) => (
                <li key={t.id}>
                  {/* Se borra deslizando, igual que los gastos. */}
                  <SwipeToDelete deleteLabel={`Borrar el viaje ${t.name}`} onDelete={() => borrar(t.id, t.name)} radio="rounded-(--radius-card)">
                    <TarjetaViaje viaje={t} alAbrir={() => abrir(t.id, t.isActive)} />
                  </SwipeToDelete>
                </li>
              ))}
            </ul>
          </Seccion>
        )}

        {ideas.length > 0 && (
          <Seccion titulo="Ideas para tu próximo viaje" accion={{ etiqueta: "Ver todas", alPulsar: () => navigate("/explorar") }}>
            <div className="scrollbar-none -mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-2">
              {ideas.map((r) => (
                <TarjetaIdea key={r.id} ruta={r} alAbrir={() => navigate(`/explorar?q=${encodeURIComponent(r.name)}`)} />
              ))}
            </div>
          </Seccion>
        )}

        {terminados.length > 0 && (
          <Seccion titulo="Viajes que ya hiciste">
            <PilaDeViajes viajes={terminados} alAbrir={abrir} alBorrar={borrar} />
          </Seccion>
        )}
      </div>
    </div>
  );
}
