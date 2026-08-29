import { Download } from "lucide-react";
import { nombreArchivo } from "../utils/nombreArchivo";
import { useMemo } from "react";
import { FormularioGasto } from "../features/expenses/FormularioGasto";
import { Graficas } from "../features/expenses/Graficas";
import { ListaGastos } from "../features/expenses/ListaGastos";
import { PanelBote } from "../features/expenses/PanelBote";
import { PanelPresupuesto } from "../features/expenses/PanelPresupuesto";
import { PanelPersonas } from "../features/expenses/PanelPersonas";
import { ExportService } from "../services/export/ExportService";
import { detallePorViajero } from "../services/expenses/bote";
import { ExpenseService } from "../services/expenses/ExpenseService";
import { useTripStore } from "../stores/useTripStore";
import { formatEUR } from "../utils/format";

/**
 * Gastos del viaje.
 *
 * El orden es el de uso, no el de importancia teórica: primero cuánto llevas,
 * luego apuntar uno, luego lo apuntado, y al final el análisis. Antes el
 * formulario estaba el último, detrás de dos gráficas, y apuntar una cena
 * costaba un scroll entero.
 */
export function ExpensesPage() {
  const expenses = useTripStore((s) => s.expenses);
  const trip = useTripStore((s) => s.trip);
  const refuels = useTripStore((s) => s.refuels);
  const aportaciones = useTripStore((s) => s.aportaciones);

  const totalKm =
    trip.vehicle.odometerEndKm != null
      ? trip.vehicle.odometerEndKm - trip.vehicle.odometerStartKm
      : refuels.reduce((max, r) => Math.max(max, r.odometerKm - trip.vehicle.odometerStartKm), 0);

  const stats = useMemo(() => ExpenseService.computeStats(expenses, totalKm), [expenses, totalKm]);
  // Los saldos se calculan aparte de las estadísticas porque el bote cambia
  // quién ha puesto qué, y eso `computeStats` no lo sabe.
  const detalle = useMemo(
    () => detallePorViajero(expenses, aportaciones, trip.travelers.map((t) => t.id)),
    [expenses, aportaciones, trip.travelers],
  );

  const usadoPct = trip.budgetEUR > 0 ? (stats.totalEUR / trip.budgetEUR) * 100 : 0;
  const pasado = usadoPct > 100;

  return (
    <div className="safe-x flex h-full flex-col overflow-y-auto bg-(--color-bg) px-4 pb-24 pt-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Gastos</h1>
        <button
          onClick={() => ExportService.downloadCSV(ExpenseService.toCSV(expenses, trip.travelers), `${nombreArchivo(trip.name, "viaje")}-gastos.csv`)}
          className="flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium"
          style={{ borderColor: "var(--color-border)" }}
        >
          <Download size={13} aria-hidden="true" /> CSV
        </button>
      </div>

      {/*
       * Arriba, el dinero: cuánto llevas y cómo apuntar más, en la misma
       * tarjeta.
       *
       * Eran dos cajas seguidas diciendo lo mismo, y encima de ellas los saldos
       * de cada uno: apuntar una cena empezaba a 430 px del principio, tres
       * tarjetas más abajo. Es lo que se hace diez veces al día y ahora es lo
       * primero. Quién debe a quién se mira una vez, y va después de la lista.
       *
       * `shrink-0` no es adorno: esta pantalla es una columna flex, y a un hijo
       * con `overflow: hidden` el navegador le quita la altura mínima
       * automática. Sin esto la tarjeta se aplastaba a 2 px — sólo los bordes —
       * y el total y el formulario desaparecían recortados dentro.
       */}
      <div
        className="mt-3 shrink-0 overflow-hidden rounded-(--radius-card) border bg-(--color-surface) shadow-(--shadow-card)"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div className="p-4">
        <p className="text-xs text-(--color-text-muted)">Gastado en el viaje</p>
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-2xl font-medium tracking-tight text-(--color-text)">{formatEUR(stats.totalEUR)}</p>
          {trip.budgetEUR > 0 && (
            <p className={`shrink-0 text-sm font-medium ${pasado ? "text-(--color-cancelled)" : "text-(--color-text-muted)"}`}>
              {pasado ? `${formatEUR(stats.totalEUR - trip.budgetEUR)} de más` : `${formatEUR(trip.budgetEUR - stats.totalEUR)} libres`}
            </p>
          )}
        </div>

        {trip.budgetEUR > 0 && (
          <>
            <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-(--color-surface-muted)">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, usadoPct)}%`,
                  background: pasado ? "var(--color-cancelled)" : usadoPct > 80 ? "var(--color-skipped)" : "var(--color-progress)",
                }}
              />
            </div>
            <p className="mt-1.5 text-xs text-(--color-text-muted)">de {formatEUR(trip.budgetEUR)} presupuestados</p>
          </>
        )}

        <div className="mt-3 flex gap-5 border-t pt-2.5 text-xs" style={{ borderColor: "var(--color-border)" }}>
          <span className="text-(--color-text-muted)">
            Por viajero <span className="font-medium text-(--color-text)">{trip.travelers.length > 0 ? formatEUR(stats.totalEUR / trip.travelers.length) : "—"}</span>
          </span>
          {totalKm > 0 && stats.costPerKm != null && (
            <span className="text-(--color-text-muted)">
              Por km <span className="font-medium text-(--color-text)">{stats.costPerKm.toFixed(2)} €</span>
            </span>
          )}
        </div>
        </div>

        <div className="border-t bg-(--color-bg)/40 p-3" style={{ borderColor: "var(--color-border)" }}>
          <FormularioGasto />
        </div>
      </div>

      <ListaGastos expenses={expenses} />

      {/*
       * Las cuentas, juntas: quién ha puesto qué y el bote del que sale el
       * dinero son el mismo asunto. El bote estaba al final de la pantalla,
       * cinco tarjetas por debajo de los saldos que él mismo explica.
       */}
      <PanelPersonas detalle={detalle} />
      <PanelBote />

      <PanelPresupuesto gastadoPorCategoria={stats.byCategory} />
      <Graficas porCategoria={stats.byCategory} porDia={stats.byDay} dias={trip.days} />
    </div>
  );
}
