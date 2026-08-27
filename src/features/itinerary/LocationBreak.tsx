import { Bus, Car, Footprints, Plane, TrainFront } from "lucide-react";
import { useTripStore } from "../../stores/useTripStore";
import { useUIStore } from "../../stores/useUIStore";
import { formatKm } from "../../utils/format";
import { ETIQUETA_MODO, MODOS, formatearMinutos, minutosDeTramo, modoPorDefecto, type ModoTransporte } from "./tramos";

const ICONO: Record<ModoTransporte, typeof Car> = {
  pie: Footprints,
  coche: Car,
  bus: Bus,
  tren: TrainFront,
  avion: Plane,
};

/**
 * Separador entre dos paradas, con cómo se va de una a otra.
 *
 * Antes decía siempre "en coche", y dentro de una ciudad eso es falso: de la
 * catedral a la plaza se va andando. El modo se deduce de la distancia y se
 * puede cambiar tocándolo — un tramo en tren o en avión no se adivina.
 *
 * La distancia es en línea recta, no por carretera: da idea del salto, no una
 * estimación de viaje. Por eso dice "aprox.".
 */
export function LocationBreak({ metros, stopId }: { metros: number; stopId?: string }) {
  const stop = useTripStore((s) => (stopId ? s.stopsById[stopId] : undefined));
  const updateStop = useTripStore((s) => s.updateStop);
  const openModal = useUIStore((s) => s.openModal);

  const modo = stop?.modoLlegada ?? modoPorDefecto(metros);
  const Icono = ICONO[modo];
  const minutos = minutosDeTramo(metros, modo);

  function cambiar() {
    if (!stopId) return;
    openModal({
      type: "choice",
      title: "¿Cómo llegas?",
      message: "Se guarda para esta parada.",
      options: MODOS.map((m) => ({ id: m, label: ETIQUETA_MODO[m] })),
      onPick: (elegido) => updateStop(stopId, { modoLlegada: elegido as ModoTransporte }),
    });
  }

  return (
    <div className="flex items-center gap-2 py-1">
      <span className="h-px flex-1 bg-(--color-border)" aria-hidden="true" />
      <button
        onClick={cambiar}
        disabled={!stopId}
        aria-label={stopId ? `${ETIQUETA_MODO[modo]}. Cambiar cómo llegas` : undefined}
        className="flex items-center gap-1.5 rounded-full bg-(--color-surface-muted) px-2.5 py-1 text-[11px] font-medium text-(--color-text-muted)"
      >
        <Icono size={12} aria-hidden="true" />
        <span>{formatKm(metros)} aprox.</span>
        {/* Sin duración para tren y avión: la marca el horario del billete.
            El espacio va explícito: en JSX dos elementos pegados no dejan hueco. */}
        {minutos != null && <span className="text-(--color-text)">&nbsp;· {formatearMinutos(minutos)}</span>}
      </button>
      <span className="h-px flex-1 bg-(--color-border)" aria-hidden="true" />
    </div>
  );
}
