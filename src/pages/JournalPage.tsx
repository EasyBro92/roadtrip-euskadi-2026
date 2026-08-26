import { useLiveQuery } from "dexie-react-hooks";
import { Camera, CheckCircle2, Circle, Clock, Gauge, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { useDaySwipe } from "../hooks/useDaySwipe";
import { useAnadirFotos } from "../hooks/useAnadirFotos";
import { useStopsOfDay } from "../hooks/useStopsOfDay";
import { db } from "../services/storage/db";
import { useTripStore } from "../stores/useTripStore";
import { thumbStyle } from "../utils/categoryGradient";
import { formatDateLong, formatDateShort, formatEUR, formatKm } from "../utils/format";
import { haversineDistanceMeters } from "../utils/geo";

/**
 * Diario de viaje (sección 33): cronología por día con selector arriba, en
 * lugar de una lista larga con los cinco días encadenados.
 */
export function JournalPage() {
  const trip = useTripStore((s) => s.trip);
  const [activeDayId, setActiveDayId] = useState(trip.currentDayId ?? trip.days[0].id);
  const day = trip.days.find((d) => d.id === activeDayId) ?? trip.days[0];

  const [direccion, setDireccion] = useState<"izquierda" | "derecha">("derecha");

  const cambiarDia = (id: string) => {
    if (id === day.id) return;
    const antes = trip.days.findIndex((d) => d.id === day.id);
    const despues = trip.days.findIndex((d) => d.id === id);
    setDireccion(despues > antes ? "derecha" : "izquierda");
    setActiveDayId(id);
  };

  const irA = (salto: -1 | 1) => {
    const posicion = trip.days.findIndex((d) => d.id === day.id);
    const destino = trip.days[posicion + salto];
    if (destino) cambiarDia(destino.id);
  };
  const swipe = useDaySwipe({ onPrev: () => irA(-1), onNext: () => irA(1) });
  const claseEntrada = direccion === "derecha" ? "dia-entra-derecha" : "dia-entra-izquierda";

  return (
    <div className="flex h-full flex-col overflow-hidden bg-(--color-bg)">
      <div className="safe-x shrink-0 px-4 pt-4">
        <h1 className="text-xl font-bold">Diario de viaje</h1>
      </div>

      <div className="safe-x mt-3 flex shrink-0 gap-2 overflow-x-auto px-4 pb-2 scrollbar-none">
        {trip.days.map((d) => (
          <button
            key={d.id}
            onClick={() => cambiarDia(d.id)}
            className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm transition-colors ${
              d.id === activeDayId ? "border-(--color-navigation) bg-(--color-navigation) font-medium text-white" : "bg-(--color-surface) text-(--color-text)"
            }`}
            style={d.id !== activeDayId ? { borderColor: "var(--color-border)" } : undefined}
          >
            Día {d.index + 1} · {formatDateShort(d.date)}
          </button>
        ))}
      </div>

      {/* touchAction pan-y: el navegador sigue haciendo el scroll vertical y
          nosotros solo interpretamos el movimiento horizontal. */}
      <div className="safe-x min-h-0 flex-1 overflow-y-auto px-4 pb-8" style={{ touchAction: "pan-y" }} {...swipe}>
        {/* La key ya estaba para reiniciar el borrador al cambiar de día;
            ahora además hace que se reproduzca la animación de entrada. */}
        <div key={day.id} className={claseEntrada}>
          <DayEntry dayId={day.id} />
        </div>
      </div>
    </div>
  );
}

function DayEntry({ dayId }: { dayId: string }) {
  const trip = useTripStore((s) => s.trip);
  const expenses = useTripStore((s) => s.expenses);
  const notes = useTripStore((s) => s.notes);
  const addNote = useTripStore((s) => s.addNote);
  const updateNote = useTripStore((s) => s.updateNote);
  const setCurrentStop = useTripStore((s) => s.setCurrentStop);
  const setStopVisited = useTripStore((s) => s.setStopVisited);

  const day = trip.days.find((d) => d.id === dayId)!;
  const dayStops = useStopsOfDay(dayId).filter((s) => s.enabled);
  const photos = useLiveQuery(() => db.photos.where("dayId").equals(dayId).toArray(), [dayId]);
  // Sin parada concreta: son fotos del día, no de un sitio.
  const { abrir: abrirFotos, input: inputFotos, subiendo: subiendoFotos } = useAnadirFotos({ stopId: null, dayId });

  const note = notes.find((n) => n.targetType === "day" && n.targetId === dayId) ?? null;
  const [draft, setDraft] = useState(note?.text ?? "");

  const dayExpenses = expenses.filter((e) => e.dayId === dayId && e.kind === "actual").reduce((sum, e) => sum + e.amountEUR, 0);
  const visitedCount = dayStops.filter((s) => s.visited).length;

  const distanceKm = useMemo(() => {
    let total = 0;
    for (let i = 1; i < dayStops.length; i++) total += haversineDistanceMeters(dayStops[i - 1].coordinates, dayStops[i].coordinates) / 1000;
    return Math.round(total);
  }, [dayStops]);

  const totalMinutes = dayStops.reduce((sum, s) => sum + s.recommendedDurationMinutes, 0);

  function saveNote() {
    if (note) updateNote(note.id, { text: draft });
    else if (draft.trim()) addNote({ targetType: "day", targetId: dayId, text: draft, tags: [], favorite: false });
  }

  return (
    <article className="pb-2">
      {inputFotos}

      <header className="pt-1">
        <h2 className="text-lg font-medium text-(--color-text)">{day.title}</h2>
        <p className="text-sm capitalize text-(--color-text-muted)">{formatDateLong(day.date)}</p>
      </header>

      {/* Métricas del día en tarjetas, en vez de una línea de texto suelta. */}
      <div className="mt-3 grid grid-cols-4 gap-2">
        <MetricCard icon={CheckCircle2} value={`${visitedCount}/${dayStops.length}`} label="Visitadas" />
        <MetricCard icon={Gauge} value={formatKm(distanceKm * 1000)} label="Distancia" />
        <MetricCard icon={Clock} value={`${Math.round(totalMinutes / 60)} h`} label="Visitas" />
        <MetricCard icon={Wallet} value={formatEUR(dayExpenses)} label="Gastado" />
      </div>

      {/* Cronología vertical con foto real de cada parada. */}
      <ol className="mt-5 space-y-0">
        {dayStops.map((stop, index) => (
          <li key={stop.id} className="relative flex gap-3 pb-4">
            {index < dayStops.length - 1 && (
              <span className="absolute left-[15px] top-9 h-full w-0.5 rounded" style={{ background: stop.visited ? "var(--color-completed)" : "var(--color-border)" }} aria-hidden="true" />
            )}
            <button
              onClick={() => setStopVisited(stop.id, !stop.visited)}
              aria-label={stop.visited ? `Marcar ${stop.name} como pendiente` : `Marcar ${stop.name} como visitada`}
              className="relative z-10 mt-1 h-8 w-8 shrink-0"
            >
              {stop.visited ? (
                <CheckCircle2 size={30} className="text-(--color-completed)" fill="var(--color-surface)" aria-hidden="true" />
              ) : (
                <Circle size={30} className="text-(--color-border)" fill="var(--color-surface)" aria-hidden="true" />
              )}
            </button>

            <div className="min-w-0 flex-1 rounded-2xl border bg-(--color-surface) p-2.5 shadow-(--shadow-card)" style={{ borderColor: "var(--color-border)" }}>
              <div className="flex gap-2.5">
                <div className="h-14 w-14 shrink-0 rounded-xl" style={thumbStyle(stop.heroImage, stop.category)} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-medium ${stop.visited ? "text-(--color-text)" : "text-(--color-text-muted)"}`}>{stop.name}</p>
                  <p className="truncate text-xs capitalize text-(--color-text-muted)">
                    {stop.category}
                    {stop.recommendedDurationMinutes > 0 && <> · {stop.recommendedDurationMinutes} min</>}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-(--color-text-muted)">{stop.shortDescription}</p>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>

      {photos && photos.length > 0 ? (
        <div className="mt-2">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-(--color-text-muted)">Fotos del día ({photos.length})</p>
          <div className="grid grid-cols-4 gap-1.5">
            {photos.map((p) => (
              <img key={p.id} src={p.thumbnailDataUrl} alt={p.description || "Foto del viaje"} className="aspect-square w-full rounded-lg object-cover" />
            ))}
            <button
              onClick={abrirFotos}
              disabled={subiendoFotos}
              aria-label="Hacer o añadir foto"
              className="flex aspect-square w-full items-center justify-center rounded-lg border border-dashed text-(--color-text-muted)"
              style={{ borderColor: "var(--color-border)" }}
            >
              <Camera size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex flex-col items-center gap-2 rounded-2xl bg-(--color-surface-muted) py-6 text-center">
          <Camera size={20} className="text-(--color-text-muted)" aria-hidden="true" />
          <p className="text-xs text-(--color-text-muted)">Aún no hay fotos de este día.</p>
          {/* Antes esto sólo explicaba dónde ir a buscarlas. Explicar un camino
              no es lo mismo que llevarte: el botón las añade aquí mismo. */}
          <button
            onClick={abrirFotos}
            disabled={subiendoFotos}
            className="rounded-full bg-(--color-navigation) px-4 py-2 text-sm font-medium text-white"
          >
            {subiendoFotos ? "Añadiendo…" : "Hacer o añadir foto"}
          </button>
        </div>
      )}

      <div className="mt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-(--color-text-muted)">El relato del día</p>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={saveNote}
          placeholder="¿Qué tal fue el día? Escribe aquí lo que quieras recordar…"
          rows={4}
          className="w-full rounded-2xl border bg-(--color-surface) px-3.5 py-3 text-sm leading-relaxed"
          style={{ borderColor: "var(--color-border)" }}
        />
      </div>

      <button
        onClick={() => {
          const firstPending = dayStops.find((s) => !s.visited);
          if (firstPending) setCurrentStop(firstPending.id);
        }}
        className="mt-3 w-full rounded-full border py-2.5 text-sm font-medium text-(--color-navigation)"
        style={{ borderColor: "var(--color-navigation)" }}
      >
        Continuar este día en el mapa
      </button>
    </article>
  );
}

function MetricCard({ icon: Icon, value, label }: { icon: typeof Clock; value: string; label: string }) {
  return (
    <div className="rounded-2xl border bg-(--color-surface) p-2 text-center shadow-(--shadow-card)" style={{ borderColor: "var(--color-border)" }}>
      <Icon size={15} className="mx-auto text-(--color-navigation)" aria-hidden="true" />
      <p className="mt-1 truncate text-xs font-medium text-(--color-text)">{value}</p>
      <p className="truncate text-[10px] text-(--color-text-muted)">{label}</p>
    </div>
  );
}
