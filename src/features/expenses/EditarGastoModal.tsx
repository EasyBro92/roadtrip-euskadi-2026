import { PiggyBank, X } from "lucide-react";
import { useState } from "react";
import { useTripStore } from "../../stores/useTripStore";
import { useUIStore } from "../../stores/useUIStore";
import type { ExpenseCategory } from "../../types";
import { CATEGORIAS_GASTO } from "./categorias";

/**
 * Editar un gasto ya apuntado.
 *
 * Un gasto se apunta con prisa, de pie y con el datáfono en la otra mano: es
 * normal poner mal el importe o la categoría. Antes sólo se podía borrar y
 * volver a escribirlo entero.
 */
export function EditarGastoModal({ expenseId }: { expenseId: string }) {
  const gasto = useTripStore((s) => s.expenses.find((e) => e.id === expenseId));
  const travelers = useTripStore((s) => s.trip.travelers);
  const aportaciones = useTripStore((s) => s.aportaciones);
  const updateExpense = useTripStore((s) => s.updateExpense);
  const closeModal = useUIStore((s) => s.closeModal);
  const pushToast = useUIStore((s) => s.pushToast);

  const [importe, setImporte] = useState(gasto ? String(gasto.amountEUR) : "");
  const [categoria, setCategoria] = useState<ExpenseCategory>(gasto?.category ?? "otros");
  const [lugar, setLugar] = useState(gasto?.place ?? "");
  const [fecha, setFecha] = useState(gasto?.date ?? "");
  const [delBote, setDelBote] = useState(Boolean(gasto?.pagadoDelBote));
  const [pagador, setPagador] = useState(gasto?.paidByTravelerId ?? travelers[0]?.id ?? "");

  if (!gasto) return null;

  const valor = Number.parseFloat(importe.replace(",", "."));
  const valido = Number.isFinite(valor) && valor > 0;
  const hayBote = aportaciones.length > 0;

  function guardar() {
    if (!valido) return;
    updateExpense(expenseId, {
      amountEUR: valor,
      category: categoria,
      place: lugar.trim() || CATEGORIAS_GASTO.find((c) => c.id === categoria)!.etiqueta,
      date: fecha,
      pagadoDelBote: delBote,
      // Del bote no lo paga nadie en concreto; quien lo puso ya está contado
      // en las aportaciones, y dejar un pagador aquí lo contaría dos veces.
      paidByTravelerId: delBote ? null : pagador || null,
    });
    pushToast("Gasto actualizado.", "success");
    closeModal();
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/40" onClick={closeModal}>
      <div className="safe-bottom max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-(--color-surface) p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-(--color-text)">Editar gasto</h2>
          <button aria-label="Cerrar" onClick={closeModal} className="-mr-1 p-1">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <label className="mb-1 block text-xs font-medium text-(--color-text-muted)">Cuánto</label>
        <div className="relative mb-4">
          <input
            value={importe}
            onChange={(e) => setImporte(e.target.value)}
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            className="w-full rounded-(--radius-control) border bg-(--color-bg) py-2.5 pl-3 pr-8 text-2xl font-medium tracking-tight text-(--color-text)"
            style={{ borderColor: "var(--color-border)" }}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-lg text-(--color-text-muted)">€</span>
        </div>

        <label className="mb-1 block text-xs font-medium text-(--color-text-muted)">En qué</label>
        <div className="mb-4 flex flex-wrap gap-1.5">
          {CATEGORIAS_GASTO.map((c) => {
            const activa = categoria === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setCategoria(c.id)}
                aria-pressed={activa}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${activa ? "font-medium text-white" : "bg-(--color-surface) text-(--color-text)"}`}
                style={activa ? { background: c.color, borderColor: c.color } : { borderColor: "var(--color-border)" }}
              >
                {!activa && <span className="h-2 w-2 rounded-full" style={{ background: c.color }} aria-hidden="true" />}
                {c.corta}
              </button>
            );
          })}
        </div>

        <label className="mb-1 block text-xs font-medium text-(--color-text-muted)">Dónde</label>
        <input
          value={lugar}
          onChange={(e) => setLugar(e.target.value)}
          className="mb-4 w-full rounded-(--radius-control) border bg-(--color-bg) px-3 py-2.5 text-sm text-(--color-text)"
          style={{ borderColor: "var(--color-border)" }}
        />

        <label className="mb-1 block text-xs font-medium text-(--color-text-muted)">Cuándo</label>
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="mb-4 w-full rounded-(--radius-control) border bg-(--color-bg) px-3 py-2.5 text-sm text-(--color-text)"
          style={{ borderColor: "var(--color-border)" }}
        />

        <label className="mb-1 block text-xs font-medium text-(--color-text-muted)">Quién lo pagó</label>
        <div className="mb-5 flex flex-wrap gap-1.5">
          {hayBote && (
            <button
              onClick={() => setDelBote(true)}
              aria-pressed={delBote}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${delBote ? "border-(--color-navigation) bg-(--color-navigation) font-medium text-white" : "bg-(--color-surface) text-(--color-text)"}`}
              style={!delBote ? { borderColor: "var(--color-border)" } : undefined}
            >
              <PiggyBank size={13} aria-hidden="true" /> El bote
            </button>
          )}
          {travelers.map((t) => {
            const activo = !delBote && pagador === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setDelBote(false);
                  setPagador(t.id);
                }}
                aria-pressed={activo}
                className={`rounded-full border px-3 py-1.5 text-sm ${activo ? "border-(--color-navigation) bg-(--color-navigation) font-medium text-white" : "bg-(--color-surface) text-(--color-text)"}`}
                style={!activo ? { borderColor: "var(--color-border)" } : undefined}
              >
                {t.name}
              </button>
            );
          })}
        </div>

        <button
          onClick={guardar}
          disabled={!valido}
          className="w-full rounded-full bg-(--color-navigation) py-3 text-sm font-semibold text-white disabled:opacity-40"
        >
          Guardar
        </button>
      </div>
    </div>
  );
}
