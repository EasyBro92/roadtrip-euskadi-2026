import { SwipeToDelete } from "../../components/SwipeToDelete";
import { useTripStore } from "../../stores/useTripStore";
import { useUIStore } from "../../stores/useUIStore";
import type { Expense } from "../../types";
import { formatDateLong, formatEUR } from "../../utils/format";
import { colorCategoria, etiquetaCategoria } from "./categorias";

/**
 * Los gastos, agrupados por día.
 *
 * Antes era una lista plana con la fecha en crudo (`2026-08-29`) repetida en
 * cada fila. Agrupando se lee de un vistazo lo que se gastó cada día, que es
 * la pregunta real: "¿qué me gasté ayer?".
 */
export function ListaGastos({ expenses }: { expenses: Expense[] }) {
  const stops = useTripStore((s) => s.stopsById);
  const travelers = useTripStore((s) => s.trip.travelers);
  const deleteExpense = useTripStore((s) => s.deleteExpense);
  const openModal = useUIStore((s) => s.openModal);
  const pushToast = useUIStore((s) => s.pushToast);

  if (expenses.length === 0) {
    return (
      <p className="mt-4 rounded-(--radius-card) bg-(--color-surface-muted) p-4 text-center text-sm text-(--color-text-muted)">
        Aún no has apuntado nada. Escribe el importe ahí arriba y dale a Añadir.
      </p>
    );
  }

  // Del día más reciente al más antiguo, y dentro de cada día lo último primero.
  const porFecha = new Map<string, Expense[]>();
  for (const e of expenses) porFecha.set(e.date, [...(porFecha.get(e.date) ?? []), e]);
  const dias = [...porFecha.entries()].sort((a, b) => b[0].localeCompare(a[0]));

  /**
   * Borrar no se puede deshacer y descuadra el presupuesto, así que se
   * pregunta diciendo exactamente qué se va.
   */
  function borrar(e: Expense) {
    const descripcion = e.place || etiquetaCategoria(e.category);
    openModal({
      type: "confirm",
      title: "Borrar gasto",
      message: `¿Borrar ${formatEUR(e.amountEUR)} de ${descripcion}? No se puede deshacer.`,
      onConfirm: () => {
        deleteExpense(e.id);
        pushToast("Gasto borrado.", "success");
      },
    });
  }

  return (
    <div className="mt-4 space-y-4">
      {dias.map(([fecha, delDia]) => {
        const total = delDia.reduce((s, e) => s + e.amountEUR, 0);
        return (
          <section key={fecha}>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <h2 className="truncate text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)">{formatDateLong(fecha)}</h2>
              <span className="shrink-0 text-xs font-medium text-(--color-text)">{formatEUR(total)}</span>
            </div>

            <div className="space-y-1.5">
              {[...delDia].reverse().map((e) => {
                const parada = e.stopId ? stops[e.stopId]?.name : undefined;
                const quien = travelers.length > 1 ? travelers.find((t) => t.id === e.paidByTravelerId)?.name : undefined;
                return (
                  <SwipeToDelete
                    key={e.id}
                    deleteLabel={`Borrar el gasto de ${formatEUR(e.amountEUR)} en ${e.place || etiquetaCategoria(e.category)}`}
                    onDelete={() => borrar(e)}
                  >
                    <button
                      onClick={() => openModal({ type: "editar-gasto", expenseId: e.id })}
                      className="flex w-full items-center gap-2.5 rounded-xl border bg-(--color-surface) p-2.5 text-left"
                      style={{ borderColor: "var(--color-border)" }}
                    >
                      {/* Franja de color en vez de repetir la categoría en texto. */}
                      <span className="h-8 w-1 shrink-0 rounded-full" style={{ background: colorCategoria(e.category) }} aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-(--color-text)">{e.place || etiquetaCategoria(e.category)}</p>
                        <p className="truncate text-xs text-(--color-text-muted)">
                          {etiquetaCategoria(e.category)}
                          {e.time && <> · {e.time}</>}
                          {parada && <> · {parada}</>}
                          {e.pagadoDelBote ? <> · del bote</> : quien ? <> · pagó {quien}</> : null}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-(--color-text)">{formatEUR(e.amountEUR)}</span>
                    </button>
                  </SwipeToDelete>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
