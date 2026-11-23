import { ArrowLeft, BedDouble, ExternalLink, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CategoryThumb } from "../components/CategoryThumb";
import { nochesPorDia } from "../features/itinerary/alojamiento";
import { useTripStore } from "../stores/useTripStore";
import { useUIStore } from "../stores/useUIStore";
import { formatDateLong } from "../utils/format";
import { openExternalUrl } from "../utils/openExternal";
import { diaSiguiente, urlBooking } from "../utils/reservas";

/**
 * Dónde dormir cada noche, como la lista de reservas de Booking.
 *
 * Una tarjeta por noche con la fecha de entrada y salida, la ciudad y el
 * alojamiento si ya lo tienes. Si no, un botón que abre Booking con la
 * ciudad, las fechas y los viajeros ya puestos. La última noche no sale: ese
 * día se vuelve a casa.
 */
export function DormirPage() {
  const navigate = useNavigate();
  const days = useTripStore((s) => s.trip.days);
  const stopsById = useTripStore((s) => s.stopsById);
  const viajeros = useTripStore((s) => s.trip.travelers.length);
  const setCurrentDay = useTripStore((s) => s.setCurrentDay);
  const setCurrentStop = useTripStore((s) => s.setCurrentStop);
  const setBottomSheetState = useUIStore((s) => s.setBottomSheetState);

  const noches = nochesPorDia(days, stopsById).slice(0, -1);
  const conSitio = noches.filter((n) => n.nombre).length;

  function ciudadDe(dayId: string): string {
    const dia = days.find((d) => d.id === dayId);
    if (!dia) return "";
    if (dia.city) return dia.city;
    // Sin ciudad apuntada, la última parada del día: es donde acabas.
    const ultima = [...dia.stopIds].reverse().map((id) => stopsById[id]).find((s) => s?.enabled);
    return ultima?.name ?? dia.title;
  }

  function verEnMapa(dayId: string, stopId: string) {
    setCurrentDay(dayId);
    setCurrentStop(stopId);
    setBottomSheetState("mid");
    navigate("/mapa");
  }

  return (
    <div className="safe-x h-full overflow-y-auto bg-(--color-bg) px-4 pt-4 pb-8">
      <button onClick={() => navigate(-1)} className="-ml-2 mb-2 flex h-11 items-center gap-1.5 rounded-full pl-2 pr-4 text-sm font-medium text-(--color-text) active:bg-(--color-surface-muted)">
        <ArrowLeft size={20} aria-hidden="true" /> Atrás
      </button>
      <h1 className="text-2xl font-bold">Dónde dormir</h1>
      <p className="mb-4 mt-1 text-sm text-(--color-text-muted)">
        {noches.length === 0
          ? "Un viaje de un día: no hace falta alojamiento."
          : `${noches.length} ${noches.length === 1 ? "noche" : "noches"} · ${conSitio} con alojamiento${conSitio < noches.length ? ` · faltan ${noches.length - conSitio}` : ""}`}
      </p>

      {noches.length > 0 && (
        <div className="mb-5 h-2 overflow-hidden rounded-full bg-(--color-surface-muted)" aria-hidden="true">
          <div className="h-full rounded-full bg-(--color-hotel) transition-[width] duration-700" style={{ width: `${(conSitio / noches.length) * 100}%` }} />
        </div>
      )}

      <ul className="cascada space-y-3">
        {noches.map((noche, i) => {
          const dia = days.find((d) => d.id === noche.dayId)!;
          const ciudad = ciudadDe(noche.dayId);
          const parada = noche.stopId ? stopsById[noche.stopId] : null;
          return (
            <li
              key={noche.dayId}
              className="overflow-hidden rounded-(--radius-card) border bg-(--color-surface) shadow-(--shadow-card)"
              style={{ borderColor: "var(--color-border)" }}
            >
              <div className="flex gap-3 p-3">
                {parada ? (
                  <CategoryThumb category="hotel" heroImage={parada.heroImage} lugar={{ nombre: parada.name, coordinates: parada.coordinates }} className="h-20 w-20 rounded-xl" iconSize={28} />
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border-2 border-dashed text-(--color-text-muted)" style={{ borderColor: "var(--color-border)" }}>
                    <BedDouble size={26} aria-hidden="true" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)">Noche {i + 1}</p>
                  <p className="truncate text-base font-semibold text-(--color-text)">{noche.nombre ?? `Sin alojamiento en ${ciudad}`}</p>
                  <p className="flex items-center gap-1 truncate text-xs text-(--color-text-muted)">
                    <MapPin size={12} aria-hidden="true" /> {ciudad}
                    {noche.totalNoches > 1 && <> · noche {noche.numeroDeNoche} de {noche.totalNoches}</>}
                  </p>
                  <p className="mt-1 text-xs text-(--color-text)">
                    {formatDateLong(dia.date)} → {formatDateLong(diaSiguiente(dia.date))}
                  </p>
                </div>
              </div>
              {noche.sobrantes.length > 0 && (
                <p className="px-3 pb-2 text-xs text-(--color-skipped)">También {noche.sobrantes.join(", ")}: dos alojamientos la misma noche.</p>
              )}
              <div className="flex border-t" style={{ borderColor: "var(--color-border)" }}>
                {parada && (
                  <button onClick={() => verEnMapa(noche.dayId, parada.id)} className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-(--color-link)">
                    <MapPin size={15} aria-hidden="true" /> Ver en el mapa
                  </button>
                )}
                <button
                  onClick={() => openExternalUrl(urlBooking(ciudad, dia.date, diaSiguiente(dia.date), viajeros || 2))}
                  className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-semibold ${parada ? "border-l text-(--color-text-muted)" : "bg-(--color-navigation) text-white"}`}
                  style={parada ? { borderColor: "var(--color-border)" } : undefined}
                >
                  <ExternalLink size={15} aria-hidden="true" /> {parada ? "Otras opciones" : "Buscar en Booking"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
