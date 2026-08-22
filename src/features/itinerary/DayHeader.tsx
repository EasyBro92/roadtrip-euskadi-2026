import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTripStore } from "../../stores/useTripStore";
import { useUIStore } from "../../stores/useUIStore";
import type { TripDay } from "../../types";
import { formatDateLong } from "../../utils/format";

/**
 * Cabecera del día: título y localidad editables en el sitio, más las flechas
 * para mover el día entero por el viaje.
 *
 * Reordenar mueve el día con su itinerario, pero **no** su fecha: las fechas
 * son huecos fijos en orden. Adelantar el día 3 significa hacer esos planes
 * un día antes, no correr el calendario del viaje.
 */
export function DayHeader({ day, totalDays }: { day: TripDay; totalDays: number }) {
  const updateDay = useTripStore((s) => s.updateDay);
  const reorderDays = useTripStore((s) => s.reorderDays);
  const days = useTripStore((s) => s.trip.days);
  const pushToast = useUIStore((s) => s.pushToast);

  const posicion = days.findIndex((d) => d.id === day.id);

  function mover(direccion: -1 | 1) {
    const destino = posicion + direccion;
    if (destino < 0 || destino >= days.length) return;
    const orden = days.map((d) => d.id);
    [orden[posicion], orden[destino]] = [orden[destino], orden[posicion]];
    reorderDays(orden);
    pushToast(`Día movido a la posición ${destino + 1}.`, "success");
  }

  return (
    <div className="rounded-(--radius-card) border bg-(--color-surface) p-3" style={{ borderColor: "var(--color-border)" }}>
      <div className="flex items-center gap-2">
        <button
          onClick={() => mover(-1)}
          disabled={posicion === 0}
          aria-label="Mover este día antes"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-(--color-text) disabled:opacity-30"
          style={{ borderColor: "var(--color-border)" }}
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </button>

        <input
          value={day.title}
          onChange={(e) => updateDay(day.id, { title: e.target.value })}
          aria-label="Título del día"
          placeholder={`Día ${posicion + 1}`}
          className="min-w-0 flex-1 rounded-lg bg-transparent px-2 py-1 text-center text-sm font-medium text-(--color-text)"
        />

        <button
          onClick={() => mover(1)}
          disabled={posicion === totalDays - 1}
          aria-label="Mover este día después"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-(--color-text) disabled:opacity-30"
          style={{ borderColor: "var(--color-border)" }}
        >
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>

      <p className="mt-0.5 text-center text-xs text-(--color-text-muted)">{formatDateLong(day.date)}</p>

      {/* La localidad va en grande justo encima de las paradas: es lo primero
          que se busca al mirar un día del viaje. */}
      <input
        value={day.city ?? ""}
        onChange={(e) => updateDay(day.id, { city: e.target.value })}
        aria-label="Ciudad o localidad del día"
        placeholder="¿En qué ciudad? (opcional)"
        className="mt-2 w-full rounded-lg bg-transparent px-2 py-1 text-lg font-semibold text-(--color-text) placeholder:text-base placeholder:font-normal placeholder:text-(--color-text-muted)"
      />
    </div>
  );
}
