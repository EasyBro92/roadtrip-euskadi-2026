import { Download, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PanelPresupuesto } from "../features/expenses/PanelPresupuesto";
import { PanelReparto } from "../features/expenses/PanelReparto";
import { SwipeToDelete } from "../components/SwipeToDelete";
import { ExportService } from "../services/export/ExportService";
import { ExpenseService } from "../services/expenses/ExpenseService";
import { useTripStore } from "../stores/useTripStore";
import { useUIStore } from "../stores/useUIStore";
import type { ExpenseCategory } from "../types";
import { formatEUR } from "../utils/format";

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  combustible: "#0F6FFF",
  hotel: "#EC4899",
  restaurante: "#F97316",
  aparcamiento: "#9CA3AF",
  peaje: "#7C3AED",
  entrada: "#14B8A6",
  compra: "#EAB308",
  otros: "#6B7280",
};

const CATEGORIES: ExpenseCategory[] = ["combustible", "hotel", "restaurante", "aparcamiento", "peaje", "entrada", "compra", "otros"];

export function ExpensesPage() {
  const expenses = useTripStore((s) => s.expenses);
  const trip = useTripStore((s) => s.trip);
  const stops = useTripStore((s) => s.stopsById);
  const refuels = useTripStore((s) => s.refuels);
  const addExpense = useTripStore((s) => s.addExpense);
  const deleteExpense = useTripStore((s) => s.deleteExpense);
  const openModal = useUIStore((s) => s.openModal);
  const pushToast = useUIStore((s) => s.pushToast);

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("otros");
  const [place, setPlace] = useState("");

  const totalKm = trip.vehicle.odometerEndKm != null ? trip.vehicle.odometerEndKm - trip.vehicle.odometerStartKm : refuels.reduce((max, r) => Math.max(max, r.odometerKm - trip.vehicle.odometerStartKm), 0);

  const stats = useMemo(() => ExpenseService.computeStats(expenses, totalKm), [expenses, totalKm]);
  const budgetUsedPct = trip.budgetEUR > 0 ? (stats.totalEUR / trip.budgetEUR) * 100 : 0;

  const pieData = CATEGORIES.map((c) => ({ name: c, value: stats.byCategory[c] })).filter((d) => d.value > 0);
  const dailyData = trip.days.map((day) => ({ name: `D${day.index + 1}`, gasto: stats.byDay[day.id] ?? 0 }));

  /**
   * Pide confirmación aunque haya hecho falta deslizar y pulsar: un gasto
   * borrado no se puede recuperar y descuadra el presupuesto del viaje.
   */
  function borrarGasto(id: string, descripcion: string, importe: number) {
    openModal({
      type: "confirm",
      title: "Borrar gasto",
      message: `Se borrará ${formatEUR(importe)} de ${descripcion}.`,
      confirmLabel: "Borrar",
      onConfirm: () => {
        deleteExpense(id);
        pushToast("Gasto borrado.", "success");
      },
    });
  }

  const [pagador, setPagador] = useState(trip.travelers[0]?.id ?? "");

  function handleAdd() {
    const value = Number.parseFloat(amount);
    if (!value || value <= 0) return;
    const now = new Date();
    addExpense({
      date: now.toISOString().slice(0, 10),
      time: now.toTimeString().slice(0, 5),
      amountEUR: value,
      category,
      place: place || category,
      dayId: trip.currentDayId,
      stopId: trip.currentStopId,
      paidByTravelerId: pagador || trip.travelers[0]?.id || null,
      splitBetweenTravelerIds: trip.travelers.map((t) => t.id),
      paymentMethod: "tarjeta",
      notes: "",
      receiptPhotoId: null,
      kind: "actual",
    });
    setAmount("");
    setPlace("");
  }

  return (
    <div className="safe-x flex h-full flex-col overflow-y-auto bg-(--color-bg) px-4 pt-4 pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Gastos</h1>
        <button
          onClick={() => ExportService.downloadCSV(ExpenseService.toCSV(expenses), `gastos-${trip.id}.csv`)}
          className="flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium"
          style={{ borderColor: "var(--color-border)" }}
        >
          <Download size={13} aria-hidden="true" /> CSV
        </button>
      </div>

      {/* Tarjeta principal con barra de presupuesto: de un vistazo se ve
          cuánto queda, que es lo que de verdad importa en un viaje. */}
      <div className="mt-4 rounded-(--radius-card) border bg-(--color-surface) p-4 shadow-(--shadow-card)" style={{ borderColor: "var(--color-border)" }}>
        <p className="text-xs text-(--color-text-muted)">Gastado</p>
        <p className="text-3xl font-medium tracking-tight">{formatEUR(stats.totalEUR)}</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-(--color-surface-muted)">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(100, budgetUsedPct)}%`,
              background: budgetUsedPct > 100 ? "var(--color-cancelled)" : budgetUsedPct > 80 ? "var(--color-skipped)" : "var(--color-progress)",
            }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-(--color-text-muted)">
          <span>de {formatEUR(trip.budgetEUR)} presupuestados</span>
          <span className={budgetUsedPct > 100 ? "font-medium text-(--color-cancelled)" : ""}>
            {budgetUsedPct > 100 ? `${formatEUR(stats.totalEUR - trip.budgetEUR)} de más` : `Quedan ${formatEUR(trip.budgetEUR - stats.totalEUR)}`}
          </span>
        </div>
      </div>

      <PanelPresupuesto gastadoPorCategoria={stats.byCategory} />
      <PanelReparto saldos={stats.balanceByTraveler} />

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <div className="rounded-(--radius-card) border bg-(--color-surface) p-3 shadow-(--shadow-card)" style={{ borderColor: "var(--color-border)" }}>
          <p className="text-xs text-(--color-text-muted)">Coste por km</p>
          <p className="text-lg font-medium">{stats.costPerKm != null ? `${stats.costPerKm.toFixed(2)} €` : "—"}</p>
          <p className="text-xs text-(--color-text-muted)">{totalKm} km recorridos</p>
        </div>
        <div className="rounded-(--radius-card) border bg-(--color-surface) p-3 shadow-(--shadow-card)" style={{ borderColor: "var(--color-border)" }}>
          <p className="text-xs text-(--color-text-muted)">Por viajero</p>
          <p className="text-lg font-medium">{trip.travelers.length > 0 ? formatEUR(stats.totalEUR / trip.travelers.length) : "—"}</p>
          <p className="text-xs text-(--color-text-muted)">{trip.travelers.length} viajeros</p>
        </div>
      </div>

      {pieData.length > 0 && (
        // shrink-0: la página es flex-col, y sin esto flexbox aplastaba la
        // tarjeta hasta 50px en cuanto había gastos en la lista — la altura
        // fija era solo una sugerencia porque la gráfica no aporta altura
        // propia. El contenedor interior toma el espacio que sobra tras el
        // título, en vez de un porcentaje de la tarjeta que no lo descontaba.
        <div className="mt-4 flex h-64 shrink-0 flex-col rounded-(--radius-card) border bg-(--color-surface) p-3 shadow-(--shadow-card)" style={{ borderColor: "var(--color-border)" }}>
          <p className="mb-2 shrink-0 text-xs font-semibold uppercase text-(--color-text-muted)">Distribución por categoría</p>
          <div className="min-h-0 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80}>
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name as ExpenseCategory]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatEUR(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="mt-4 flex h-56 shrink-0 flex-col rounded-(--radius-card) border bg-(--color-surface) p-3 shadow-(--shadow-card)" style={{ borderColor: "var(--color-border)" }}>
        <p className="mb-2 shrink-0 text-xs font-semibold uppercase text-(--color-text-muted)">Evolución diaria</p>
        <div className="min-h-0 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyData} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip formatter={(value) => formatEUR(Number(value))} />
              <Bar dataKey="gasto" fill="#0F6FFF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-4 rounded-(--radius-card) border bg-(--color-surface) p-3 shadow-(--shadow-card)" style={{ borderColor: "var(--color-border)" }}>
        <p className="mb-2 text-xs font-semibold uppercase text-(--color-text-muted)">Registrar gasto</p>
        <div className="flex flex-wrap gap-2">
          <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" inputMode="decimal" placeholder="€" className="w-20 rounded-lg border px-2.5 py-2 text-sm" style={{ borderColor: "var(--color-border)" }} />
          <select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)} className="rounded-lg border px-2.5 py-2 text-sm" style={{ borderColor: "var(--color-border)" }}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Lugar" className="min-w-[100px] flex-1 rounded-lg border px-2.5 py-2 text-sm" style={{ borderColor: "var(--color-border)" }} />
          {/* Sin esto todo se le apuntaba siempre al primer viajero, y el
              saldo de quién debe a quién no significaba nada. */}
          {trip.travelers.length > 1 && (
            <select
              value={pagador}
              onChange={(e) => setPagador(e.target.value)}
              aria-label="Quién ha pagado"
              className="rounded-lg border px-2.5 py-2 text-sm"
              style={{ borderColor: "var(--color-border)" }}
            >
              {trip.travelers.map((t) => (
                <option key={t.id} value={t.id}>
                  Paga {t.name}
                </option>
              ))}
            </select>
          )}
          <button onClick={handleAdd} className="flex items-center gap-1 rounded-lg bg-(--color-navigation) px-3 py-2 text-sm font-semibold text-white">
            <Plus size={14} aria-hidden="true" /> Añadir
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {[...expenses].reverse().map((e) => (
          <SwipeToDelete
            key={e.id}
            deleteLabel={`Borrar el gasto de ${formatEUR(e.amountEUR)} en ${e.place || e.category}`}
            onDelete={() => borrarGasto(e.id, e.place || e.category, e.amountEUR)}
          >
            <div className="flex items-center justify-between gap-2 rounded-xl border bg-(--color-surface) p-2.5 text-sm" style={{ borderColor: "var(--color-border)" }}>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{e.place}</p>
                <p className="truncate text-xs text-(--color-text-muted)">
                  {e.category} · {e.date} {stops[e.stopId ?? ""] ? `· ${stops[e.stopId ?? ""].name}` : ""}
                </p>
              </div>
              <span className="shrink-0 font-semibold" style={{ color: CATEGORY_COLORS[e.category] }}>
                {formatEUR(e.amountEUR)}
              </span>
            </div>
          </SwipeToDelete>
        ))}
      </div>
    </div>
  );
}
