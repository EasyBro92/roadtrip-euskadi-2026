import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { AlertTriangle, BedDouble, Clock, MapPinned, Plus, RotateCcw } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useDaySwipe } from "../hooks/useDaySwipe";
import { DayHeader } from "../features/itinerary/DayHeader";
import { FilteredStopList } from "../features/itinerary/FilteredStopList";
import { LocationBreak } from "../features/itinerary/LocationBreak";
import { SortableStopCard } from "../features/itinerary/SortableStopCard";
import { AvisoTiempo } from "../features/itinerary/AvisoTiempo";
import { openExternalUrl } from "../utils/openExternal";
import { diaSiguiente, urlBooking } from "../utils/reservas";
import { nochesPorDia, nochesSinAlojamiento } from "../features/itinerary/alojamiento";
import { useDayClosures } from "../hooks/useDayClosures";
import { useStopsOfDay } from "../hooks/useStopsOfDay";
import { useTripStore } from "../stores/useTripStore";
import type { ISODate, Stop, StopCategory } from "../types";
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
  const [params] = useSearchParams();
  const [activeDayId, setActiveDayId] = useState(days[0].id);
  const stops = useStopsOfDay(activeDayId);
  const reorderStopsInDay = useTripStore((s) => s.reorderStopsInDay);
  const restoreOriginalRoute = useTripStore((s) => s.restoreOriginalRoute);
  const undo = useTripStore((s) => s.undo);
  const canUndo = useTripStore((s) => s.canUndo());
  const pushSnapshot = useTripStore((s) => s.pushSnapshot);
  const openModal = useUIStore((s) => s.openModal);

  // Las tarjetas del Resumen ("4 estadios") enlazan aquí con ?categoria=, y
  // entonces esto deja de ser la vista por días: enseña esas paradas
  // concretas, que están repartidas por todo el viaje.
  const categoria = params.get("categoria");

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

  if (categoria) return <FilteredStopList categoria={categoria as StopCategory} />;

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

      {/*
       * La cabecera del día y los avisos van DENTRO del contenedor que hace
       * scroll, como en el Diario. Antes estaban fuera y se quedaban fijos:
       * con el tiempo, el alojamiento y los horarios a la vez se comían media
       * pantalla y a las paradas no les quedaba sitio.
       *
       * key: al cambiar de día React monta esto de nuevo y la animación se
       * reproduce; sin la key el contenido cambiaría sin animarse.
       *
       * El gesto ignora lo que empiece sobre un botón o el asa de arrastrar,
       * para no competir con el reordenado de paradas.
       */}
      <div key={activeDay.id} className={`safe-x mt-2 flex-1 space-y-2 overflow-y-auto px-4 pb-24 ${claseEntrada}`} style={{ touchAction: "pan-y" }} {...swipe}>
        <div>
          <DayHeader day={activeDay} totalDays={days.length} />
          {activeDay.isOverloaded && (
            <div className="mt-2 flex items-start gap-2 rounded-xl bg-(--color-skipped)/15 p-2.5 text-xs text-(--color-text)">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-(--color-skipped)" aria-hidden="true" />
              <p>{stops.length} paradas: es mucho para un día. Desactiva o marca como opcionales las que menos te importen.</p>
            </div>
          )}
          {/* A lo ancho, no en dos columnas: probado en fila, el nombre del
              hotel se partía en tres líneas y ocupaba casi lo mismo. */}
          <AvisoTiempo fecha={activeDay.date} stops={stops} />
          <AvisoAlojamiento activeDayId={activeDayId} />
          <AvisoCierres stops={stops} fecha={activeDay.date} />
        </div>

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
                  {salto >= DISTANCIA_OTRA_LOCALIDAD_M && <LocationBreak metros={salto} stopId={stop.id} />}
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

/**
 * Aviso de paradas que estarían cerradas el día que las tienes puestas.
 *
 * Sólo avisa de lo que se sabe con certeza. Comprobar los horarios que faltan
 * es un botón aparte: son tantas peticiones a OpenStreetMap como paradas tenga
 * el día, y eso no se lanza sin que lo pidas.
 */
