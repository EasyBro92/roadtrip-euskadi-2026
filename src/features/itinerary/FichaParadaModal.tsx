import { ArrowLeft, Check, Info, MapPin, Navigation, Pencil, X } from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAperturaDesde, type Origen } from "../../hooks/useAperturaDesde";
import { useGestosDeTarjeta } from "../../hooks/useGestosDeTarjeta";
import { CategoryThumb } from "../../components/CategoryThumb";
import { StarRatingInput } from "../../components/StarRatingInput";
import { useTripStore } from "../../stores/useTripStore";
import { useUIStore } from "../../stores/useUIStore";
import { BotonResena } from "../reviews/BotonResena";
import { StopDetailTabs } from "../map/StopDetailTabs";

const MEDIA_VUELTA_MS = 170;
const VUELTA_ENTERA_MS = 200;

function reduceMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * La parada en grande, al tocarla en el itinerario.
 *
 * Antes tocar una parada de la lista no hacía nada: para ver de qué iba, o
 * para cualquier cosa que no fuese marcarla visitada, había que abrir el menú
 * de los tres puntos. En cualquier app, tocar una fila la abre.
 *
 * Es una tarjeta flotante, no una hoja a pantalla completa: con margen por
 * los cuatro lados y redondeada por los cuatro lados, como una tarjeta de
 * Google Wallet o Passbook al ampliarse.
 *
 * Y como esas, tiene dos caras. Delante, la foto y lo que se hace con prisa:
 * cómo llegar, verla en el mapa, marcarla visitada. Detrás, lo que se hace
 * sentado: qué te ha parecido, la reseña, las pestañas de información y
 * editarla. En la cara caben tres cosas y se ven las tres; con todo junto no
 * se veía ninguna sin desplazar.
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

  const [dorso, setDorso] = useState(false);
  const girando = useRef(false);
  const gestos = useGestosDeTarjeta(panel, fondo, closeModal, () => girar());

  if (!stop) return null;

  function verEnElMapa() {
    setCurrentDay(stop.dayId);
    setCurrentStop(stop.id);
    closeModal();
    navigate("/mapa");
  }

  /**
   * Darle la vuelta a la tarjeta.
   *
   * El contenido se cambia con la tarjeta de canto, a mitad de giro, cuando
   * no se ve nada: así las dos caras pueden medir lo que necesiten y el
   * cambio de alto ocurre mientras no hay nada que mirar. Con las dos caras
   * dibujadas a la vez habría que fijarle un alto a la tarjeta, y volvería a
   * ser tan grande como la más larga de las dos.
   */
  function girar() {
    const el = panel.current;
    if (!el || girando.current) return;

    if (reduceMotion()) {
      setDorso((v) => !v);
      return;
    }

    girando.current = true;
    // El centro, no la esquina de la que salió al abrirse: girando sobre el
    // punto de apertura la tarjeta saldría despedida de lado.
    el.style.transformOrigin = "";

    const ida = el.animate([{ transform: "rotateY(0deg)" }, { transform: "rotateY(-90deg)" }], {
      duration: MEDIA_VUELTA_MS,
      easing: "cubic-bezier(0.4, 0, 1, 1)",
      fill: "forwards",
    });

    /*
     * El cambio de cara lo manda el reloj, no el final de la animación.
     *
     * El reloj de las animaciones se para cuando la pestaña no se está
     * pintando —cambias de app a media vuelta—, y entonces `onfinish` no
     * llega nunca. Colgando de él el cambio de cara, la tarjeta se quedaba
     * clavada de canto: con `fill: forwards` a 90° no se ve nada, así que al
     * volver te encontrabas la ficha desaparecida y el fondo oscuro puesto.
     * Medido aquí: 600 ms después de una vuelta de 170 seguía "running".
     *
     * Con un temporizador, la cara cambia igual aunque nadie esté mirando, y
     * al volver la tarjeta está en la que toca. La animación es el adorno;
     * esto es lo que de verdad da la vuelta.
     */
    setTimeout(() => {
      setDorso((v) => !v);
      requestAnimationFrame(() => {
        // Quitar el `fill` de la ida: si no, deja la tarjeta fijada de canto.
        ida.cancel();
        el.animate([{ transform: "rotateY(90deg)" }, { transform: "rotateY(0deg)" }], {
          duration: VUELTA_ENTERA_MS,
          easing: "cubic-bezier(0, 0, 0.2, 1)",
        });
        girando.current = false;
      });
    }, MEDIA_VUELTA_MS);
  }

  const botonCerrar = (
    <button
      aria-label="Cerrar"
      onClick={cerrar}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm"
    >
      <X size={16} aria-hidden="true" />
    </button>
  );

  return (
    <div
      ref={fondo}
      className="safe-top safe-bottom fixed inset-0 z-[2000] flex items-center justify-center bg-black/55 p-5"
      onClick={cerrar}
      style={{ perspective: "1400px" }}
    >
      {/*
       * Cada cara mide lo que ocupa lo suyo, hasta el tope.
       *
       * En Wallet un pase mide lo mismo por delante que por detrás, y se
       * probó a imitarlo con un alto mínimo para las dos caras. Quedó mal: el
       * dorso lleva tres cosas —valoración, reseña y editar— y forzarlo al
       * alto de la cara lo dejaba con medio panel en blanco. Un hueco vacío
       * de ese tamaño es peor defecto que dos caras de distinto alto, sobre
       * todo cuando el cambio de alto ocurre con la tarjeta de canto y no se
       * llega a ver.
       */}
      <div
        ref={panel}
        className="flex max-h-[80dvh] w-full max-w-sm flex-col overflow-hidden rounded-(--radius-card) bg-(--color-surface) shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ willChange: "transform, opacity" }}
      >
        {dorso ? (
            <>
              {/*
               * El dorso también se puede arrastrar para cerrar, y por eso
               * lleva su propia cabecera fija: si el gesto sólo viviera en la
               * foto, al darle la vuelta la tarjeta dejaría de cerrarse
               * arrastrando y el gesto sería una cosa que a veces está.
               */}
              <div
                className="flex shrink-0 items-center gap-2 border-b bg-(--color-surface-muted) p-3"
                style={{ borderColor: "var(--color-border)", touchAction: "none" }}
                {...gestos}
              >
                <button
                  onClick={girar}
                  aria-label="Volver a la cara de la ficha"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-(--color-surface) text-(--color-text)"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <ArrowLeft size={16} aria-hidden="true" />
                </button>
                <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-(--color-text)">{stop.name}</h2>
                {botonCerrar}
              </div>

              {/* Lo que se desplaza es esto, no la tarjeta: la cabecera se
                  queda fija arriba y el dorso se recorre por dentro. */}
              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
                {/* Tu nota del sitio, que es distinta de la valoración fotográfica
                    que viene con los datos. */}
                <div className="mt-3 rounded-xl border p-2.5" style={{ borderColor: "var(--color-border)" }}>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-xs font-medium text-(--color-text-muted)">¿Qué te ha parecido?</span>
                    <StarRatingInput tipo="stop" targetId={stop.id} nombre={stop.name} size={20} />
                  </div>
                  <BotonResena tipo="stop" targetId={stop.id} nombre={stop.name} />
                </div>

                <button
                  onClick={() => openModal({ type: "stop-editor", stopId: stop.id, dayId: stop.dayId })}
                  className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-full border text-sm font-medium text-(--color-text)"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <Pencil size={15} aria-hidden="true" /> Editar esta parada
                </button>
              </div>
            </>
          ) : (
            <>
              {/*
               * Los gestos viven en la foto, y no en toda la tarjeta: lo de
               * abajo puede desplazarse, y un arrastre que empiece ahí tiene
               * que mover el contenido, no llevarse la ficha. La foto no se
               * desplaza, así que ahí el gesto no significa dos cosas.
               *
               * `touch-action: none` es lo que impide que el navegador se
               * quede el gesto antes de que llegue aquí.
               */}
              <div className="relative shrink-0" style={{ touchAction: "none" }} {...gestos}>
                <CategoryThumb category={stop.category} heroImage={stop.heroImage} className="h-40 w-full" iconSize={44} />

                {/* La pista de que se puede arrastrar. Sin ella el gesto
                    existe pero no lo encuentra nadie. */}
                <span className="absolute left-1/2 top-2 h-1 w-9 -translate-x-1/2 rounded-full bg-white/55" aria-hidden="true" />

                <div className="absolute right-2 top-2">{botonCerrar}</div>

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-3 pt-10">
                  <h2 className="truncate text-lg font-semibold text-white">{stop.name}</h2>
                  <p className="truncate text-xs capitalize text-white/85">
                    {stop.category}
                    {stop.recommendedDurationMinutes > 0 && <> · {stop.recommendedDurationMinutes} min</>}
                    {stop.optional && <> · opcional</>}
                  </p>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
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
                  {/* La ⓘ del dorso, como en un pase de Wallet. Es un botón
                      visible y no sólo un gesto: un dorso que se descubre
                      girando la tarjeta sin querer es un dorso que no existe. */}
                  <button
                    onClick={girar}
                    aria-label="Ver el reverso: información, valoración y editar"
                    className="flex h-10 w-10 items-center justify-center rounded-full border text-(--color-text)"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    <Info size={16} aria-hidden="true" />
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

                {/* Las pestañas se quedan en la cara, no en el dorso.
                    Llevárselas dejó la ficha con menos información de la que
                    tenía: lo que se aparta al dorso es lo tuyo —la
                    valoración, la reseña, editarla—, no lo que cuenta qué es
                    este sitio, que es a lo que se viene. */}
                <div className="mt-3">
                  <StopDetailTabs stop={stop} />
                </div>
              </div>
            </>
          )}
      </div>
    </div>
  );
}
