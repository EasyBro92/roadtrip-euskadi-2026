import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarArrowDown, Camera, Check, Copy, EyeOff, GripVertical, MoreVertical, Pencil, PenLine, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { useRatingsStore } from "../../stores/useRatingsStore";
import { useTripStore } from "../../stores/useTripStore";
import { useUIStore } from "../../stores/useUIStore";
import type { Stop } from "../../types";
import { StarRatingInput } from "../../components/StarRatingInput";
import { useAnadirFotos } from "../../hooks/useAnadirFotos";
import { CategoryThumb } from "../../components/CategoryThumb";

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
  const moveStopToDay = useTripStore((s) => s.moveStopToDay);
  const setStopVisited = useTripStore((s) => s.setStopVisited);
  const toggleFavorite = useTripStore((s) => s.toggleFavorite);
  const isFavorite = useTripStore((s) => s.isFavorite);
  const openModal = useUIStore((s) => s.openModal);
  const pushToast = useUIStore((s) => s.pushToast);

  const puntuada = useRatingsStore((s) => Boolean(s.valoraciones[`stop:${stop.id}`]));

  const [menuOpen, setMenuOpen] = useState(false);
  // Las fotos se cuelgan de la parada y de su día, para que salgan también
  // en el Diario sin tener que volver a elegirlas.
  const { abrir: abrirFotos, input: inputFotos } = useAnadirFotos({ stopId: stop.id, dayId: stop.dayId });

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : stop.enabled ? 1 : 0.55 };
  const favorite = isFavorite("stop", stop.id);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative flex items-center gap-2.5 rounded-(--radius-card) border bg-(--color-surface) p-3 shadow-(--shadow-card)"
    >
      <button {...attributes} {...listeners} aria-label="Reordenar parada" className="-ml-1 shrink-0 touch-none p-1 text-(--color-text-muted)">
        <GripVertical size={18} aria-hidden="true" />
      </button>

      {/* 56 px en vez de 48: casi todas las paradas acaban teniendo foto, y a
          ese tamaño se reconoce el sitio antes de leer el nombre. */}
      <CategoryThumb category={stop.category} heroImage={stop.heroImage} className="h-14 w-14 rounded-2xl" iconSize={24} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <p className="truncate text-[15px] font-semibold text-(--color-text)">{stop.name}</p>
          {favorite && <Star size={12} className="shrink-0 text-(--color-gastronomy)" fill="currentColor" aria-hidden="true" />}
        </div>
        <p className="truncate text-xs capitalize text-(--color-text-muted)">
          {stop.category}
          {stop.recommendedDurationMinutes > 0 && <> · {stop.recommendedDurationMinutes} min</>}
          {stop.optional && <> · opcional</>}
          {!stop.enabled && <> · desactivada</>}
        </p>
        {/*
         * Las estrellas sólo aparecen cuando hay algo que puntuar: al volver
         * de la parada o si ya la puntuaste. Antes salían en las treinta y
         * siete paradas del viaje, y treinta y siete filas de estrellas
         * vacías es lo que hacía que la lista pareciese un formulario a medio
         * rellenar en vez de un itinerario.
         */}
        {(stop.visited || puntuada) && (
          <div className="mt-1 -ml-0.5 flex items-center gap-1.5">
            <StarRatingInput tipo="stop" targetId={stop.id} nombre={stop.name} size={15} etiqueta={false} />
            {!puntuada && <span className="text-xs text-(--color-text-muted)">¿Qué tal?</span>}
          </div>
        )}
      </div>

      <button
        aria-label={stop.visited ? "Marcar como pendiente" : "Marcar como visitada"}
        onClick={() => {
          setStopVisited(stop.id, !stop.visited);
          pushToast(stop.visited ? `${stop.name} marcada como pendiente` : `${stop.name} marcada como visitada`, "success");
        }}
        className={`flex h-9 w-9 shrink-0 self-start items-center justify-center rounded-full ${stop.visited ? "bg-(--color-completed) text-white" : "border text-(--color-text-muted)"}`}
        style={!stop.visited ? { borderColor: "var(--color-border)" } : undefined}
      >
        <Check size={16} aria-hidden="true" />
      </button>

      <button aria-label="Más opciones" onClick={() => setMenuOpen((v) => !v)} className="-mr-1 flex h-9 w-9 shrink-0 self-start items-center justify-center text-(--color-text-muted)">
        <MoreVertical size={18} aria-hidden="true" />
      </button>

      {inputFotos}

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
              icon={Camera}
              label="Hacer o añadir foto"
              onClick={() => {
                setMenuOpen(false);
                abrirFotos();
              }}
            />
            <MenuItem
              icon={PenLine}
              label="Escribir reseña"
              onClick={() => {
                setMenuOpen(false);
                openModal({ type: "review", tipo: "stop", targetId: stop.id, nombre: stop.name });
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
              icon={CalendarArrowDown}
              label="Mover a otro día"
              onClick={() => {
                setMenuOpen(false);
                openModal({
                  type: "day-picker",
                  title: `Mover ${stop.name}`,
                  message: "¿A qué día del viaje?",
                  onPick: (dayId) => {
                    if (dayId === stop.dayId) return;
                    // Al final del día destino: es donde se espera que caiga
                    // algo que llega nuevo, y desde ahí ya se reordena.
                    const destino = useTripStore.getState().trip.days.find((d) => d.id === dayId);
                    moveStopToDay(stop.id, dayId, destino?.stopIds.length ?? 0);
                    pushToast(`${stop.name} movida al día ${destino?.index ?? ""}.`, "success");
                  },
                });
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
