import { ArrowLeft, MapPin, X } from "lucide-react";
import { Vacio } from "../../components/Vacio";
import { useNavigate } from "react-router-dom";
import { useTripStore } from "../../stores/useTripStore";
import type { StopCategory } from "../../types";
import { CategoryThumb } from "../../components/CategoryThumb";
import { formatDateShort } from "../../utils/format";

const ETIQUETAS: Partial<Record<StopCategory, string>> = {
  estadio: "Estadios",
  hotel: "Hoteles",
  ciudad: "Ciudades",
  pueblo: "Pueblos",
  playa: "Playas",
  cultura: "Cultura",
  gastronomia: "Gastronomía",
  naturaleza: "Naturaleza",
  castillo: "Castillos",
  historia: "Historia",
  mirador: "Miradores",
  paisaje: "Paisajes",
  fotografia: "Fotografía",
  aparcamiento: "Aparcamiento",
};

/**
 * Todas las paradas de una categoría, de todo el viaje y con su día.
 *
 * El itinerario normal enseña un día cada vez, así que no vale para responder
 * "¿cuáles son mis 4 estadios?": están repartidos. Las tarjetas del Resumen
 * llevan aquí, que es lo que prometen al decir "4 estadios".
 */
export function FilteredStopList({ categoria }: { categoria: StopCategory }) {
  const trip = useTripStore((s) => s.trip);
  const stopsById = useTripStore((s) => s.stopsById);
  const setCurrentStop = useTripStore((s) => s.setCurrentStop);
  const navigate = useNavigate();

  const encontradas = trip.days.flatMap((dia) =>
    dia.stopIds
      .map((id) => stopsById[id])
      .filter((parada) => parada && parada.category === categoria)
      .map((parada) => ({ parada, dia })),
  );

  const etiqueta = ETIQUETAS[categoria] ?? categoria;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-(--color-bg)">
      <div className="safe-x shrink-0 px-4 pt-4">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/viaje")} aria-label="Volver al resumen del viaje" className="-ml-2 p-2">
            <ArrowLeft size={22} aria-hidden="true" />
          </button>
          <h1 className="text-xl font-bold">{etiqueta}</h1>
        </div>

        <button
          onClick={() => navigate("/itinerario")}
          className="mt-2 flex items-center gap-1.5 rounded-full bg-(--color-navigation)/10 px-3 py-1.5 text-xs font-medium text-(--color-link)"
        >
          {encontradas.length} de {Object.keys(stopsById).length} paradas
          <X size={13} aria-hidden="true" />
        </button>
      </div>

      <div className="safe-x mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-8">
        {encontradas.length === 0 && <Vacio icon={MapPin} titulo="Ninguna parada de esta categoría" />}

        {encontradas.map(({ parada, dia }) => (
          <button
            key={parada.id}
            onClick={() => {
              setCurrentStop(parada.id);
              navigate("/mapa");
            }}
            className="flex w-full items-center gap-3 rounded-(--radius-card) border bg-(--color-surface) p-3 text-left shadow-(--shadow-card)"
            style={{ borderColor: "var(--color-border)" }}
          >
            <CategoryThumb category={parada.category} heroImage={parada.heroImage} className="h-12 w-12 rounded-xl" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-(--color-text)">{parada.name}</span>
              <span className="mt-0.5 block text-xs text-(--color-text-muted)">
                Día {dia.index + 1} · {formatDateShort(dia.date)}
                {parada.visited && " · visitada"}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
