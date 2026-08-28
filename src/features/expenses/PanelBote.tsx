import { PiggyBank, Plus, Trash2 } from "lucide-react";
import { estadoDelBote } from "../../services/expenses/bote";
import { useTripStore } from "../../stores/useTripStore";
import { useUIStore } from "../../stores/useUIStore";
import { formatEUR } from "../../utils/format";

/**
 * El bote común: dinero que alguien adelanta para los gastos de todos.
 *
 * Lo que se aporta cuenta como puesto por esa persona, y lo que sale del bote
 * se reparte entre todos. Así, quien adelanta recupera lo que sobra sin que
 * haya que apuntar ninguna devolución: ya sale en "Quién debe a quién".
 */
export function PanelBote() {
  const expenses = useTripStore((s) => s.expenses);
  const aportaciones = useTripStore((s) => s.aportaciones);
  const travelers = useTripStore((s) => s.trip.travelers);
  const addAportacion = useTripStore((s) => s.addAportacion);
  const deleteAportacion = useTripStore((s) => s.deleteAportacion);
  const openModal = useUIStore((s) => s.openModal);
  const pushToast = useUIStore((s) => s.pushToast);

  const bote = estadoDelBote(expenses, aportaciones);
  const vacio = aportaciones.length === 0;

  function anadir() {
    const poner = (travelerId: string) =>
      openModal({
        type: "prompt",
        title: `¿Cuánto pone ${travelers.find((t) => t.id === travelerId)?.name ?? ""}?`,
        message: "En euros. Es dinero adelantado para gastos de todos.",
        placeholder: "200",
        onSubmit: (texto) => {
          const valor = Number(texto.replace(",", "."));
          if (!Number.isFinite(valor) || valor <= 0) return;
          addAportacion(travelerId, valor);
          pushToast(`${formatEUR(valor)} al bote.`, "success");
        },
      });

    // Con un solo viajero no hay a quién preguntar.
    if (travelers.length <= 1) {
      poner(travelers[0]?.id ?? "");
      return;
    }
    openModal({
      type: "choice",
      title: "¿Quién pone el dinero?",
      options: travelers.map((t) => ({ id: t.id, label: t.name })),
      onPick: poner,
    });
  }

  return (
    <div className="mt-4 rounded-(--radius-card) border bg-(--color-surface) p-4 shadow-(--shadow-card)" style={{ borderColor: "var(--color-border)" }}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-(--color-text)">
          <PiggyBank size={15} className="text-(--color-link)" aria-hidden="true" /> Bote común
        </h2>
        <button onClick={anadir} className="flex items-center gap-1 text-xs font-medium text-(--color-link)">
          <Plus size={12} aria-hidden="true" /> Poner dinero
        </button>
      </div>

      {vacio ? (
        <p className="mt-2 text-xs text-(--color-text-muted)">
          Si alguien adelanta dinero para los gastos de todos, apúntalo aquí. Después puedes marcar cada gasto como pagado del bote y las cuentas cuadran solas.
        </p>
      ) : (
        <>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <p className={`text-2xl font-medium tracking-tight ${bote.restante < 0 ? "text-(--color-cancelled)" : "text-(--color-text)"}`}>{formatEUR(bote.restante)}</p>
            <p className="shrink-0 text-xs text-(--color-text-muted)">
              quedan de {formatEUR(bote.totalAportado)}
            </p>
          </div>

          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-(--color-surface-muted)">
            <div
              className="h-full"
              style={{
                width: `${Math.min(100, bote.totalAportado > 0 ? (bote.gastadoDelBote / bote.totalAportado) * 100 : 0)}%`,
                background: bote.restante < 0 ? "var(--color-cancelled)" : "var(--color-progress)",
              }}
            />
          </div>

          {bote.restante < 0 && (
            <p className="mt-1.5 text-xs text-(--color-cancelled)">
              Has gastado del bote más de lo que hay dentro. Revisa los apuntes o pon más dinero.
            </p>
          )}

          <ul className="mt-3 space-y-1.5">
            {aportaciones.map((a) => (
              <li key={a.id} className="flex items-center gap-2 text-xs">
                <span className="min-w-0 flex-1 truncate text-(--color-text)">{travelers.find((t) => t.id === a.travelerId)?.name ?? "Alguien"}</span>
                <span className="shrink-0 font-medium text-(--color-text)">{formatEUR(a.amountEUR)}</span>
                <button
                  onClick={() =>
                    openModal({
                      type: "confirm",
                      title: "Quitar del bote",
                      message: `¿Quitar los ${formatEUR(a.amountEUR)} que puso ${travelers.find((t) => t.id === a.travelerId)?.name ?? "esa persona"}?`,
                      onConfirm: () => deleteAportacion(a.id),
                    })
                  }
                  aria-label={`Quitar la aportación de ${formatEUR(a.amountEUR)}`}
                  className="shrink-0 p-1 text-(--color-cancelled)"
                >
                  <Trash2 size={12} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
