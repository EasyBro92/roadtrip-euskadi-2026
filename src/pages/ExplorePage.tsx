import { ArrowLeft, CalendarDays, MapPin, Plus, Star } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TODAS_LAS_RUTAS } from "../data/routeTemplates.data";
import { StarRatingInput } from "../components/StarRatingInput";
import { useRatingsStore } from "../stores/useRatingsStore";
import { useTripStore } from "../stores/useTripStore";
import { useUIStore } from "../stores/useUIStore";
import type { RouteTemplate, RouteTemplateStop } from "../types";
import { toISODate } from "../utils/dates";

/** Ficha desplegable de una ruta: sus paradas día a día y el botón de copiar. */
function FichaRuta({ ruta }: { ruta: RouteTemplate }) {
  const createTripFromTemplate = useTripStore((s) => s.createTripFromTemplate);
  const addStop = useTripStore((s) => s.addStop);
  const viajeActivo = useTripStore((s) => s.trip.name);
  const openModal = useUIStore((s) => s.openModal);
  const pushToast = useUIStore((s) => s.pushToast);
  const navigate = useNavigate();

  const miNota = useRatingsStore((s) => s.valoraciones[`route:${ruta.id}`]);

  const [abierta, setAbierta] = useState(false);
  const [startDate, setStartDate] = useState(toISODate(new Date()));

  const dias = Array.from({ length: ruta.dayCount }, (_, i) => i + 1);

  /**
   * Añade una parada suelta al viaje que tengas abierto, sin copiar la ruta
   * entera. El día lo eliges tú: la ruta del catálogo y tu viaje casi nunca
   * tienen los mismos días.
   */
  function anadirSuelta(parada: RouteTemplateStop) {
    openModal({
      type: "day-picker",
      title: `Añadir ${parada.name}`,
      message: `Se añadirá a "${viajeActivo}". ¿A qué día?`,
      onPick: (dayId) => {
        addStop(dayId, {
          name: parada.name,
          category: parada.category,
          coordinates: parada.coordinates,
          shortDescription: parada.shortDescription,
          recommendedDurationMinutes: parada.recommendedDurationMinutes,
        });
        pushToast(`${parada.name} añadida a tu itinerario.`, "success");
      },
    });
  }

  function copiar() {
    createTripFromTemplate(ruta, startDate);
    pushToast(`"${ruta.name}" copiada a tus viajes. Edítala a tu gusto.`, "success");
    navigate("/viaje");
  }

  return (
    <li className="rounded-(--radius-card) border bg-(--color-surface) p-4 shadow-(--shadow-card)" style={{ borderColor: "var(--color-border)" }}>
      <button onClick={() => setAbierta((v) => !v)} className="w-full text-left" aria-expanded={abierta}>
        <p className="text-xs font-medium uppercase tracking-wide text-(--color-navigation)">{ruta.region}</p>
        <h2 className="mt-0.5 text-base font-semibold text-(--color-text)">{ruta.name}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-(--color-text-muted)">{ruta.summary}</p>
        <div className="mt-3 flex gap-4 text-xs text-(--color-text-muted)">
          <span className="flex items-center gap-1.5">
            <CalendarDays size={14} aria-hidden="true" /> {ruta.dayCount} días
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin size={14} aria-hidden="true" /> {ruta.stops.length} paradas
          </span>
          {miNota && (
            <span className="flex items-center gap-1 font-medium text-(--color-gastronomy)">
              <Star size={13} fill="currentColor" aria-hidden="true" /> {miNota.estrellas}
            </span>
          )}
        </div>
      </button>

      {abierta && (
        <div className="mt-4 border-t pt-3" style={{ borderColor: "var(--color-border)" }}>
          <div className="mb-3 flex items-center gap-3">
            <span className="text-xs font-medium text-(--color-text-muted)">Tu nota:</span>
            <StarRatingInput tipo="route" targetId={ruta.id} nombre={ruta.name} size={20} />
          </div>

          {dias.map((dia) => (
            <div key={dia} className="mb-3">
              <p className="text-xs font-semibold uppercase text-(--color-text-muted)">Día {dia}</p>
              <ul className="mt-1">
                {ruta.stops
                  .filter((s) => s.dayIndex === dia)
                  .map((s) => (
                    <li key={s.name} className="flex items-center justify-between gap-2 py-1">
                      <span className="min-w-0 flex-1 truncate text-sm text-(--color-text)">
                        {s.name}
                        <span className="text-(--color-text-muted)"> · {s.recommendedDurationMinutes} min</span>
                      </span>
                      <button
                        onClick={() => anadirSuelta(s)}
                        aria-label={`Añadir ${s.name} a ${viajeActivo}`}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-(--color-navigation)"
                        style={{ borderColor: "var(--color-border)" }}
                      >
                        <Plus size={16} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          ))}

          <label className="mt-2 block text-xs text-(--color-text-muted)">
            Primer día del viaje
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full rounded-(--radius-control) border bg-(--color-bg) px-3 py-2.5 text-sm text-(--color-text)"
              style={{ borderColor: "var(--color-border)" }}
            />
          </label>

          <button
            onClick={copiar}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-(--color-navigation) py-3 text-sm font-medium text-white transition-transform active:scale-[0.98]"
          >
            <Plus size={17} aria-hidden="true" /> Copiar a mis viajes
          </button>
        </div>
      )}
    </li>
  );
}

/**
 * Catálogo de rutas prehechas. Copiar una crea un viaje propio: la ruta del
 * catálogo queda intacta y la copia se edita como cualquier otro viaje.
 */
export function ExplorePage() {
  const navigate = useNavigate();

  return (
    <div className="safe-x min-h-dvh bg-(--color-bg) pb-10 pt-[calc(env(safe-area-inset-top)+20px)]">
      <header className="mb-2 flex items-center gap-2">
        <button onClick={() => navigate("/viajes")} aria-label="Volver a mis viajes" className="-ml-2 p-2">
          <ArrowLeft size={22} aria-hidden="true" />
        </button>
        <h1 className="text-2xl font-semibold text-(--color-text)">Explorar</h1>
      </header>
      <p className="mb-4 text-sm text-(--color-text-muted)">
        Rutas ya montadas. Cópialas a tus viajes y cámbialas a tu gusto.
      </p>

      <ul className="flex flex-col gap-3">
        {TODAS_LAS_RUTAS.map((ruta) => (
          <FichaRuta key={ruta.id} ruta={ruta} />
        ))}
      </ul>
    </div>
  );
}
