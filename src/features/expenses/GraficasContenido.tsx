import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatEUR } from "../../utils/format";
import { colorCategoria, etiquetaCategoria } from "./categorias";
import type { BarraDia, PorcionCategoria } from "./Graficas";

/**
 * Las dos gráficas de verdad, en su propio fichero.
 *
 * `recharts` arrastra buena parte de d3 detrás y pesa solo ella más de
 * 100 KB comprimidos — más que el resto de la pantalla de Gastos junta.
 * Separarla aquí es lo que permite que `Graficas.tsx` la pida sólo cuando
 * de verdad se despliegan las gráficas, en vez de cargarla cada vez que se
 * abre la pestaña de Gastos aunque nadie las mire.
 */
export default function GraficasContenido({ tarta, barras }: { tarta: PorcionCategoria[]; barras: BarraDia[] }) {
  return (
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
  );
}
