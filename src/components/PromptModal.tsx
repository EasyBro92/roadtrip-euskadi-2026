import { useState } from "react";
import { useUIStore } from "../stores/useUIStore";

/** Pedir un texto corto — un nombre de lista, un título — sin salir de la pantalla. */
export function PromptModal({
  title,
  message,
  placeholder,
  initialValue = "",
  onSubmit,
}: {
  title: string;
  message?: string;
  placeholder?: string;
  initialValue?: string;
  onSubmit: (valor: string) => void;
}) {
  const closeModal = useUIStore((s) => s.closeModal);
  const [valor, setValor] = useState(initialValue);

  function aceptar() {
    // Un nombre en blanco no vale; el botón queda apagado hasta que escribas.
    if (!valor.trim()) return;
    onSubmit(valor.trim());
    closeModal();
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-5" onClick={closeModal}>
      <div
        className="w-full max-w-sm rounded-(--radius-card) bg-(--color-surface) p-5 shadow-(--shadow-card)"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-(--color-text)">{title}</h2>
        {message && <p className="mt-1 text-sm text-(--color-text-muted)">{message}</p>}

        <input
          autoFocus
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && aceptar()}
          placeholder={placeholder}
          className="mt-3 w-full rounded-(--radius-control) border bg-(--color-bg) px-3 py-2.5 text-sm text-(--color-text)"
          style={{ borderColor: "var(--color-border)" }}
        />

        <div className="mt-4 flex gap-2">
          <button
            onClick={closeModal}
            className="flex-1 rounded-full border py-2.5 text-sm font-medium"
            style={{ borderColor: "var(--color-border)" }}
          >
            Cancelar
          </button>
          <button
            onClick={aceptar}
            disabled={!valor.trim()}
            className="flex-1 rounded-full bg-(--color-navigation) py-2.5 text-sm font-medium text-white disabled:opacity-40"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