function AvisoCierres({ stops, fecha }: { stops: Stop[]; fecha: ISODate }) {
  const { cerradas, sinComprobar, sinHorario, comprobando, progreso, comprobar } = useDayClosures(stops, fecha);

  if (cerradas.length === 0 && sinComprobar === 0 && sinHorario === 0) return null;

  return (
    <div className="mt-2 rounded-xl bg-(--color-surface-muted) p-2.5 text-xs text-(--color-text)">
      {cerradas.length > 0 && (
        <div className="flex items-start gap-2">
          <Clock size={15} className="mt-0.5 shrink-0 text-(--color-cancelled)" aria-hidden="true" />
          <p>
            <span className="font-medium">Llegarías cerrado a</span> {cerradas.map((c) => c.nombre).join(", ")}.{" "}
            {cerradas.length === 1 ? "Ese día no abre." : "Ese día no abren."}
          </p>
        </div>
      )}

      <div className={cerradas.length > 0 ? "mt-2" : ""}>
        {comprobando ? (
          <p className="text-(--color-text-muted)">
            Comprobando horarios… {progreso ? `${progreso.hechas} de ${progreso.total}` : ""}
          </p>
        ) : sinComprobar > 0 ? (
          <button onClick={comprobar} className="font-medium text-(--color-navigation)">
            Comprobar el horario de {sinComprobar} {sinComprobar === 1 ? "parada" : "paradas"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Dónde duermes ese día, y aviso si alguna noche se quedó sin nada.
 *
 * Un hotel de varias noches está en los datos como una parada repetida en
 * cada día, y en pantalla parecían reservas distintas. Aquí se dice "noche 2
 * de 3" para que se vea que es la misma estancia. Se deduce de lo que ya hay,
 * sin tocar el viaje.
 */
function AvisoAlojamiento({ activeDayId }: { activeDayId: string }) {
  const days = useTripStore((s) => s.trip.days);
  const stopsById = useTripStore((s) => s.stopsById);
  const viajeros = useTripStore((s) => s.trip.travelers.length);

  const noches = nochesPorDia(days, stopsById);
  const hoy = noches.find((n) => n.dayId === activeDayId);
  const sinNada = nochesSinAlojamiento(noches);
  const faltaHoy = sinNada.some((n) => n.dayId === activeDayId);

  const sobrantes = hoy?.sobrantes ?? [];
  if (!hoy?.nombre && !faltaHoy) return null;

  return (
    <div className="mt-2 flex items-start gap-2 rounded-xl bg-(--color-surface-muted) p-2.5 text-xs text-(--color-text)">
      <BedDouble size={15} className={`mt-0.5 shrink-0 ${faltaHoy ? "text-(--color-skipped)" : "text-(--color-hotel)"}`} aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-1">
      {hoy?.nombre ? (
        <p>
          Duermes en <span className="font-medium">{hoy.nombre}</span>
          {hoy.totalNoches > 1 && (
            <span className="text-(--color-text-muted)">
              {" "}
              · noche {hoy.numeroDeNoche} de {hoy.totalNoches}
            </span>
          )}
        </p>
      ) : (
        <>
          <p>Esta noche no tienes dónde dormir apuntado.</p>
          {/* La búsqueda ya lleva la ciudad y las fechas: sin acuerdos ni
              comisiones, sólo para no tener que teclearlas. */}
          <button
            onClick={() => {
              const dia = days.find((d) => d.id === activeDayId);
              if (!dia) return;
              openExternalUrl(urlBooking(dia.city || dia.title, dia.date, diaSiguiente(dia.date), viajeros || 2));
            }}
            className="font-medium text-(--color-navigation)"
          >
            Buscar hotel para esa noche
          </button>
        </>
      )}

      {sobrantes.length > 0 && (
        <p className="text-(--color-skipped)">
          Y también {sobrantes.join(", ")}. Dos alojamientos la misma noche: puede que uno esté en el día que no toca.
        </p>
      )}
      </div>
    </div>
  );
}
