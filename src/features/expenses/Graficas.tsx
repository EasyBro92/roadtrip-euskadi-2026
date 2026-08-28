import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ExpenseCategory, TripDay } from "../../types";
import { formatEUR } from "../../utils/format";
import { CATEGORIAS_GASTO, colorCategoria, etiquetaCategoria } from "./categorias";

/**
 * Las gráficas, al final y plegadas.
 *
 * Ocupaban 500 píxeles en medio de la pantalla, entre el resumen y la lista
 * de gastos. Se miran una vez y se apuntan gastos veinte, así que ahora hay
 * que pedirlas — y quien las quiera las deja abiertas mientras esté ahí.
 */
export function Graficas({
  porCategoria,
  porDia,
  dias,
}: {
  porCategoria: Record<ExpenseCategory, number>;
  porDia: Record<string, number>;
  dias: TripDay[];
}) {
  const [abierto, setAbierto] = useState(false);

  const tarta = CATEGORIAS_GASTO.map((c) => ({ name: c.id as ExpenseCategory, etiqueta: c.etiqueta, value: porCategoria[c.id] ?? 0 })).filter((d) => d.value > 0);
  const barras = dias.map((d, i) => ({ name: `D${i + 1}`, gasto: porDia[d.id] ?? 0 }));

  if (tarta.length === 0) return null;

  return (
    <div className="mt-4">
      <button
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex w-full items-center justify-between rounded-(--radius-card) border bg-(--color-surface) px-4 py-3 text-sm font-medium text-(--color-text)"
        style={{ borderColor: "var(--color-border)" }}
      >
        Gráficas
        <ChevronDown size={16} className={abierto ? "rotate-180 transition-transform" : "transition-transform"} aria-hidden="true" />
      </button>

      {abierto && (
        <>
          <div className="mt-2 flex h-64 flex-col rounded-(--radius-card) border bg-(--color-surface) p-3" style={{ borderColor: "var(--color-border)" }}>
            <p className="mb-2 shrink-0 text-xs font-semibold uppercase text-(--color-text-muted)">En qué se va</p>
            {/* min-h-0 y flex-1: sin esto flexbox aplastaba la gráfica a 50px,
                porque una gráfica no aporta altura propia. */}
            <div className="min-h-0 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={tarta} dataKey="value" nameKey="etiqueta" innerRadius={45} outerRadius={80}>
                    {tarta.map((d) => (
                      <Cell key={d.name} fill={colorCategoria(d.name)} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [formatEUR(Number(v)), String(n)]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
              {tarta.map((d) => (
                <span key={d.name} className="flex items-center gap-1 text-[11px] text-(--color-text-muted)">
                  <span className="h-2 w-2 rounded-full" style={{ background: colorCategoria(d.name) }} aria-hidden="true" />
                  {etiquetaCategoria(d.name)}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-2 flex h-56 flex-col rounded-(--radius-card) border bg-(--color-surface) p-3" style={{ borderColor: "var(--color-border)" }}>
            <p className="mb-2 shrink-0 text-xs font-semibold uppercase text-(--color-text-muted)">Día a día</p>
            <div className="min-h-0 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barras} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip formatter={(v) => formatEUR(Number(v))} />
                  <Bar dataKey="gasto" fill="var(--color-navigation)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
