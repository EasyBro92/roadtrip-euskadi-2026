import { useEffect } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { useUIStore } from "../stores/useUIStore";

const ICONS = { info: Info, success: CheckCircle2, error: AlertCircle };
const TONE_CLASSES = {
  info: "bg-(--color-surface) text-(--color-text)",
  success: "bg-(--color-progress) text-white",
  error: "bg-(--color-cancelled) text-white",
};

/** Toasts accesibles (sección 14): auto-dismiss, `role="status"` para lectores de pantalla. */
export function ToastStack() {
  const toasts = useUIStore((s) => s.toasts);
  const dismissToast = useUIStore((s) => s.dismissToast);

  useEffect(() => {
    const timers = toasts.map((toast) => setTimeout(() => dismissToast(toast.id), 4000));
    return () => timers.forEach(clearTimeout);
  }, [toasts, dismissToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[1200] flex flex-col items-center gap-2 px-4">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.tone];
        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex max-w-sm items-center gap-2 rounded-(--radius-control) px-4 py-2.5 text-sm font-medium shadow-(--shadow-card) ${TONE_CLASSES[toast.tone]}`}
          >
            <Icon size={16} aria-hidden="true" />
            <span>{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
}
