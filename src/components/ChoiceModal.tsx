import { useUIStore } from "../stores/useUIStore";

export interface Opcion {
  id: string;
  label: string;
}

/** Elegir uno de varios. Como el selector de día, pero con opciones cualesquiera. */
export function ChoiceModal({ title, message, options, onPick }: { title: string; message?: string; options: Opcion[]; onPick: (id: string) => void }) {
  const closeModal = useUIStore((s) => s.closeModal);

  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/40" onClick={closeModal}>
      <div
        className="safe-bottom max-h-[70dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-(--color-surface) p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-(--color-text)">{title}</h2>
        {message && <p className="mt-1 text-sm text-(--color-text-muted)">{message}</p>}

        <ul className="mt-3">
          {options.map((o) => (
            <li key={o.id}>
              <button
                onClick={() => {
                  // Cerrar ANTES de avisar: si la acción abre otro modal — elegir
                  // quién pone el dinero y luego cuánto —, cerrar después lo
                  // borraría nada más aparecer.
                  closeModal();
                  onPick(o.id);
                }}
                className="w-full border-b py-3 text-left text-sm text-(--color-text) last:border-b-0"
                style={{ borderColor: "var(--color-border)" }}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>

        <button
          onClick={closeModal}
          className="mt-4 w-full rounded-full border py-2.5 text-sm font-medium"
          style={{ borderColor: "var(--color-border)" }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
