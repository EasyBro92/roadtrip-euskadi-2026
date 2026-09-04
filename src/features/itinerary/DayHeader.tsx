import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
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
export function DayHeader({ day, totalDays, onEliminado }: { day: TripDay; totalDays: number; onEliminado: (siguienteDayId: string) => void }) {
  const updateDay = useTripStore((s) => s.updateDay);
  const reorderDays = useTripStore((s) => s.reorderDays);
  const removeDay = useTripStore((s) => s.removeDay);
  const days = useTripStore((s) => s.trip.days);
  const stopsById = useTripStore((s) => s.stopsById);
  const openModal = useUIStore((s) => s.openModal);
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

  /*
   * Eliminar el día, con confirmación.
   *
   * Antes sólo se podía quitar un día vacío y último de la lista — la vuelta
   * atrás de tocar el "+" sin querer. Pero un día se añade sobre todo para
   * planificarlo, y una vez tiene paradas no había forma de deshacerlo: había
   * que borrar cada parada una a una antes de que aquel botón apareciera. El
   * aviso dice cuántas paradas se perderían, para que borrar no sea sorpresa.
   */
  function eliminar() {
    const numParadas = day.stopIds.filter((id) => stopsById[id]).length;
    openModal({
      type: "confirm",
      title: `Eliminar día ${posicion + 1}`,
      message:
        numParadas > 0
          ? `Se perderán las ${numParadas} ${numParadas === 1 ? "parada apuntada" : "paradas apuntadas"} en este día. No se puede deshacer.`
          : "Este día está vacío. No se puede deshacer.",
      confirmLabel: "Eliminar",
      onConfirm: () => {
        const siguiente = days[posicion - 1] ?? days[posicion + 1];
        removeDay(day.id);
        if (siguiente) onEliminado(siguiente.id);
        pushToast("Día eliminado.", "success");
      },
    });
  }

  return (
    <div className="rounded-(--radius-card) border bg-(--color-surface) p-2.5" style={{ borderColor: "var(--color-border)" }}>
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

        {/* Un viaje siempre necesita al menos un día. */}
        {totalDays > 1 && (
          <button
            onClick={eliminar}
            aria-label={`Eliminar día ${posicion + 1}`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-(--color-cancelled)"
            style={{ borderColor: "var(--color-border)" }}
          >
            <Trash2 size={15} aria-hidden="true" />
          </button>
        )}
      </div>

      {/*
       * La fecha y la localidad comparten línea.
       *
       * Iban en dos filas más, una debajo de otra, y la tarjeta del día se
       * llevaba 132 px antes de la primera parada. Son dos datos cortos: en
       * la misma línea se leen igual de bien y sobra media pantalla.
       */}
      <div className="mt-0.5 flex items-baseline gap-1.5 px-2 text-xs text-(--color-text-muted)">
        <span className="shrink-0">{formatDateLong(day.date)}</span>
        <span aria-hidden="true">·</span>
        <input
          value={day.city ?? ""}
          onChange={(e) => updateDay(day.id, { city: e.target.value })}
          aria-label="Ciudad o localidad del día"
          placeholder="¿en qué ciudad?"
          className="min-w-0 flex-1 rounded-lg bg-transparent py-0.5 text-sm font-semibold text-(--color-text) placeholder:text-xs placeholder:font-normal placeholder:text-(--color-text-muted)"
        />
      </div>
    </div>
  );
}
