import { FichaParadaModal } from "../features/itinerary/FichaParadaModal";
import { PlaceLibraryModal } from "../features/itinerary/PlaceLibraryModal";
import { StopEditorModal } from "../features/itinerary/StopEditorModal";
import { EditarGastoModal } from "../features/expenses/EditarGastoModal";
import { ReviewModal } from "../features/reviews/ReviewModal";
import { useUIStore } from "../stores/useUIStore";
import { ChoiceModal } from "./ChoiceModal";
import { DayPickerModal } from "./DayPickerModal";
import { PromptModal } from "./PromptModal";
import { TripSwitcherModal } from "./TripSwitcherModal";

/** Punto único de renderizado de modales (sección 17/25), controlado por useUIStore.modal. */
export function ModalHost() {
  const modal = useUIStore((s) => s.modal);
  const closeModal = useUIStore((s) => s.closeModal);

  if (modal.type === "none") return null;

  if (modal.type === "stop-editor") return <StopEditorModal stopId={modal.stopId} dayId={modal.dayId} />;

  if (modal.type === "ficha-parada") return <FichaParadaModal stopId={modal.stopId} />;

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
