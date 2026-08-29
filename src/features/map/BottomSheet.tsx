import { Camera, Check, ChevronDown, ChevronUp, Heart, Navigation, Star } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { StarRatingInput } from "../../components/StarRatingInput";
import { BotonResena } from "../reviews/BotonResena";
import { useStopsOfDay } from "../../hooks/useStopsOfDay";
import { useTripStore } from "../../stores/useTripStore";
import { useUIStore, type BottomSheetState } from "../../stores/useUIStore";
import { CategoryThumb } from "../../components/CategoryThumb";
import { StopDetailTabs } from "./StopDetailTabs";

const HEIGHTS: Record<BottomSheetState, string> = {
  minimized: "128px",
  mid: "46vh",
  expanded: "88dvh",
};

const SHEET_ORDER: BottomSheetState[] = ["minimized", "mid", "expanded"];

/** Altura en píxeles de cada estado, para poder arrastrar de forma continua. */
function stateHeightPx(state: BottomSheetState): number {
  const vh = window.innerHeight;
  if (state === "minimized") return 128;
  if (state === "mid") return vh * 0.46;
  return vh * 0.88;
}

/** Estado cuya altura es la más cercana a `height`: a dónde "engancha" al soltar. */
function nearestState(height: number): BottomSheetState {
  return SHEET_ORDER.reduce((best, state) =>
    Math.abs(stateHeightPx(state) - height) < Math.abs(stateHeightPx(best) - height) ? state : best,
  );
}

/**
 * Bottom sheet estilo Google Maps con 3 estados (sección 17). Se abre por
 * arrastre, pulsación en el asa o al tocar un marcador. `MapPage` llama a
 * `map.invalidateSize()` cuando este estado cambia para que el mapa (y el
 * coche) sigan visibles correctamente.
 */
