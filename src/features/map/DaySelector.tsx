import clsx from "clsx";
import { diaNoCabe } from "../itinerary/duracionDia";
import { useTripStore } from "../../stores/useTripStore";
import { useUIStore } from "../../stores/useUIStore";
import { colorDelDia } from "./coloresDia";
import { formatDateShort } from "../../utils/format";

/**
 * Selector de día horizontal (sección 11: "elegir día"), como la fila de
 * chips de categoría de Google Maps. Reserva `pr-16` para no quedar nunca
 * por debajo de la isla de controles del mapa (antes se solapaban y el
 * botón de capas quedaba inclickable).
 */
export function DaySelector() {
  const days = useTripStore((s) => s.trip.days);
  const currentDayId = useTripStore((s) => s.trip.currentDayId);
  const setCurrentDay = useTripStore((s) => s.setCurrentDay);
  const stopsById = useTripStore((s) => s.stopsById);
  const vistaViaje = useUIStore((s) => s.vistaViaje);
  const setVistaViaje = useUIStore((s) => s.setVistaViaje);

  return (
    // top-[68px] deja hueco al buscador (48px de alto + 12px de margen).
    // Ancho completo: los controles del mapa ya no comparten esta altura,
    // bajaron por debajo de la tira. Estrecharla dejaba los chips cortados a
    // media pantalla sin motivo aparente.
    <div className="pointer-events-none absolute inset-x-0 top-[68px] z-[540]">
      <div className="pointer-events-auto flex gap-2 overflow-x-auto pb-2 pl-3 pr-2 scrollbar-none">
        {/* El viaje entero de un vistazo: cada día con su color. */}
        <button
          onClick={() => setVistaViaje(!vistaViaje)}
          aria-pressed={vistaViaje}
          className={clsx(
            "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-2 text-sm shadow-(--shadow-card) transition-colors",
            vistaViaje ? "border-(--color-navigation) bg-(--color-navigation) font-medium text-white" : "bg-(--color-surface) text-(--color-text)",
          )}
          style={vistaViaje ? undefined : { borderColor: "var(--color-border)" }}
        >
          Todo el viaje
        </button>
        {days.map((day, i) => {
          const noCabe = diaNoCabe(day.stopIds.map((id) => stopsById[id]).filter(Boolean));
          return (
          <button
            key={day.id}
            onClick={() => {
              setVistaViaje(false);
              setCurrentDay(day.id);
            }}
            className={clsx(
              "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-2 text-sm shadow-(--shadow-card) transition-colors",
              day.id === currentDayId && !vistaViaje
                ? "border-(--color-navigation) bg-(--color-navigation) font-medium text-white"
                : "bg-(--color-surface) text-(--color-text)",
            )}
            style={day.id !== currentDayId || vistaViaje ? { borderColor: "var(--color-border)" } : undefined}
          >
            {vistaViaje && <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorDelDia(i) }} aria-hidden="true" />}
            Día {day.index + 1} · {formatDateShort(day.date)}
            {noCabe && (
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: day.id === currentDayId ? "#fff" : "var(--color-skipped)" }}
                title="Este día no cabe: demasiadas horas"
              />
            )}
          </button>
          );
        })}
      </div>
    </div>
  );
}
