import { AlertTriangle, Car, Check, ChevronRight, Navigation } from "lucide-react";
import { Link } from "react-router-dom";
import { CategoryThumb } from "../../components/CategoryThumb";
import { useCocheStore } from "../../stores/useCocheStore";
import { useTripStore } from "../../stores/useTripStore";
import { estadoDeHoy } from "./estadoDeHoy";
import { toISODate } from "../../utils/dates";

/**
 * La tarjeta del día de hoy, sólo mientras dura el viaje.
 *
 * Es la función que hace útil a Google Wallet: la tarjeta que necesitas se
 * pone delante ella sola en el momento justo, sin que la busques. Aquí, en la
 * carretera, eso es "qué toca ahora" y "qué se me ha olvidado" — que esta
 * noche no hay hotel apuntado, que dejaste el coche marcado. Cosas que están
 * en la app pero que hay que ir a buscar, y en un viaje nadie las busca.
 *
 * Fuera de las fechas del viaje no se dibuja nada. Una tarjeta de "hoy" en un
 * viaje que fue en agosto o que es para el año que viene no informa: estorba
 * y empuja hacia abajo lo que sí se venía a mirar.
 */
export function TarjetaHoy({ onIrAlDia }: { onIrAlDia: (dayId: string) => void }) {
  const days = useTripStore((s) => s.trip.days);
  const stopsById = useTripStore((s) => s.stopsById);
  const hayCoche = useCocheStore((s) => s.coche !== null);

  const hoy = toISODate(new Date());
  const indice = days.findIndex((d) => d.date === hoy);
  if (indice === -1) return null;

  const dia = days[indice];
  const stops = dia.stopIds.map((id) => stopsById[id]).filter(Boolean);
  const { numeroDeDia, totalDias, siguiente, pendientes, avisos } = estadoDeHoy({
    stops,
    numeroDeDia: indice + 1,
    totalDias: days.length,
    hayCoche,
  });

  return (
    <section
      className="mb-3 overflow-hidden rounded-(--radius-card) border shadow-(--shadow-card)"
      style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
      aria-label="Hoy"
    >
      {/* La banda de color, como el encabezado de un pase. */}
      <div className="flex items-baseline justify-between bg-(--color-navigation) px-4 py-2.5 text-white">
        <p className="text-sm font-semibold">Hoy</p>
        <p className="text-xs text-white/85">
          Día {numeroDeDia} de {totalDias}
        </p>
      </div>

      <div className="p-3">
        {siguiente ? (
          <button
            onClick={() => onIrAlDia(dia.id)}
            className="flex w-full items-center gap-3 text-left"
            aria-label={`Siguiente parada: ${siguiente.name}`}
          >
            <CategoryThumb category={siguiente.category} heroImage={siguiente.heroImage} className="h-12 w-12 rounded-xl" />
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-medium uppercase tracking-wide text-(--color-text-muted)">Siguiente parada</span>
              <span className="block truncate text-sm font-semibold text-(--color-text)">{siguiente.name}</span>
              {/* El `capitalize` sólo en la categoría: puesto en toda la línea
                  salía "20 Min · Quedan 7", con mayúsculas en medio de la
                  frase. */}
              <span className="block truncate text-xs text-(--color-text-muted)">
                <span className="capitalize">{siguiente.category}</span>
                {siguiente.recommendedDurationMinutes > 0 && <> · {siguiente.recommendedDurationMinutes} min</>}
                {pendientes > 1 && <> · quedan {pendientes}</>}
              </span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-(--color-text-muted)" aria-hidden="true" />
          </button>
        ) : (
          <p className="flex items-center gap-2 text-sm text-(--color-text)">
            <Check size={16} className="text-(--color-completed)" aria-hidden="true" />
            {stops.length === 0 ? "Hoy no hay nada apuntado" : "Hoy ya está todo visitado"}
          </p>
        )}

        {siguiente && (
          <a
            href={siguiente.googleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2.5 flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-(--color-navigation) text-sm font-medium !text-white"
          >
            <Navigation size={15} aria-hidden="true" /> Llévame
          </a>
        )}

        {avisos.length > 0 && (
          <ul className="mt-2.5 flex flex-col gap-1.5">
            {avisos.map((aviso) => (
              <li key={aviso.id} className="flex items-center gap-2 text-xs">
                {aviso.id === "coche" ? (
                  <Car size={14} className="shrink-0 text-(--color-text-muted)" aria-hidden="true" />
                ) : aviso.tono === "atencion" ? (
                  <AlertTriangle size={14} className="shrink-0 text-(--color-skipped)" aria-hidden="true" />
                ) : (
                  <Check size={14} className="shrink-0 text-(--color-completed)" aria-hidden="true" />
                )}
                {/* `min-w-0 flex-1` en el texto: sin eso el texto no encogía y
                    el enlace "Ver" se caía a la línea de arriba, alineado a la
                    derecha del aviso anterior. */}
                <span className={`min-w-0 flex-1 ${aviso.tono === "atencion" ? "text-(--color-text)" : "text-(--color-text-muted)"}`}>
                  {aviso.texto}
                </span>
                {/* `control-en-linea`: la regla global de accesibilidad le da
                    44 px de alto mínimo a todo enlace, y aquí eso estiraba la
                    fila del aviso a 44 px y dejaba el "Ver" flotando sobre el
                    texto. La clase quita el mínimo y devuelve la zona
                    táctil con un pseudo-elemento. */}
                {aviso.id === "coche" && (
                  <Link to="/mapa" className="control-en-linea shrink-0 text-(--color-link)">
                    Ver
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
