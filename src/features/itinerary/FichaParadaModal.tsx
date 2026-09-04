import { Check, MapPin, Navigation, Pencil, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAperturaDesde, type Origen } from "../../hooks/useAperturaDesde";
import { CategoryThumb } from "../../components/CategoryThumb";
import { StarRatingInput } from "../../components/StarRatingInput";
import { useTripStore } from "../../stores/useTripStore";
import { useUIStore } from "../../stores/useUIStore";
import { BotonResena } from "../reviews/BotonResena";
import { StopDetailTabs } from "../map/StopDetailTabs";

/**
 * La parada en grande, al tocarla en el itinerario.
 *
 * Antes tocar una parada de la lista no hacía nada: para ver de qué iba, o
 * para cualquier cosa que no fuese marcarla visitada, había que abrir el menú
 * de los tres puntos. En cualquier app, tocar una fila la abre.
 *
 * La foto va a lo ancho arriba con el nombre encima, como la ficha de lugar de
 * Google Maps o la de un hotel en Booking: a 56 px la foto es un adorno, a lo
 * ancho es lo que te dice si ese sitio te apetece. Debajo va la misma ficha
 * que ya se enseña desde el mapa, para no tener dos verdades distintas de la
 * misma parada.
 */
export function FichaParadaModal({ stopId, origen }: { stopId: string; origen?: Origen }) {
  const stop = useTripStore((s) => s.stopsById[stopId]);
  const setStopVisited = useTripStore((s) => s.setStopVisited);
  const setCurrentStop = useTripStore((s) => s.setCurrentStop);
  const setCurrentDay = useTripStore((s) => s.setCurrentDay);
  const closeModal = useUIStore((s) => s.closeModal);
  const openModal = useUIStore((s) => s.openModal);
  const pushToast = useUIStore((s) => s.pushToast);
  const navigate = useNavigate();

  const { panel, fondo, cerrar } = useAperturaDesde(origen, closeModal);

  if (!stop) return null;

  function verEnElMapa() {
    setCurrentDay(stop.dayId);
    setCurrentStop(stop.id);
    closeModal();
    navigate("/mapa");
  }

  return (
    <div ref={fondo} className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/40" onClick={cerrar}>
      <div
        ref={panel}
        className="safe-bottom flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-(--radius-sheet) bg-(--color-surface)"
        onClick={(e) => e.stopPropagation()}
        style={{ willChange: "transform, opacity" }}
      >
        <div className="min-h-0 flex-1 overflow-y-auto">
          {/*
           * La foto, con margen y redondeada por los cuatro lados — no a
           * sangre, a lo iPhone (una tarjeta flotante, no un cartel pegado a
           * los bordes de la pantalla). Antes ocupaba todo el ancho y 192 px
           * de alto: al tocar una parada, la foto "se ampliaba" de golpe hasta
           * llenar la pantalla, que es justo lo que no se quería.
           */}
          <div className="p-4 pb-0">
            <div className="relative h-40 overflow-hidden rounded-2xl">
              <CategoryThumb category={stop.category} heroImage={stop.heroImage} className="h-40 w-full" iconSize={44} />

              <button
                aria-label="Cerrar"
                onClick={cerrar}
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm"
              >
                <X size={16} aria-hidden="true" />
              </button>

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-3 pt-10">
                <h2 className="truncate text-lg font-semibold text-white">{stop.name}</h2>
                <p className="truncate text-xs capitalize text-white/85">
                  {stop.category}
                  {stop.recommendedDurationMinutes > 0 && <> · {stop.recommendedDurationMinutes} min</>}
                  {stop.optional && <> · opcional</>}
                </p>
              </div>
            </div>
          </div>

          <div className="px-4 pb-4">
            {/* Las tres acciones en una fila, la principal en azul. */}
            <div className="mt-3 flex gap-2">
              <a
                href={stop.googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-(--color-navigation) text-sm font-medium !text-white"
              >
                <Navigation size={15} aria-hidden="true" /> Cómo llegar
              </a>
              <button
                onClick={verEnElMapa}
                aria-label="Ver esta parada en el mapa"
                className="flex h-10 w-10 items-center justify-center rounded-full border text-(--color-text)"
                style={{ borderColor: "var(--color-border)" }}
              >
                <MapPin size={16} aria-hidden="true" />
              </button>
              <button
                onClick={() => openModal({ type: "stop-editor", stopId: stop.id, dayId: stop.dayId })}
                aria-label="Editar esta parada"
                className="flex h-10 w-10 items-center justify-center rounded-full border text-(--color-text)"
                style={{ borderColor: "var(--color-border)" }}
              >
                <Pencil size={16} aria-hidden="true" />
              </button>
            </div>

            <button
              onClick={() => {
                setStopVisited(stop.id, !stop.visited);
                pushToast(stop.visited ? `${stop.name} marcada como pendiente` : `${stop.name} marcada como visitada`, "success");
              }}
              className={`mt-2 flex h-10 w-full items-center justify-center gap-1.5 rounded-full text-sm font-medium ${
                stop.visited ? "bg-(--color-completed) text-white" : "border text-(--color-text)"
              }`}
              style={!stop.visited ? { borderColor: "var(--color-border)" } : undefined}
            >
              <Check size={15} aria-hidden="true" /> {stop.visited ? "Visitada" : "Marcar como visitada"}
            </button>

            {/* La descripción no va aquí: ya la enseña la pestaña Resumen de
                abajo, con su "Ver más". Salía dos veces seguidas. */}

            {/* Tu nota del sitio, que es distinta de la valoración fotográfica
                que viene con los datos. */}
            <div className="mt-3 rounded-xl border p-2.5" style={{ borderColor: "var(--color-border)" }}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-xs font-medium text-(--color-text-muted)">¿Qué te ha parecido?</span>
                <StarRatingInput tipo="stop" targetId={stop.id} nombre={stop.name} size={20} />
              </div>
              <BotonResena tipo="stop" targetId={stop.id} nombre={stop.name} />
            </div>

            <div className="mt-3">
              <StopDetailTabs stop={stop} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
