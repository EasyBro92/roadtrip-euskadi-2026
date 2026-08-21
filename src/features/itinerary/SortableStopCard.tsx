import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, Copy, EyeOff, GripVertical, MoreVertical, Pencil, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTripStore } from "../../stores/useTripStore";
import { useUIStore } from "../../stores/useUIStore";
import type { Stop } from "../../types";
import { thumbStyle } from "../../utils/categoryGradient";

/**
 * Tarjeta de parada del itinerario. En móvil solo caben las dos acciones
 * frecuentes (marcar visitada y reordenar); el resto vive en un menú de
 * desbordamiento, como hace Google en sus listas. Antes se apretujaban seis
 * botones en la fila y el nombre de la parada se quedaba sin sitio.
 */
export function SortableStopCard({ stop }: { stop: Stop }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stop.id });
  const updateStop = useTripStore((s) => s.updateStop);
  const deleteStop = useTripStore((s) => s.deleteStop);
  const duplicateStop = useTripStore((s) => s.duplicateStop);
  const setStopVisited = useTripStore((s) => s.setStopVisited);
  const toggleFavorite = useTripStore((s) => s.toggleFavorite);
  const isFavorite = useTripStore((s) => s.isFavorite);
  const openModal = useUIStore((s) => s.openModal);
  const pushToast = useUIStore((s) => s.pushToast);

  const [menuOpen, setMenuOpen] = useState(false);

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : stop.enabled ? 1 : 0.55 };
  const favorite = isFavorite("stop", stop.id);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative flex items-center gap-2 rounded-(--radius-card) border bg-(--color-surface) p-2.5 shadow-(--shadow-card)"
    >
      <button {...attributes} {...listeners} aria-label="Reordenar parada" className="-ml-1 shrink-0 touch-none p-1 text-(--color-text-muted)">
        <GripVertical size={18} aria-hidden="true" />
      </button>

      <div className="h-12 w-12 shrink-0 rounded-xl" style={thumbStyle(stop.heroImage, stop.category)} aria-hidden="true" />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <p className="truncate text-sm font-medium text-(--color-text)">{stop.name}</p>
          {favorite && <Star size={12} className="shrink-0 text-(--color-gastronomy)" fill="currentColor" aria-hidden="true" />}
        </div>
        <p className="truncate text-xs capitalize text-(--color-text-muted)">
          {stop.category}
          {stop.recommendedDurationMinutes > 0 && <> · {stop.recommendedDurationMinutes} min</>}
          {stop.optional && <> · opcional</>}
          {!stop.enabled && <> · desactivada</>}
        </p>
      </div>

      <button
        aria-label={stop.visited ? "Marcar como pendiente" : "Marcar como visitada"}
        onClick={() => {
          setStopVisited(stop.id, !stop.visited);
          pushToast(stop.visited ? `${stop.name} marcada como pendiente` : `${stop.name} marcada como visitada`, "success");
        }}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${stop.visited ? "bg-(--color-completed) text-white" : "border text-(--color-text-muted)"}`}
        style={!stop.visited ? { borderColor: "var(--color-border)" } : undefined}
      >
        <Check size={16} aria-hidden="true" />
      </button>

      <button aria-label="Más opciones" onClick={() => setMenuOpen((v) => !v)} className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center text-(--color-text-muted)">
        <MoreVertical size={18} aria-hidden="true" />
      </button>

      {menuOpen && (
        <>
          <button className="fixed inset-0 z-10 cursor-default" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} />
          <div
            className="absolute right-2 top-12 z-20 w-52 overflow-hidden rounded-2xl border bg-(--color-surface) py-1 shadow-(--shadow-card)"
            style={{ borderColor: "var(--color-border)" }}
          >
            <MenuItem
              icon={Star}
              label={favorite ? "Quitar de favoritos" : "Añadir a favoritos"}
              onClick={() => {
                toggleFavorite("stop", stop.id);
                setMenuOpen(false);
              }}
            />
            <MenuItem
              icon={Pencil}
              label="Editar parada"
              onClick={() => {
                openModal({ type: "stop-editor", stopId: stop.id, dayId: stop.dayId });
                setMenuOpen(false);
              }}
            />
            <MenuItem
              icon={Copy}
              label="Duplicar"
              onClick={() => {
                duplicateStop(stop.id);
                setMenuOpen(false);
              }}
            />
            <MenuItem
              icon={EyeOff}
              label={stop.enabled ? "Desactivar en la ruta" : "Activar en la ruta"}
              onClick={() => {
                updateStop(stop.id, { enabled: !stop.enabled });
                setMenuOpen(false);
              }}
            />
            <MenuItem
              icon={Trash2}
              label="Eliminar"
              destructive
              onClick={() => {
                setMenuOpen(false);
                openModal({ type: "confirm", title: "Eliminar parada", message: `¿Eliminar "${stop.name}" del itinerario?`, onConfirm: () => deleteStop(stop.id) });
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, destructive }: { icon: typeof Star; label: string; onClick: () => void; destructive?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm active:bg-(--color-surface-muted) ${destructive ? "text-(--color-cancelled)" : "text-(--color-text)"}`}
    >
      <Icon size={16} aria-hidden="true" />
      {label}
    </button>
  );
}
