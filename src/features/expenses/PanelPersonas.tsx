import { ArrowRight, Share2 } from "lucide-react";
import type { DetalleViajero } from "../../services/expenses/bote";
import { liquidar, textoLiquidacion } from "../../services/expenses/liquidacion";
import { SharingService } from "../../services/sharing/SharingService";
import { useTripStore } from "../../stores/useTripStore";
import { useUIStore } from "../../stores/useUIStore";
import type { ID } from "../../types";
import { formatEUR } from "../../utils/format";

/** Por debajo de un céntimo no es una deuda, es un redondeo. */
const CENTIMO = 0.005;

/**
 * Qué ha puesto y qué ha gastado cada uno.
 *
 * Antes esto abría con "te deben 25 €" y el resto del grupo no aparecía. Es
 * el enfoque de Splitwise, que está pensado para tu cuenta personal, pero en
 * un viaje compartido convierte a uno en protagonista y deja a los demás como
 * cifras de su liquidación.
 *
 * Aquí todos salen igual, con las mismas tres cifras. Cuál eres tú se marca,
 * porque saber de quién es cada saldo importa, pero no cambia el tamaño ni el
 * orden de nada.
 */
export function PanelPersonas({ detalle }: { detalle: Record<ID, DetalleViajero> }) {
  const trip = useTripStore((s) => s.trip);
  const setMiViajero = useTripStore((s) => s.setMiViajero);
  const openModal = useUIStore((s) => s.openModal);
  const pushToast = useUIStore((s) => s.pushToast);

  const travelers = trip.travelers;
  if (travelers.length === 0) return null;

  const yo = trip.miViajeroId;
  const pagos = liquidar(Object.fromEntries(Object.entries(detalle).map(([id, d]) => [id, d.saldo])));
  const nombre = (id: ID) => travelers.find((t) => t.id === id)?.name ?? "alguien";

  const masAlto = Math.max(1, ...travelers.map((t) => detalle[t.id]?.puso ?? 0));

  /**
   * El resumen como texto, para mandarlo por WhatsApp o pegarlo donde sea.
   *
   * Va lo de todos, no sólo quién debe a quién: al mandarlo al grupo, cada uno
   * quiere ver sus propias cifras y no fiarse de una resta que no ve.
   */
  async function compartir() {
    const lineas = travelers.map((t) => {
      const d = detalle[t.id] ?? { puso: 0, debe: 0, saldo: 0 };
      return `${t.name}: puso ${formatEUR(d.puso)}, gastó ${formatEUR(d.debe)}`;
    });

    const texto = [`Cuentas de ${trip.name}`, "", ...lineas, "", textoLiquidacion(pagos, nombre, formatEUR)].join("\n");

    const resultado = await SharingService.shareSummary(trip, texto);
    if (resultado.kind === "clipboard") pushToast("Cuentas copiadas al portapapeles.", "success");
    else if (resultado.kind === "unsupported") pushToast(resultado.reason, "error");
  }

  return (
    <div className="mt-3 rounded-(--radius-card) border bg-(--color-surface) p-4 shadow-(--shadow-card)" style={{ borderColor: "var(--color-border)" }}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-(--color-text)">Quién ha puesto qué</h2>
        <button
          onClick={() =>
            openModal({
              type: "choice",
              title: "¿Cuál eres tú?",
              message: "Sólo para marcarte en la lista.",
              options: travelers.map((t) => ({ id: t.id, label: t.name })),
              onPick: (id) => setMiViajero(id),
            })
          }
          className="shrink-0 text-xs text-(--color-text-muted)"
        >
          {yo ? `eres ${nombre(yo)}` : "¿cuál eres tú?"}
        </button>
      </div>

      <ul className="mt-3 space-y-3">
        {travelers.map((t) => {
          const d = detalle[t.id] ?? { puso: 0, debe: 0, saldo: 0 };
          const enPaz = Math.abs(d.saldo) < CENTIMO;
          const aFavor = d.saldo > 0;

          return (
            <li key={t.id}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate text-sm font-medium text-(--color-text)">
                  {t.name}
                  {t.id === yo && <span className="font-normal text-(--color-text-muted)"> · tú</span>}
                </span>
                <span
                  className="shrink-0 text-sm font-semibold"
                  style={{ color: enPaz ? "var(--color-text-muted)" : aFavor ? "var(--color-progress)" : "var(--color-cancelled)" }}
                >
                  {enPaz ? "en paz" : `${aFavor ? "+" : "−"}${formatEUR(Math.abs(d.saldo))}`}
                </span>
              </div>

              {/* La barra compara de un vistazo cuánto ha adelantado cada uno,
                  que es lo que el saldo neto esconde. */}
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-(--color-surface-muted)">
                <div className="h-full rounded-full bg-(--color-navigation)" style={{ width: `${(d.puso / masAlto) * 100}%` }} />
              </div>

              <p className="mt-1 text-xs text-(--color-text-muted)">
                puso {formatEUR(d.puso)} · gastó {formatEUR(d.debe)}
              </p>
            </li>
          );
        })}
      </ul>

      {pagos.length > 0 && (
        <>
        <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3" style={{ borderColor: "var(--color-border)" }}>
          <p className="text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)">Para quedar en paz</p>
          <button onClick={compartir} className="flex shrink-0 items-center gap-1 text-xs text-(--color-link)">
            <Share2 size={12} aria-hidden="true" /> Compartir
          </button>
        </div>
        <ul className="mt-1.5 space-y-1">
          {pagos.map((p, i) => (
            <li key={`${p.de}-${p.a}-${i}`} className="flex items-center gap-1.5 text-sm">
              <span className="min-w-0 flex-1 truncate text-(--color-text)">{nombre(p.de)}</span>
              <ArrowRight size={13} className="shrink-0 text-(--color-text-muted)" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-(--color-text)">{nombre(p.a)}</span>
              <span className="shrink-0 font-semibold text-(--color-text)">{formatEUR(p.importeEUR)}</span>
            </li>
          ))}
        </ul>
        </>
      )}
    </div>
  );
}
