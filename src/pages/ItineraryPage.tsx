import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { AlertTriangle, MapPinned, Plus, RotateCcw } from "lucide-react";
import { useState } from "react";
import { useDaySwipe } from "../hooks/useDaySwipe";
import { DayHeader } from "../features/itinerary/DayHeader";
import { LocationBreak } from "../features/itinerary/LocationBreak";
import { SortableStopCard } from "../features/itinerary/SortableStopCard";
import { useStopsOfDay } from "../hooks/useStopsOfDay";
import { useTripStore } from "../stores/useTripStore";
import { useUIStore } from "../stores/useUIStore";
import { haversineDistanceMeters } from "../utils/geo";

/**
 * A partir de este salto entre paradas se considera que has cambiado de
 * localidad. 2 km deja juntas las paradas de un mismo casco urbano —
 * catedral, plaza, mirador— y separa pueblos y ciudades distintas.
 */
const DISTANCIA_OTRA_LOCALIDAD_M = 2000;

export function ItineraryPage() {
  const days = useTripStore((s) => s.trip.days);
  const [activeDayId, setActiveDayId] = useState(days[0].id);
  const stops = useStopsOfDay(activeDayId);
  const reorderStopsInDay = useTripStore((s) => s.reorderStopsInDay);
  const restoreOriginalRoute = useTripStore((s) => s.restoreOriginalRoute);
  const undo = useTripStore((s) => s.undo);
  const canUndo = useTripStore((s) => s.canUndo());
  const pushSnapshot = useTripStore((s) => s.pushSnapshot);
  const openModal = useUIStore((s) => s.openModal);

  const activeDay = days.find((d) => d.id === activeDayId)!;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // La dirección del último cambio decide por qué lado entra el día nuevo.
  // Vale igual deslizando que tocando un chip: saltar del día 1 al 4 entra
  // por la derecha, como si hubieras avanzado.
  const [direccion, setDireccion] = useState<"izquierda" | "derecha">("derecha");

  const cambiarDia = (id: string) => {
    if (id === activeDayId) return;
    const antes = days.findIndex((d) => d.id === activeDayId);
    const despues = days.findIndex((d) => d.id === id);
    setDireccion(despues > antes ? "derecha" : "izquierda");
    setActiveDayId(id);
  };

  const irA = (salto: -1 | 1) => {
    const posicion = days.findIndex((d) => d.id === activeDayId);
    const destino = days[posicion + salto];
    if (destino) cambiarDia(destino.id);
  };
  const swipe = useDaySwipe({ onPrev: () => irA(-1), onNext: () => irA(1) });
  const claseEntrada = direccion === "derecha" ? "dia-entra-derecha" : "dia-entra-izquierda";

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = stops.map((s) => s.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    const reordered = [...ids];
    reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, String(active.id));
    pushSnapshot("Antes de reordenar paradas");
    reorderStopsInDay(activeDayId, reordered);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-(--color-bg)">
      <div className="safe-x flex items-center justify-between px-4 pt-4">
        <h1 className="text-xl font-bold">Itinerario</h1>
        <div className="flex gap-2">
          {canUndo && (
            <button onClick={undo} className="flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium" style={{ borderColor: "var(--color-border)" }}>
              <RotateCcw size={13} aria-hidden="true" /> Deshacer
            </button>
          )}
          <button
            onClick={() => openModal({ type: "confirm", title: "Restaurar ruta original", message: "Se perderán los cambios manuales del itinerario. ¿Continuar?", onConfirm: restoreOriginalRoute })}
            className="rounded-full border px-3 py-1.5 text-xs font-medium"
            style={{ borderColor: "var(--color-border)" }}
          >
            Restaurar original
          </button>
        </div>
      </div>

      <div className="safe-x mt-3 flex gap-2 overflow-x-auto px-4 pb-2 scrollbar-none">
        {days.map((day) => (
          <button
            key={day.id}
            onClick={() => cambiarDia(day.id)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium whitespace-nowrap ${day.id === activeDayId ? "bg-(--color-navigation) text-white border-(--color-navigation)" : "bg-(--color-surface)"}`}
            style={day.id !== activeDayId ? { borderColor: "var(--color-border)" } : undefined}
          >
            Día {day.index + 1}
          </button>
        ))}
      </div>

      {/* key: al cambiar de día React monta esto de nuevo y la animación se
          reproduce; sin la key el contenido cambiaría sin animarse. */}
      <div key={activeDay.id} className={`safe-x px-4 ${claseEntrada}`}>
        <DayHeader day={activeDay} totalDays={days.length} />
        {activeDay.isOverloaded && (
          <div className="mt-2 flex items-start gap-2 rounded-xl bg-(--color-skipped)/15 p-2.5 text-xs text-(--color-text)">
            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-(--color-skipped)" aria-hidden="true" />
            <p>Este día tiene {stops.length} paradas, por encima de las 3-5 recomendadas. Considera desactivar o convertir en opcionales las de prioridad media/baja.</p>
          </div>
        )}
      </div>

      {/* El gesto ignora lo que empiece sobre un botón o el asa de arrastrar,
          para no competir con el reordenado de paradas. */}
      <div key={`lista-${activeDay.id}`} className={`safe-x mt-3 flex-1 space-y-2 overflow-y-auto px-4 pb-24 ${claseEntrada}`} style={{ touchAction: "pan-y" }} {...swipe}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={stops.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            {stops.map((stop, indice) => {
              // Un salto grande respecto a la parada anterior significa que
              // cambias de localidad: se marca para que no parezca todo el
              // mismo sitio. Por debajo del umbral son paradas del mismo
              // pueblo o ciudad y no interesa cortar la lista.
              const anterior = indice > 0 ? stops[indice - 1] : null;
              const salto = anterior ? haversineDistanceMeters(anterior.coordinates, stop.coordinates) : 0;
              return (
                <div key={stop.id}>
                  {salto >= DISTANCIA_OTRA_LOCALIDAD_M && <LocationBreak metros={salto} />}
                  <SortableStopCard stop={stop} />
                </div>
              );
            })}
          </SortableContext>
        </DndContext>

        {/* Dos vías de alta: elegir de la biblioteca de lugares opcionales,
            o buscar/crear un lugar nuevo desde cero. */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => openModal({ type: "place-library", dayId: activeDayId })}
            className="flex items-center justify-center gap-1.5 rounded-(--radius-card) bg-(--color-navigation) py-3 text-sm font-medium text-white shadow-(--shadow-card)"
          >
            <MapPinned size={16} aria-hidden="true" /> De la biblioteca
          </button>
          <button
            onClick={() => openModal({ type: "stop-editor", stopId: null, dayId: activeDayId })}
            className="flex items-center justify-center gap-1.5 rounded-(--radius-card) border border-dashed py-3 text-sm font-medium text-(--color-navigation)"
            style={{ borderColor: "var(--color-navigation)" }}
          >
            <Plus size={16} aria-hidden="true" /> Buscar lugar
          </button>
        </div>
      </div>
    </div>
  );
}
