import { X } from "lucide-react";
import { diaNoCabe } from "../features/itinerary/duracionDia";
import { useTripStore } from "../stores/useTripStore";
import { useUIStore } from "../stores/useUIStore";
import { formatDateLong } from "../utils/format";

/** Selector de día reutilizable ("¿a qué día lo añado?"). */
export function DayPickerModal({ title, message, onPick }: { title: string; message?: string; onPick: (dayId: string) => void }) {
  const days = useTripStore((s) => s.trip.days);
  const stopsById = useTripStore((s) => s.stopsById);
  const closeModal = useUIStore((s) => s.closeModal);

  return (
    <div className="fixed inset-0 z-[2100] flex items-end justify-center bg-black/40" onClick={closeModal}>
      <div className="safe-bottom max-h-[80dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-(--color-surface) p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-medium">{title}</h2>
          <button aria-label="Cerrar" onClick={closeModal}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        {message && <p className="mb-3 text-sm text-(--color-text-muted)">{message}</p>}

        <div className="space-y-2">
          {days.map((day) => {
            const paradas = day.stopIds.map((id) => stopsById[id]).filter(Boolean);
            const count = paradas.filter((s) => s.enabled).length;
            const noCabe = diaNoCabe(paradas);
            return (
              <button
                key={day.id}
                onClick={() => {
                  onPick(day.id);
                  closeModal();
                }}
                className="flex w-full items-center justify-between gap-3 rounded-xl border p-3.5 text-left active:bg-(--color-surface-muted)"
                style={{ borderColor: "var(--color-border)" }}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">Día {day.index + 1}</span>
                  <span className="block truncate text-xs text-(--color-text-muted)">{formatDateLong(day.date)}</span>
                  <span className="block truncate text-xs text-(--color-text-muted)">{day.title}</span>
                </span>
                <span className="shrink-0 text-xs text-(--color-text-muted)">
                  {count} paradas
                  {noCabe && (
                    <span className="ml-1 text-(--color-skipped)" title="Este día no cabe: demasiadas horas">
                      •
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
