import { PiggyBank, Plus } from "lucide-react";
import { useState } from "react";
import { useTripStore } from "../../stores/useTripStore";
import { useUIStore } from "../../stores/useUIStore";
import type { ExpenseCategory } from "../../types";
import { fechaLocal } from "../../utils/format";
import { CATEGORIAS_GASTO } from "./categorias";
import { useDuenoDelBote } from "./useDuenoDelBote";

/**
 * Apuntar un gasto.
 *
 * Va arriba del todo a propósito. Estaba al final de la pantalla, detrás del
 * total, el presupuesto, el reparto, dos tarjetas y dos gráficas — y apuntar
 * un gasto es lo que haces diez veces al día en un viaje, mientras que las
 * gráficas se miran una vez.
 *
 * El importe manda: campo grande y teclado numérico, porque es el único dato
 * que no se puede deducir de nada.
 */
export function FormularioGasto() {
  const trip = useTripStore((s) => s.trip);
  const addExpense = useTripStore((s) => s.addExpense);
  const pushToast = useUIStore((s) => s.pushToast);

  const [importe, setImporte] = useState("");
  const [categoria, setCategoria] = useState<ExpenseCategory>("restaurante");
  const [lugar, setLugar] = useState("");
  const [pagador, setPagador] = useState(trip.travelers[0]?.id ?? "");
  const aportaciones = useTripStore((s) => s.aportaciones);
  const hayBote = aportaciones.length > 0;
  // Sólo el nombre de pila: el botón comparte fila con el campo de sitio.
  const dueno = useDuenoDelBote()?.split(" ")[0];
  /**
   * Con bote, lo normal es que el gasto salga de ahí: es el motivo de haber
   * adelantado el dinero. Por eso viene marcado y se desmarca si alguien paga
   * de su bolsillo.
   */
  const [delBote, setDelBote] = useState(true);

  const valor = Number.parseFloat(importe.replace(",", "."));
  const valido = Number.isFinite(valor) && valor > 0;

  function anadir() {
    if (!valido) {
      pushToast("Pon cuánto ha costado.", "info");
      return;
    }
    const ahora = new Date();
    addExpense({
      date: fechaLocal(ahora),
      time: ahora.toTimeString().slice(0, 5),
      amountEUR: valor,
      category: categoria,
      place: lugar.trim() || CATEGORIAS_GASTO.find((c) => c.id === categoria)!.etiqueta,
      dayId: trip.currentDayId,
      stopId: trip.currentStopId,
      // Del bote no lo paga nadie en concreto: quien puso ese dinero ya está
      // contado en las aportaciones, y apuntar además un pagador lo contaría
      // dos veces.
      pagadoDelBote: hayBote && delBote,
      paidByTravelerId: hayBote && delBote ? null : pagador || trip.travelers[0]?.id || null,
      splitBetweenTravelerIds: trip.travelers.map((t) => t.id),
      paymentMethod: "tarjeta",
      notes: "",
      receiptPhotoId: null,
      kind: "actual",
    });
    setImporte("");
    setLugar("");
    pushToast("Gasto apuntado.", "success");
  }

  return (
    // Sin tarjeta propia: va dentro de la del total, separado por una línea.
    // Eran dos cajas seguidas diciendo lo mismo — cuánto llevas y cuánto
    // añades — y la de arriba empujaba a ésta media pantalla abajo.
    <div>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            value={importe}
            onChange={(e) => setImporte(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && anadir()}
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0,00"
            aria-label="Cuánto"
            className="w-full rounded-(--radius-control) border bg-(--color-bg) py-2.5 pl-3 pr-8 text-2xl font-medium tracking-tight text-(--color-text)"
            style={{ borderColor: "var(--color-border)" }}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-lg text-(--color-text-muted)">€</span>
        </div>
        <button
          onClick={anadir}
          disabled={!valido}
          aria-label="Añadir gasto"
          className="flex h-[46px] shrink-0 items-center gap-1 rounded-(--radius-control) bg-(--color-navigation) px-4 text-sm font-semibold text-white disabled:opacity-40"
        >
          <Plus size={16} aria-hidden="true" /> Añadir
        </button>
      </div>

      {/* Chips en vez de un desplegable: se ve de un golpe en qué estás
          gastando y se elige con el pulgar sin abrir nada. */}
      <div className="mt-2.5 flex flex-wrap gap-1.5">
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

      <div className="mt-2.5 flex gap-2">
        <input
          value={lugar}
          onChange={(e) => setLugar(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && anadir()}
          placeholder="Dónde (opcional)"
          className="min-w-0 flex-1 rounded-(--radius-control) border bg-(--color-bg) px-3 py-2 text-sm text-(--color-text)"
          style={{ borderColor: "var(--color-border)" }}
        />
        {hayBote && (
          <button
            onClick={() => setDelBote((v) => !v)}
            aria-pressed={delBote}
            className={`flex shrink-0 items-center gap-1.5 rounded-(--radius-control) border px-3 py-2 text-sm ${delBote ? "border-(--color-navigation) bg-(--color-navigation) font-medium text-white" : "bg-(--color-bg) text-(--color-text)"}`}
            style={!delBote ? { borderColor: "var(--color-border)" } : undefined}
          >
            <PiggyBank size={14} aria-hidden="true" /> {dueno ?? "Bote"}
          </button>
        )}
        {trip.travelers.length > 1 && !(hayBote && delBote) && (
          <select
            value={pagador}
            onChange={(e) => setPagador(e.target.value)}
            aria-label="Quién ha pagado"
            className="shrink-0 rounded-(--radius-control) border bg-(--color-bg) px-2.5 py-2 text-sm text-(--color-text)"
            style={{ borderColor: "var(--color-border)" }}
          >
            {trip.travelers.map((t) => (
              <option key={t.id} value={t.id}>
                Paga {t.name}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
