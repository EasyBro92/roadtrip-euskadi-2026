import { Pencil } from "lucide-react";
import { useTripStore } from "../../stores/useTripStore";
import { useUIStore } from "../../stores/useUIStore";
import type { ExpenseCategory } from "../../types";
import { formatEUR } from "../../utils/format";

const CATEGORIAS: { id: ExpenseCategory; etiqueta: string }[] = [
  { id: "hotel", etiqueta: "Dormir" },
  { id: "restaurante", etiqueta: "Comer" },
  { id: "combustible", etiqueta: "Combustible" },
  { id: "entrada", etiqueta: "Entradas" },
  { id: "peaje", etiqueta: "Peajes" },
  { id: "aparcamiento", etiqueta: "Aparcamiento" },
  { id: "compra", etiqueta: "Compras" },
  { id: "otros", etiqueta: "Otros" },
];

function color(pct: number): string {
  if (pct > 100) return "var(--color-cancelled)";
  if (pct > 80) return "var(--color-skipped)";
  return "var(--color-progress)";
}

/**
 * Presupuesto por categoría y coste previsto del viaje.
 *
 * El total ya estaba arriba en la tarjeta grande; esto es lo que aquello no
 * dice: en qué te estás pasando. Un viaje puede ir bien de total y llevar el
 * doble de lo previsto en restaurantes.
 */
export function PanelPresupuesto({ gastadoPorCategoria }: { gastadoPorCategoria: Record<ExpenseCategory, number> }) {
  const trip = useTripStore((s) => s.trip);
  const stopsById = useTripStore((s) => s.stopsById);
  const setCategoryBudget = useTripStore((s) => s.setCategoryBudget);
  const setBudget = useTripStore((s) => s.setBudget);
  const openModal = useUIStore((s) => s.openModal);

  const topes = trip.budgetByCategoryEUR ?? {};

  /*
   * Lo que el viaje va a costar según lo que ya has apuntado en cada parada
   * (entradas, parking). No es una predicción: es la suma de lo que tú
   * mismo escribiste, así que sólo sale si hay algo que sumar.
   */
  const previsto = Object.values(stopsById)
    .filter((s) => s.enabled)
    .reduce((suma, s) => suma + (s.expectedCostEUR ?? 0), 0);

  function pedirImporte(titulo: string, actual: number | undefined, alGuardar: (valor: number | null) => void) {
    openModal({
      type: "prompt",
      title: titulo,
      message: "En euros. Déjalo a 0 para quitar el tope.",
      initialValue: actual ? String(actual) : "",
      placeholder: "150",
      onSubmit: (texto) => {
        const valor = Number(texto.replace(",", "."));
        if (Number.isNaN(valor)) return;
        alGuardar(valor);
      },
    });
  }

  return (
    <div className="mt-4 rounded-(--radius-card) border bg-(--color-surface) p-4 shadow-(--shadow-card)" style={{ borderColor: "var(--color-border)" }}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-(--color-text)">Presupuesto</h2>
        <button
          onClick={() => pedirImporte("Presupuesto del viaje", trip.budgetEUR, (v) => setBudget(v ?? 0))}
          className="flex items-center gap-1 text-xs text-(--color-navigation)"
        >
          <Pencil size={12} aria-hidden="true" /> Cambiar total
        </button>
      </div>

      {previsto > 0 && (
        <p className="mt-1 text-xs text-(--color-text-muted)">
          Coste previsto de las paradas: <strong className="text-(--color-text)">{formatEUR(previsto)}</strong>
          {trip.budgetEUR > 0 && previsto > trip.budgetEUR && <span className="text-(--color-cancelled)"> · ya supera el presupuesto</span>}
        </p>
      )}

      <ul className="mt-3 space-y-2.5">
        {CATEGORIAS.map(({ id, etiqueta }) => {
          const gastado = gastadoPorCategoria[id] ?? 0;
          const tope = topes[id];
          const pct = tope && tope > 0 ? (gastado / tope) * 100 : 0;

          // Sin tope y sin gasto no hay nada que contar: se calla.
          if (!tope && gastado === 0) return null;

          return (
            <li key={id}>
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="text-(--color-text)">{etiqueta}</span>
                <button
                  onClick={() => pedirImporte(`Tope para ${etiqueta.toLowerCase()}`, tope, (v) => setCategoryBudget(id, v))}
                  className="shrink-0 text-(--color-text-muted)"
                >
                  {tope ? (
                    <>
                      {formatEUR(gastado)} <span className="text-(--color-text-muted)">de {formatEUR(tope)}</span>
                    </>
                  ) : (
                    <>
                      {formatEUR(gastado)} <span className="text-(--color-navigation)">· poner tope</span>
                    </>
                  )}
                </button>
              </div>
              {tope != null && tope > 0 && (
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-(--color-surface-muted)">
                  <div className="h-full" style={{ width: `${Math.min(100, pct)}%`, background: color(pct) }} />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {CATEGORIAS.every(({ id }) => !topes[id] && (gastadoPorCategoria[id] ?? 0) === 0) && (
        <p className="mt-2 text-xs text-(--color-text-muted)">
          Aún no hay gastos. Cuando apuntes alguno podrás ponerle un tope a cada categoría.
        </p>
      )}
    </div>
  );
}
