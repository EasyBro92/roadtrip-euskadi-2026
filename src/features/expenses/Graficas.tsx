import { ChevronDown, Loader2 } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import type { ExpenseCategory, TripDay } from "../../types";
import { CATEGORIAS_GASTO } from "./categorias";

export interface PorcionCategoria {
  name: ExpenseCategory;
  etiqueta: string;
  value: number;
}

export interface BarraDia {
  name: string;
  gasto: number;
}

/*
 * Las gráficas de verdad se piden aparte, y no al abrir Gastos.
 *
 * `recharts` pesa más de 100 KB comprimidos —más que el resto de la
 * pantalla de Gastos junta— y antes se descargaba entera cada vez que se
 * abría la pestaña, aunque nadie tocase el desplegable: "se miran una vez y
 * se apuntan gastos veinte", así que la mayoría de esas veces ese peso no
 * servía para nada. Ahora sólo se pide al desplegar, con `import()`.
 */
const GraficasContenido = lazy(() => import("./GraficasContenido"));

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
        <Suspense
          fallback={
            <div className="mt-2 flex h-64 items-center justify-center rounded-(--radius-card) border bg-(--color-surface)" style={{ borderColor: "var(--color-border)" }}>
              <Loader2 size={20} className="animate-spin text-(--color-text-muted)" aria-hidden="true" />
            </div>
          }
        >
          <GraficasContenido tarta={tarta} barras={barras} />
        </Suspense>
      )}
    </div>
  );
}
