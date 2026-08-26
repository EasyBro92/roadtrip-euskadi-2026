import { ArrowRight, Share2 } from "lucide-react";
import { liquidar, textoLiquidacion } from "../../services/expenses/liquidacion";
import { SharingService } from "../../services/sharing/SharingService";
import { useTripStore } from "../../stores/useTripStore";
import { useUIStore } from "../../stores/useUIStore";
import type { ID } from "../../types";
import { formatEUR } from "../../utils/format";

/**
 * Quién debe a quién al final del viaje.
 *
 * El saldo por viajero ya se calculaba y no se enseñaba en ninguna parte.
 * Esto lo convierte en lo único que de verdad importa: la lista de pagos que
 * deja las cuentas a cero.
 */
export function PanelReparto({ saldos }: { saldos: Record<ID, number> }) {
  const travelers = useTripStore((s) => s.trip.travelers);
  const trip = useTripStore((s) => s.trip);
  const pushToast = useUIStore((s) => s.pushToast);

  const nombreDe = (id: ID) => travelers.find((t) => t.id === id)?.name ?? "Alguien";
  const pagos = liquidar(saldos);
  const hayMovimiento = Object.values(saldos).some((v) => Math.abs(v) > 0.005);

  // Con un solo viajero no hay nada que repartir.
  if (travelers.length < 2 || !hayMovimiento) return null;

  async function compartir() {
    const texto = `Cuentas de ${trip.name}\n\n${textoLiquidacion(pagos, nombreDe, formatEUR)}`;
    const resultado = await SharingService.shareSummary(trip, texto);
    if (resultado.kind === "clipboard") pushToast("Cuentas copiadas al portapapeles.", "success");
    else if (resultado.kind === "unsupported") pushToast(resultado.reason, "error");
  }

  return (
    <div className="mt-4 rounded-(--radius-card) border bg-(--color-surface) p-4 shadow-(--shadow-card)" style={{ borderColor: "var(--color-border)" }}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-(--color-text)">Quién debe a quién</h2>
        <button onClick={compartir} className="flex items-center gap-1 text-xs text-(--color-navigation)">
          <Share2 size={12} aria-hidden="true" /> Compartir
        </button>
      </div>

      {pagos.length === 0 ? (
        <p className="mt-2 text-sm text-(--color-text-muted)">Las cuentas están saldadas.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {pagos.map((p, i) => (
            <li key={`${p.de}-${p.a}-${i}`} className="flex items-center gap-2 text-sm">
              <span className="min-w-0 flex-1 truncate text-(--color-text)">{nombreDe(p.de)}</span>
              <ArrowRight size={14} className="shrink-0 text-(--color-text-muted)" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-(--color-text)">{nombreDe(p.a)}</span>
              <span className="shrink-0 font-medium text-(--color-text)">{formatEUR(p.importeEUR)}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2 text-[11px] text-(--color-text-muted)">
        Compartir manda el resumen como texto. Que se actualice solo en el móvil de otra persona necesitaría un servidor.
      </p>
    </div>
  );
}
