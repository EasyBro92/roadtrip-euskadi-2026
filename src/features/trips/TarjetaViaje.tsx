import { CalendarDays, MapPin, Wallet } from "lucide-react";
import { useTinteDePortada } from "../../hooks/useTinteDePortada";
import type { Tinte } from "../../services/color/tinteDominante";
import type { TripSummary } from "../../stores/useTripStore";
import { formatEUR } from "../../utils/format";

/** Sin foto todavía: el degradado de la app, mejor que un hueco gris. */
const SIN_FOTO = "linear-gradient(160deg, #1A73E8 0%, #0B4FCC 45%, #16A34A 100%)";

/**
 * El velo que va sobre la foto, teñido del color de esa misma foto.
 *
 * La foto elige el tono; el brillo lo pone esta función y siempre es oscuro.
 * Por eso el nombre del viaje se lee igual sobre una playa a mediodía que
 * sobre un bosque de noche: lo que cambia entre una tarjeta y otra es el
 * color, nunca el contraste.
 */
export function velo(tinte: Tinte | null): string {
  if (!tinte) {
    return "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.05) 100%)";
  }
  const { h, s } = tinte;
  return [
    "linear-gradient(to top,",
    `hsl(${h} ${s}% 7% / 0.90) 0%,`,
    `hsl(${h} ${s}% 12% / 0.62) 45%,`,
    `hsl(${h} ${s}% 26% / 0.18) 100%)`,
  ].join(" ");
}

function formatRango(inicio: string, fin: string): string {
  const opciones: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const desde = new Date(`${inicio}T00:00:00`).toLocaleDateString("es-ES", opciones);
  const hasta = new Date(`${fin}T00:00:00`).toLocaleDateString("es-ES", { ...opciones, year: "numeric" });
  return `${desde} — ${hasta}`;
}

/**
 * Un viaje, como una tarjeta de Google Wallet.
 *
 * Cada pase de Wallet lleva el color de su marca, y es lo que hace que
 * encuentres el tuyo en la pila sin leer nada. Aquí no hay marca, pero hay
 * una foto de portada: de ella se saca el tono, y así cada viaje tiene un
 * color propio que además es el del sitio al que fuiste.
 */
export function TarjetaViaje({
  viaje,
  alAbrir,
  alto = "h-44",
}: {
  viaje: TripSummary;
  alAbrir: () => void;
  alto?: string;
}) {
  const tinte = useTinteDePortada(viaje.heroImage);

  return (
    <button
      onClick={alAbrir}
      className={`relative flex ${alto} w-full flex-col justify-end overflow-hidden rounded-(--radius-card) text-left shadow-(--shadow-card) transition-transform active:scale-[0.985]`}
      style={viaje.isActive ? { outline: "2px solid var(--color-navigation)", outlineOffset: "-2px" } : undefined}
    >
      {/*
       * El degradado va SIEMPRE debajo de la foto, no sólo cuando no hay foto.
       *
       * Una tarjeta no puede ser transparente ni un segundo. Mientras la foto
       * de portada se descargaba, esta capa quedaba vacía y por ella se veía
       * el botón rojo de borrar que vive detrás: la tarjeta parecía deslizada
       * y a medio abrir sin que nadie la hubiera tocado.
       */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: viaje.heroImage ? `url("${viaje.heroImage}"), ${SIN_FOTO}` : SIN_FOTO }}
        aria-hidden="true"
      />
      {/* El tinte entra con una transición: la foto se ve al momento y el
          color llega cuando se ha podido leer, sin dar un tirón. */}
      <div className="absolute inset-0 transition-[background] duration-500" style={{ background: velo(tinte) }} aria-hidden="true" />

      {viaje.isActive && (
        <span className="absolute right-3 top-3 rounded-full bg-white/25 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
          En curso
        </span>
      )}

      <div className="relative p-4 text-white">
        <h2 className="truncate text-lg font-semibold">{viaje.name}</h2>
        <p className="mt-0.5 text-sm opacity-90">{formatRango(viaje.startDate, viaje.endDate)}</p>

        <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs opacity-90">
          <span className="flex items-center gap-1.5">
            <CalendarDays size={13} aria-hidden="true" /> {viaje.dayCount} {viaje.dayCount === 1 ? "día" : "días"}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin size={13} aria-hidden="true" /> {viaje.stopCount} {viaje.stopCount === 1 ? "parada" : "paradas"}
          </span>
          {viaje.budgetEUR > 0 && (
            <span className="flex items-center gap-1.5">
              <Wallet size={13} aria-hidden="true" /> {formatEUR(viaje.budgetEUR)}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
