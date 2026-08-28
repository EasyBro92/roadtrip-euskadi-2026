import { create } from "zustand";

export type BottomTabId = "map" | "itinerary" | "journal" | "expenses" | "more";
export type BottomSheetState = "minimized" | "mid" | "expanded";
export type StopDetailTab = "resumen" | "que-ver" | "fotos" | "gastronomia" | "hotel" | "aparcamiento" | "notas" | "gastos" | "lluvia" | "practica";

export interface Toast {
  id: string;
  message: string;
  tone: "info" | "success" | "error";
}

export type ModalState =
  | { type: "none" }
  | { type: "stop-editor"; stopId: string | null; dayId: string }
  | { type: "ficha-parada"; stopId: string }
  /** Selector de día reutilizable: "¿a qué día lo añado?" */
  | { type: "day-picker"; title: string; message?: string; onPick: (dayId: string) => void }
  /** Biblioteca de lugares opcionales embebida, para añadir desde el itinerario. */
  | { type: "trip-switcher" }
  | { type: "review"; tipo: "stop" | "route"; targetId: string; nombre: string }
  | { type: "editar-gasto"; expenseId: string }
  | { type: "prompt"; title: string; message?: string; placeholder?: string; initialValue?: string; onSubmit: (valor: string) => void }
  | { type: "choice"; title: string; message?: string; options: { id: string; label: string }[]; onPick: (id: string) => void }
  | { type: "place-library"; dayId: string }
  | { type: "add-place-search" }
  | { type: "share" }
  | { type: "offline" }
  | { type: "pin-confirm"; onConfirm: () => void }
  | {
      type: "confirm";
      title: string;
      message: string;
      onConfirm: () => void;
      /** Etiquetas y acción alternativa opcionales: permite usar el diálogo como elección entre dos opciones, no solo confirmar/cancelar. */
      confirmLabel?: string;
      cancelLabel?: string;
      onCancel?: () => void;
    };

interface UIStoreState {
  activeTab: BottomTabId;
  setActiveTab: (tab: BottomTabId) => void;

  bottomSheetState: BottomSheetState;
  setBottomSheetState: (state: BottomSheetState) => void;

  stopDetailTab: StopDetailTab;
  setStopDetailTab: (tab: StopDetailTab) => void;

  modal: ModalState;
  openModal: (modal: ModalState) => void;
  closeModal: () => void;

  toasts: Toast[];
  pushToast: (message: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: string) => void;

  welcomeScreenVisible: boolean;
  dismissWelcomeScreen: () => void;
}

export const useUIStore = create<UIStoreState>((set) => ({
  activeTab: "map",
  setActiveTab: (tab) => set({ activeTab: tab }),

  bottomSheetState: "minimized",
  setBottomSheetState: (state) => set({ bottomSheetState: state }),

  stopDetailTab: "resumen",
  setStopDetailTab: (tab) => set({ stopDetailTab: tab }),

  modal: { type: "none" },
  openModal: (modal) => set({ modal }),
  closeModal: () => set({ modal: { type: "none" } }),

  toasts: [],
  pushToast: (message, tone = "info") =>
    set((state) => ({ toasts: [...state.toasts, { id: crypto.randomUUID(), message, tone }] })),
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  welcomeScreenVisible: true,
  dismissWelcomeScreen: () => set({ welcomeScreenVisible: false }),
}));
