import { ArrowRight, UserRound } from "lucide-react";
import { liquidar } from "../../services/expenses/liquidacion";
import { useTripStore } from "../../stores/useTripStore";
import { useUIStore } from "../../stores/useUIStore";
import type { ID } from "../../types";
import { formatEUR } from "../../utils/format";

/** Por debajo de un céntimo no es una deuda, es un redondeo. */
const CENTIMO = 0.005;

/**
 * Lo tuyo, arriba del todo.
 *
 * Es lo que hace bien Splitwise y aquí faltaba: la pantalla abría con
 * "gastado 250 €", que es un dato del viaje, no tuyo. Lo que uno abre a mirar
 * es si debe o le deben. El total sigue estando, debajo y más pequeño.
 *
 * Necesita saber cuál de los viajeros eres. Si no está dicho, lo pregunta una
 * vez en vez de suponerlo: suponer mal invierte el signo de todo.
 */
export function TuSaldo({ saldos }: { saldos: Record<ID, number> }) {
  const trip = useTripStore((s) => s.trip);
  const setMiViajero = useTripStore((s) => s.setMiViajero);
  const openModal = useUIStore((s) => s.openModal);

  const travelers = trip.travelers;
  if (travelers.length < 2) return null;

  const yo = trip.miViajeroId;

  if (!yo) {
    return (
      <button
        onClick={() =>
          openModal({
            type: "choice",
            title: "¿Cuál eres tú?",
            message: "Para poder contarte las cuentas desde tu lado.",
            options: travelers.map((t) => ({ id: t.id, label: t.name })),
            onPick: (id) => setMiViajero(id),
          })
        }
        className="mt-3 flex w-full items-center gap-2 rounded-(--radius-card) border border-dashed px-4 py-3 text-left text-sm text-(--color-text-muted)"
        style={{ borderColor: "var(--color-border)" }}
      >
        <UserRound size={16} aria-hidden="true" />
        Dime cuál eres tú y te digo si debes o te deben
      </button>
    );
  }

  const miSaldo = saldos[yo] ?? 0;
  const enPaz = Math.abs(miSaldo) < CENTIMO;
  const meDeben = miSaldo > 0;

  // De todos los pagos que saldan las cuentas, los que te tocan a ti.
  const pagos = liquidar(saldos);
  const mios = pagos.filter((p) => p.de === yo || p.a === yo);
  const nombre = (id: ID) => travelers.find((t) => t.id === id)?.name ?? "alguien";

  const color = enPaz ? "var(--color-text)" : meDeben ? "var(--color-progress)" : "var(--color-cancelled)";

  return (
    <div className="mt-3 rounded-(--radius-card) border bg-(--color-surface) p-4 shadow-(--shadow-card)" style={{ borderColor: "var(--color-border)" }}>
      <p className="text-xs text-(--color-text-muted)">{enPaz ? "Tus cuentas" : meDeben ? "Te deben" : "Debes"}</p>
      <p className="text-3xl font-medium tracking-tight" style={{ color }}>
        {enPaz ? "Estás en paz" : formatEUR(Math.abs(miSaldo))}
      </p>

      {mios.length > 0 && (
        <ul className="mt-2.5 space-y-1 border-t pt-2.5" style={{ borderColor: "var(--color-border)" }}>
          {mios.map((p, i) => (
            <li key={`${p.de}-${p.a}-${i}`} className="flex items-center gap-1.5 text-sm">
              <span className="text-(--color-text-muted)">{p.de === yo ? "Le pagas a" : "Te paga"}</span>
              <span className="min-w-0 flex-1 truncate font-medium text-(--color-text)">{nombre(p.de === yo ? p.a : p.de)}</span>
              <ArrowRight size={13} className="shrink-0 text-(--color-text-muted)" aria-hidden="true" />
              <span className="shrink-0 font-semibold" style={{ color: p.de === yo ? "var(--color-cancelled)" : "var(--color-progress)" }}>
                {formatEUR(p.importeEUR)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={() =>
          openModal({
            type: "choice",
            title: "¿Cuál eres tú?",
            options: travelers.map((t) => ({ id: t.id, label: t.name })),
            onPick: (id) => setMiViajero(id),
          })
        }
        className="mt-2 text-xs text-(--color-text-muted)"
      >
        Eres {nombre(yo)} · cambiar
      </button>
    </div>
  );
}
