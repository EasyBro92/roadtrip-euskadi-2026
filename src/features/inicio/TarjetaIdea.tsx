import { CalendarDays, MapPin, Mountain } from "lucide-react";
import { useState } from "react";
import { useEnPantalla } from "../../hooks/useEnPantalla";
import { useFotoAutomatica } from "../../hooks/useFotoAutomatica";
import type { RouteTemplate, StopCategory } from "../../types";

const PARA_PORTADA: StopCategory[] = ["pueblo", "paisaje", "playa", "castillo", "naturaleza", "mirador"];

/**
 * Una ruta de ejemplo en el carrusel de ideas del inicio, como las ofertas
 * que Booking pone en su portada: foto grande, nombre y lo justo debajo.
 * La foto se busca sólo cuando la tarjeta asoma por la pantalla.
 */
export function TarjetaIdea({ ruta, alAbrir }: { ruta: RouteTemplate; alAbrir: () => void }) {
  const [ref, enPantalla] = useEnPantalla<HTMLButtonElement>();
  const portada = ruta.stops.find((s) => PARA_PORTADA.includes(s.category)) ?? ruta.stops[0];
  const foto = useFotoAutomatica(portada ? { nombre: portada.name, coordinates: portada.coordinates, category: portada.category } : undefined, enPantalla);
  const [rota, setRota] = useState(false);

  return (
    <button
      ref={ref}
      onClick={alAbrir}
      className="tarjeta-elevable w-60 shrink-0 snap-start overflow-hidden rounded-2xl border bg-(--color-surface) text-left shadow-(--shadow-card)"
      style={{ borderColor: "var(--color-border)" }}
    >
      <div className="relative h-32 overflow-hidden" style={{ background: "linear-gradient(135deg, var(--color-navigation), var(--color-brand))" }}>
        <Mountain size={72} strokeWidth={1.2} className="absolute -right-3 -top-3 text-white/20" aria-hidden="true" />
        {foto && !rota && <img src={foto} alt="" loading="lazy" decoding="async" onError={() => setRota(true)} className="foto-zoom absolute inset-0 h-full w-full object-cover" />}
        <span className="absolute left-2.5 top-2.5 rounded-md bg-(--color-accent) px-2 py-0.5 text-xs font-bold text-[#1a1a1a]">{ruta.region}</span>
      </div>
      <div className="p-3">
        <p className="line-clamp-2 text-sm font-bold leading-snug text-(--color-text)">{ruta.name}</p>
        <p className="mt-1.5 flex items-center gap-3 text-xs text-(--color-text-muted)">
          <span className="flex items-center gap-1">
            <CalendarDays size={13} aria-hidden="true" /> {ruta.dayCount} {ruta.dayCount === 1 ? "día" : "días"}
          </span>
          <span className="flex items-center gap-1">
            <MapPin size={13} aria-hidden="true" /> {ruta.stops.length} paradas
          </span>
        </p>
      </div>
    </button>
  );
}