export function BottomSheet({ dayId }: { dayId: string }) {
  const sheetState = useUIStore((s) => s.bottomSheetState);
  const setSheetState = useUIStore((s) => s.setBottomSheetState);
  const dragStartY = useRef<number | null>(null);
  const dragStartHeight = useRef(0);
  const movedRef = useRef(false);
  /** Altura mientras se arrastra (null = no se está arrastrando, manda el estado). */
  const [dragHeight, setDragHeight] = useState<number | null>(null);

  const stops = useStopsOfDay(dayId);
  const currentStopId = useTripStore((s) => s.trip.currentStopId);
  const toggleFavorite = useTripStore((s) => s.toggleFavorite);
  const isFavorite = useTripStore((s) => s.isFavorite);

  const stop = useMemo(() => {
    const explicit = stops.find((s) => s.id === currentStopId);
    if (explicit) return explicit;
    return stops.find((s) => s.enabled && !s.visited) ?? stops[0] ?? null;
  }, [stops, currentStopId]);

  /*
   * Arrastre continuo tipo persiana de notificaciones de Android: el panel
   * sigue al dedo en tiempo real (`dragHeight`) y al soltar se engancha al
   * estado más cercano. Un toque sin desplazamiento se trata como pulsación
   * y avanza al siguiente estado.
   */
  function handlePointerDown(e: React.PointerEvent) {
    dragStartY.current = e.clientY;
    dragStartHeight.current = stateHeightPx(sheetState);
    movedRef.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (dragStartY.current == null) return;
    const deltaY = dragStartY.current - e.clientY;
    if (Math.abs(deltaY) > 4) movedRef.current = true;
    const minH = stateHeightPx("minimized");
    const maxH = stateHeightPx("expanded");
    setDragHeight(Math.min(maxH, Math.max(minH, dragStartHeight.current + deltaY)));
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (dragStartY.current == null) return;
    const deltaY = dragStartY.current - e.clientY;
    const finalHeight = dragStartHeight.current + deltaY;
    dragStartY.current = null;
    setDragHeight(null);

    if (!movedRef.current) {
      // Pulsación limpia: siguiente estado en el ciclo.
      const index = SHEET_ORDER.indexOf(sheetState);
      setSheetState(SHEET_ORDER[(index + 1) % SHEET_ORDER.length]);
      return;
    }
    setSheetState(nearestState(finalHeight));
  }

  if (!stop) return null;

  return (
    <div
      className={`pointer-events-auto absolute inset-x-0 bottom-0 z-[600] flex flex-col overflow-hidden rounded-t-[28px] border-t bg-(--color-surface) shadow-(--shadow-sheet) safe-bottom ${
        dragHeight == null ? "transition-[height] duration-200 ease-out" : ""
      }`}
      style={{ height: dragHeight != null ? `${dragHeight}px` : HEIGHTS[sheetState], borderColor: "var(--color-border)" }}
    >
      {/* Zona de arrastre: el asa y toda la franja superior, para poder
          agarrarlo con el pulgar sin apuntar al asa exacta. */}
      <button
        aria-label={sheetState === "expanded" ? "Minimizar panel" : "Expandir panel"}
        className="flex shrink-0 touch-none flex-col items-center gap-1 py-3"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <span className="h-1.5 w-10 rounded-full bg-(--color-border)" />
      </button>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-4">
        {/*
         * Con el panel abierto, la foto a lo ancho y el nombre encima.
         *
         * Estaba metida en un recuadro de 128 px con márgenes a los lados y el
         * título debajo, así que la foto era un adorno más de la ficha. En la
         * ficha de lugar de Google Maps la foto es la cabecera y el nombre va
         * sobre ella: se reconoce el sitio antes de leer nada, y es lo mismo
         * que hace ya la ficha del itinerario.
         *
         * Minimizado, o sin foto, se queda la fila de siempre: ahí no hay
         * altura para una cabecera y el dato manda sobre la imagen.
         */}
        {sheetState !== "minimized" && stop.heroImage ? (
          <div className="relative shrink-0">
            <CategoryThumb category={stop.category} heroImage={stop.heroImage} className="h-44 w-full" iconSize={48} />

            {stop.visited && (
              <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-(--color-completed) px-2.5 py-1 text-xs font-medium text-white">
                <Check size={12} aria-hidden="true" /> Visitada
              </span>
            )}

            {/* El degradado no es adorno: sin él el texto blanco desaparece
                sobre el cielo, que es media foto de paisaje. */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-4 pt-12">
              <h2 className="truncate text-xl font-semibold text-white">{stop.name}</h2>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-sm text-white/90">
                <span className="font-medium">{stop.photographyRating.toFixed(1)}</span>
                <StarRating value={stop.photographyRating} sobreFoto />
                <span className="capitalize">
                  · {stop.category}
                  {stop.recommendedDurationMinutes > 0 && <> · {stop.recommendedDurationMinutes} min</>}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex gap-3 px-4">
            <CategoryThumb category={stop.category} heroImage={stop.heroImage} className="h-16 w-16 rounded-2xl" iconSize={28} />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-xl font-medium text-(--color-text)">{stop.name}</h2>
              <div className="mt-0.5 flex items-center gap-1.5 text-sm">
                <span className="font-medium text-(--color-text)">{stop.photographyRating.toFixed(1)}</span>
                <StarRating value={stop.photographyRating} />
              </div>
              <p className="mt-0.5 text-sm capitalize text-(--color-text-muted)">
                {stop.category}
                {stop.recommendedDurationMinutes > 0 && <> · {stop.recommendedDurationMinutes} min</>}
              </p>
              {stop.visited && (
                <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-(--color-completed)/12 px-2.5 py-0.5 text-xs font-medium text-(--color-completed)">
                  <Check size={12} aria-hidden="true" /> Visitada
                </span>
              )}
            </div>
          </div>
        )}

        {sheetState === "minimized" && (
          <p className="mt-2 truncate px-4 text-sm text-(--color-text-muted)">{stop.shortDescription}</p>
        )}

        {sheetState !== "minimized" && (
          <div className="px-4">
            {/*
             * Sólo a media altura.
             *
             * Del todo abierto, esta misma descripción sale otra vez en la
             * pestaña Resumen de abajo, con su "Ver más": estaba dos veces en
             * la misma pantalla. Pero a media altura no hay pestañas, así que
             * quitarla del todo dejaba el sitio sin explicar.
             */}
            {sheetState === "mid" && <p className="mt-3 text-sm leading-relaxed text-(--color-text)">{stop.shortDescription}</p>}

            {/* Tu puntuación, separada de la valoración fotográfica de arriba:
                aquella viene con los datos y esta la pones tú. */}
            <div className="mt-3 rounded-xl border p-2.5" style={{ borderColor: "var(--color-border)" }}>
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-(--color-text-muted)">¿Qué te ha parecido?</span>
                <StarRatingInput tipo="stop" targetId={stop.id} nombre={stop.name} size={20} />
              </div>
              <BotonResena tipo="stop" targetId={stop.id} nombre={stop.name} />
            </div>

            {/* Fila de acciones al estilo de la ficha de lugar de Google Maps:
                acción principal en píldora azul + acciones secundarias como
                botones circulares con etiqueta debajo. */}
            <div className="mt-4 flex items-start gap-5">
              <a
                href={stop.googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="flex h-10 items-center gap-2 rounded-full bg-(--color-navigation) px-4 text-sm font-medium !text-white shadow-(--shadow-card)"
              >
                <Navigation size={16} aria-hidden="true" /> Cómo llegar
              </a>
              <StartVisitButton stopId={stop.id} />
              <CircleAction
                icon={Heart}
                label="Guardar"
                active={isFavorite("stop", stop.id)}
                onClick={() => toggleFavorite("stop", stop.id)}
              />
            </div>

            {sheetState === "expanded" ? (
              <StopDetailTabs stop={stop} />
            ) : (
              <button onClick={() => setSheetState("expanded")} className="mt-3 flex items-center gap-1 text-sm font-medium text-(--color-link)">
                Ver ficha completa <ChevronUp size={15} aria-hidden="true" />
              </button>
            )}
          </div>
        )}

        {sheetState === "expanded" && (
          <button onClick={() => setSheetState("mid")} className="mt-4 flex items-center justify-center gap-1 text-sm text-(--color-text-muted)">
            <ChevronDown size={15} aria-hidden="true" /> Minimizar
          </button>
        )}
      </div>
    </div>
  );
}

/** Estrellas de valoración al estilo de las fichas de Google Maps. */
/**
 * Las estrellas de la valoración fotográfica, que viene con los datos.
 *
 * `sobreFoto` cambia el color de las vacías: el gris del borde se pierde
 * encima de una imagen, y en modo oscuro es casi negro sobre negro.
 */
function StarRating({ value, sobreFoto }: { value: number; sobreFoto?: boolean }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${value} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={13}
          className={n <= value ? "text-(--color-gastronomy)" : sobreFoto ? "text-white/45" : "text-(--color-border)"}
          fill={n <= value ? "currentColor" : "none"}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

/** Botón circular con etiqueta debajo, como las acciones secundarias de la ficha de Google Maps. */
function CircleAction({
  icon: Icon,
  label,
  active,
  onClick,
  tone = "navigation",
}: {
  icon: typeof Heart;
  label: string;
  active?: boolean;
  onClick: () => void;
  tone?: "navigation" | "progress";
}) {
  const relleno = tone === "progress" ? "var(--color-progress)" : "var(--color-navigation)";
  const tinta = tone === "progress" ? "var(--color-progress)" : "var(--color-link)";
  return (
    <button onClick={onClick} className="flex w-14 shrink-0 flex-col items-center gap-1">
      <span
        className="flex h-10 w-10 items-center justify-center rounded-full border"
        style={{ borderColor: active ? relleno : "var(--color-border)", background: active ? relleno : "transparent" }}
      >
        <Icon size={17} color={active ? "#fff" : tinta} fill={active ? "#fff" : "none"} aria-hidden="true" />
      </span>
      <span className="text-center text-[11px] leading-tight" style={{ color: tinta }}>
        {label}
      </span>
    </button>
  );
}

function StartVisitButton({ stopId }: { stopId: string }) {
  const setStopVisited = useTripStore((s) => s.setStopVisited);
  const stop = useTripStore((s) => s.stopsById[stopId]);
  const openModal = useUIStore((s) => s.openModal);

  if (stop.visited) {
    return <CircleAction icon={Check} label="Visitada" active tone="progress" onClick={() => setStopVisited(stopId, false)} />;
  }

  return (
    <CircleAction
      icon={Camera}
      label="Visitar"
      tone="progress"
      onClick={() => openModal({ type: "confirm", title: "Iniciar visita", message: `¿Registrar la llegada a ${stop.name}?`, onConfirm: () => setStopVisited(stopId, true) })}
    />
  );
}
