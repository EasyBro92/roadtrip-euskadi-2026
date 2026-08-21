import clsx from "clsx";
import { useTripStore } from "../../stores/useTripStore";
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

  return (
    // top-[68px] deja hueco al buscador (48px de alto + 12px de margen).
    // right-16 corta la tira antes de la columna de controles del mapa, que
    // está a la misma altura y por encima (z-560): sin esto los chips de día
    // se deslizaban por debajo de los botones y el último quedaba tapado.
    <div className="pointer-events-none absolute left-0 right-16 top-[68px] z-[540]">
      <div className="pointer-events-auto flex gap-2 overflow-x-auto pb-2 pl-3 pr-2 scrollbar-none">
        {days.map((day) => (
          <button
            key={day.id}
            onClick={() => setCurrentDay(day.id)}
            className={clsx(
              "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-2 text-sm shadow-(--shadow-card) transition-colors",
              day.id === currentDayId
                ? "border-(--color-navigation) bg-(--color-navigation) font-medium text-white"
                : "bg-(--color-surface) text-(--color-text)",
            )}
            style={day.id !== currentDayId ? { borderColor: "var(--color-border)" } : undefined}
          >
            Día {day.index + 1} · {formatDateShort(day.date)}
            {day.isOverloaded && (
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: day.id === currentDayId ? "#fff" : "var(--color-skipped)" }}
                title="Día con muchas paradas"
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
