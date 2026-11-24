import { ChevronDown, ChevronLeft, House, LayoutDashboard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTripStore } from "../../stores/useTripStore";
import { useUIStore } from "../../stores/useUIStore";

/**
 * La barra azul de arriba en todas las pantallas de un viaje.
 *
 * Volver al inicio estaba escondido en Más → Mis viajes: desde el mapa no
 * había ninguna forma visible de salir del viaje, y Isidro lo echó en falta.
 * Ahora la flecha con la casa está siempre arriba a la izquierda, donde se
 * busca el "atrás"; el nombre del viaje en el centro abre el cambio rápido
 * de viaje y a la derecha está su resumen.
 */
export function BarraViaje() {
  const navigate = useNavigate();
  const nombre = useTripStore((s) => s.trip.name);
  const openModal = useUIStore((s) => s.openModal);

  return (
    <header className="safe-top safe-x relative z-[700] shrink-0 bg-(--color-brand) text-white" style={{ "--safe-x-min": "0.5rem" } as React.CSSProperties}>
      <div className="flex h-13 items-center gap-1">
        <button
          onClick={() => navigate("/viajes")}
          aria-label="Volver al inicio"
          className="flex h-10 shrink-0 items-center gap-0.5 rounded-full pl-1 pr-3 text-sm font-semibold active:bg-white/15"
        >
          <ChevronLeft size={20} aria-hidden="true" />
          <House size={18} aria-hidden="true" />
          <span className="ml-1">Inicio</span>
        </button>

        <button
          onClick={() => openModal({ type: "trip-switcher" })}
          aria-label={`Viaje: ${nombre}. Cambiar de viaje`}
          className="flex min-w-0 flex-1 items-center justify-center gap-1 rounded-full px-2 active:bg-white/15"
        >
          <span className="truncate text-base font-bold">{nombre}</span>
          <ChevronDown size={16} className="shrink-0 opacity-80" aria-hidden="true" />
        </button>

        <button onClick={() => navigate("/viaje")} aria-label="Resumen del viaje" className="flex h-10 w-11 shrink-0 items-center justify-center rounded-full active:bg-white/15">
          <LayoutDashboard size={19} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
