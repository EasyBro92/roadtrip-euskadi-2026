import { lazy, Suspense, useRef } from "react";
import { useModalAccesible } from "../hooks/useModalAccesible";
import { useUIStore } from "../stores/useUIStore";
import { ChoiceModal } from "./ChoiceModal";
import { PromptModal } from "./PromptModal";

/*
 * Los modales grandes se descargan al abrirlos, no al arrancar.
 *
 * Este componente envuelve todas las pantallas, así que lo que importe aquí
 * se carga antes de pintar nada. Con los siete modales dentro, abrir la app
 * suponía leer la ficha de parada, el editor de gastos, las reseñas y —por
 * las fotos y los horarios en caché— la base de datos entera, unos 150 kB,
 * para enseñar una lista de viajes que no usa nada de eso.
 *
 * Se quedan dentro los tres diálogos pequeños (confirmar, preguntar, elegir):
 * pesan poco y son los que salen sin avisar, donde un instante de espera se
 * nota. `precargarModales` trae los demás en cuanto la app está quieta, así
 * que al tocar una parada ya están ahí.
 */
const cargas = {
  ficha: () => import("../features/itinerary/FichaParadaModal"),
  lugares: () => import("../features/itinerary/PlaceLibraryModal"),
  editor: () => import("../features/itinerary/StopEditorModal"),
  gasto: () => import("../features/expenses/EditarGastoModal"),
  resena: () => import("../features/reviews/ReviewModal"),
  dia: () => import("./DayPickerModal"),
  viajes: () => import("./TripSwitcherModal"),
};

const FichaParadaModal = lazy(() => cargas.ficha().then((m) => ({ default: m.FichaParadaModal })));
const PlaceLibraryModal = lazy(() => cargas.lugares().then((m) => ({ default: m.PlaceLibraryModal })));
const StopEditorModal = lazy(() => cargas.editor().then((m) => ({ default: m.StopEditorModal })));
const EditarGastoModal = lazy(() => cargas.gasto().then((m) => ({ default: m.EditarGastoModal })));
const ReviewModal = lazy(() => cargas.resena().then((m) => ({ default: m.ReviewModal })));
const DayPickerModal = lazy(() => cargas.dia().then((m) => ({ default: m.DayPickerModal })));
const TripSwitcherModal = lazy(() => cargas.viajes().then((m) => ({ default: m.TripSwitcherModal })));

/** Trae los modales en segundo plano. Sin conexión falla en silencio: ya se intentará al abrirlos. */
export function precargarModales(): void {
  for (const cargar of Object.values(cargas)) void cargar().catch(() => undefined);
}

/**
 * Punto único de renderizado de modales (sección 17/25), controlado por
 * useUIStore.modal.
 *
 * Y por eso también el único sitio donde hace falta resolver el teclado y el
 * lector de pantalla: envolviendo aquí, los diez modales ganan a la vez el
 * foco que entra al abrir y vuelve al cerrar, la tecla Escape y el tabulador
 * encerrado. Ver `useModalAccesible` para lo que se midió que fallaba.
 */
export function ModalHost() {
  const modal = useUIStore((s) => s.modal);
  const closeModal = useUIStore((s) => s.closeModal);
  const caja = useRef<HTMLDivElement>(null);

  useModalAccesible(caja, modal.type !== "none", closeModal);

  if (modal.type === "none") return null;

  return (
    // El div no estorba: los modales de dentro son `position: fixed`, que se
    // colocan contra la ventana y no contra este contenedor.
    <div ref={caja} role="dialog" aria-modal="true" tabIndex={-1}>
      {/* Sin nada mientras llega: son décimas, y un indicador de carga
          parpadeando a pantalla completa molesta más que la espera. */}
      <Suspense fallback={null}>{contenido()}</Suspense>
    </div>
  );

  function contenido() {
  if (modal.type === "none") return null;

  if (modal.type === "stop-editor") return <StopEditorModal stopId={modal.stopId} dayId={modal.dayId} />;

  if (modal.type === "ficha-parada") return <FichaParadaModal stopId={modal.stopId} origen={modal.origen} />;

  if (modal.type === "day-picker") return <DayPickerModal title={modal.title} message={modal.message} onPick={modal.onPick} />;

  if (modal.type === "place-library") return <PlaceLibraryModal dayId={modal.dayId} />;

  if (modal.type === "trip-switcher") return <TripSwitcherModal />;
  if (modal.type === "review") return <ReviewModal tipo={modal.tipo} targetId={modal.targetId} nombre={modal.nombre} />;
  if (modal.type === "editar-gasto") return <EditarGastoModal expenseId={modal.expenseId} />;
  if (modal.type === "prompt")
    return <PromptModal title={modal.title} message={modal.message} placeholder={modal.placeholder} initialValue={modal.initialValue} onSubmit={modal.onSubmit} />;
  if (modal.type === "choice") return <ChoiceModal title={modal.title} message={modal.message} options={modal.options} onPick={modal.onPick} />;

  if (modal.type === "confirm") {
    return (
      <div className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/40 px-6" onClick={closeModal}>
        <div className="w-full max-w-sm rounded-(--radius-card) bg-(--color-surface) p-5 shadow-(--shadow-card)" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-base font-semibold">{modal.title}</h2>
          <p className="mt-2 text-sm text-(--color-text-muted)">{modal.message}</p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => {
                modal.onCancel?.();
                closeModal();
              }}
              className="flex-1 rounded-(--radius-control) border py-2.5 text-sm font-medium"
              style={{ borderColor: "var(--color-border)" }}
            >
              {modal.cancelLabel ?? "Cancelar"}
            </button>
            <button
              onClick={() => {
                modal.onConfirm();
                closeModal();
              }}
              className="flex-1 rounded-(--radius-control) bg-(--color-navigation) py-2.5 text-sm font-medium text-white"
            >
              {modal.confirmLabel ?? "Confirmar"}
            </button>
          </div>
        </div>
      </div>
    );
  }

    return null;
  }
}
